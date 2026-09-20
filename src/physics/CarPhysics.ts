import * as THREE from 'three';
import { SandboxTerrain } from './Terrain';
import { TelemetryData } from '../types';

export interface CarControlInput {
  throttle: number;   // 0 to 1
  brake: number;      // 0 to 1
  steer: number;      // -1 (left) to +1 (right)
  handbrake: boolean;
  boost?: boolean;    // Twin-scroll Turbo boost
  manualGearShift?: number | 'N' | 'R';
}

export class CarPhysics {
  // Vehicle specs: 1992 Subaru Loyale Turbocharged AWD
  public readonly mass = 1120; // kg
  public readonly wheelBase = 2.47; // meters (97.2 inches)
  public readonly trackWidth = 1.56; // meters
  public readonly wheelRadius = 0.31; // meters
  public readonly suspensionRestLength = 0.38; // meters (extended travel)
  public readonly springK = 42000; // N/m spring stiffness
  public readonly damperC = 3600; // Ns/m damping
  public readonly maxSteerAngle = 0.60; // radians (~34.4 deg)

  // High-Output EA82 Turbocharged Boxer-4 Engine specifications
  public readonly idleRpm = 850;
  public readonly redlineRpm = 7200;
  public readonly peakTorqueNm = 380; // High-torque turbocharged
  public readonly boostTorqueNm = 560; // Overboost peak
  public readonly peakTorqueRpm = 3200;
  public readonly finalDrive = 3.90;
  public readonly gearRatios: { [key: string]: number } = {
    R: -3.54,
    N: 0,
    1: 3.82,
    2: 2.25,
    3: 1.52,
    4: 1.08,
    5: 0.80
  };

  // State
  public position = new THREE.Vector3(0, 15, -70); // Starts on Launch Slope!
  public velocity = new THREE.Vector3(0, 0, 0);
  public rotationY = 0; // Heading in radians (0 = facing +Z, downhill)
  public pitch = 0;
  public roll = 0;

  public currentGear: number | 'N' | 'R' = 1;
  public isAutomatic = true;
  public engineRpm = 850;
  public engineTorque = 0;
  public deliveredWheelTorque = 0;

  public steeringAngle = 0;
  public isGrounded = true;

  // Telemetry caching
  public lateralG = 0;
  public longitudinalG = 0;
  public wheelSlip: [number, number, number, number] = [0, 0, 0, 0];
  public suspensionCompression: [number, number, number, number] = [0, 0, 0, 0];

  // Wheel local offsets: [FL, FR, RL, RR] (matching 2.47m wheelbase: +1.24m front, -1.23m rear, axle height 0.31m)
  private wheelOffsets = [
    new THREE.Vector3( 0.78, 0.31,  1.24), // Front Left
    new THREE.Vector3(-0.78, 0.31,  1.24), // Front Right
    new THREE.Vector3( 0.78, 0.31, -1.23), // Rear Left
    new THREE.Vector3(-0.78, 0.31, -1.23), // Rear Right
  ];

  // Undercarriage floorpan & overhang probe points for collision prevention on curved ramps
  private chassisContactPoints = [
    new THREE.Vector3( 0.0, 0.24,  2.05), // Front Bumper Lip
    new THREE.Vector3( 0.0, 0.18,  0.00), // Chassis Center Floorpan
    new THREE.Vector3( 0.0, 0.26, -2.05), // Rear Overhang
  ];

  constructor(spawnX = 0, spawnZ = -68, heading = 0) {
    this.reset(spawnX, spawnZ, heading);
  }

  public reset(x = 0, z = -68, heading = 0) {
    this.position.set(x, SandboxTerrain.getHeight(x, z), z);
    this.velocity.set(0, 0, 0);
    this.rotationY = heading;
    this.pitch = 0;
    this.roll = 0;
    this.engineRpm = this.idleRpm;
    this.currentGear = 1;
    this.steeringAngle = 0;
    this.lateralG = 0;
    this.longitudinalG = 0;
  }

  public update(dt: number, input: CarControlInput): TelemetryData {
    const totalDt = Math.min(dt, 0.05);
    const numSubSteps = 4;
    const subDt = totalDt / numSubSteps;

    let lastAccel = new THREE.Vector3(0, 0, 0);
    let lastForward = new THREE.Vector3(0, 0, 1);
    let lastRight = new THREE.Vector3(1, 0, 0);

    for (let step = 0; step < numSubSteps; step++) {
      // 1. Steering with speed sensitivity
      const speed = this.velocity.length();
      const speedKmh = speed * 3.6;
      const steerSpeedScale = Math.max(0.32, 1 - (speedKmh / 140) * 0.68);
      const targetSteer = input.steer * this.maxSteerAngle * steerSpeedScale;
      this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, targetSteer, subDt * 14);

      // Orientation Quaternions (accounting for heading, pitch, and roll)
      // Note: euler.x is -this.pitch so that positive pitch lifts the front tires UP
      const carEuler = new THREE.Euler(-this.pitch, this.rotationY, this.roll, 'YXZ');
      const carQuat = new THREE.Quaternion().setFromEuler(carEuler);
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(carQuat);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(carQuat);
      lastForward = forward;
      lastRight = right;

      // 2. Wheel Ground Contacts & Ground Penetration Detection
      let groundedCount = 0;
      const wheelHeights: number[] = [];
      let avgNormal = new THREE.Vector3(0, 1, 0);
      let maxPenetration = 0;

      for (let idx = 0; idx < 4; idx++) {
        const offset = this.wheelOffsets[idx];
        const worldWheel = offset.clone().applyQuaternion(carQuat).add(this.position);
        const groundH = SandboxTerrain.getHeight(worldWheel.x, worldWheel.z);
        const groundNorm = SandboxTerrain.getNormal(worldWheel.x, worldWheel.z);
        wheelHeights.push(groundH);

        // Distance from ground to wheel hub center
        const wheelHubDist = worldWheel.y - groundH;
        const wheelBottomY = worldWheel.y - this.wheelRadius;
        const penetration = groundH - wheelBottomY;
        if (penetration > maxPenetration) {
          maxPenetration = penetration;
        }

        const comp = Math.max(0, Math.min(1, (this.suspensionRestLength - (wheelHubDist - this.wheelRadius)) / this.suspensionRestLength));
        this.suspensionCompression[idx] = comp;

        if (wheelHubDist <= this.wheelRadius + this.suspensionRestLength * 0.6) {
          groundedCount++;
          avgNormal.add(groundNorm);
        }
      }

      // Undercarriage probe checks to prevent the body from sinking through ramp curves
      for (let c = 0; c < this.chassisContactPoints.length; c++) {
        const worldPt = this.chassisContactPoints[c].clone().applyQuaternion(carQuat).add(this.position);
        const ptGroundH = SandboxTerrain.getHeight(worldPt.x, worldPt.z);
        const ptPen = ptGroundH - worldPt.y;
        if (ptPen > maxPenetration) {
          maxPenetration = ptPen;
        }
      }

      this.isGrounded = groundedCount >= 2;
      if (groundedCount > 0) {
        avgNormal.normalize();
      } else {
        avgNormal.set(0, 1, 0);
      }

      // --- HARD GROUND PENETRATION RESOLUTION ---
      // If any part of the car has penetrated the terrain/ramp, immediately project it out
      // and eliminate penetrating velocity.
      if (maxPenetration > 0) {
        this.position.y += maxPenetration;
        const vDotN = this.velocity.dot(avgNormal);
        if (vDotN < 0) {
          this.velocity.sub(avgNormal.clone().multiplyScalar(vDotN));
        }
        if (this.velocity.y < 0) {
          this.velocity.y = 0;
        }
      }

      // 3. Kinetic Forces
      const gravity = new THREE.Vector3(0, -9.81, 0);
      let totalForce = gravity.clone().multiplyScalar(this.mass);

      // Normal force & slope physics
      if (this.isGrounded) {
        const normalMagnitude = -totalForce.dot(avgNormal);
        if (normalMagnitude > 0) {
          const normalForce = avgNormal.clone().multiplyScalar(normalMagnitude);
          totalForce.add(normalForce); // Cancels penetrating gravity, leaving tangential slope force!
        }

        // Suspension restorative spring-damper
        const avgGroundH = (wheelHeights[0] + wheelHeights[1] + wheelHeights[2] + wheelHeights[3]) / 4;
        const targetY = avgGroundH;
        const dy = targetY - this.position.y;
        const suspForceY = dy * 45000 - this.velocity.y * 5500;
        totalForce.y += suspForceY;
      }

      // 4. Engine Torque & Transmission
      const forwardSpeed = this.velocity.dot(forward);

      if (this.isAutomatic) {
        if (input.throttle > 0.05 && forwardSpeed < -1.5 && this.currentGear === 'R') {
          // Stay in reverse
        } else if (input.brake > 0.1 && forwardSpeed < 0.2 && input.throttle === 0) {
          this.currentGear = 'R';
        } else if (forwardSpeed >= -0.5) {
          if (speedKmh < 36) this.currentGear = 1;
          else if (speedKmh < 75) this.currentGear = 2;
          else if (speedKmh < 125) this.currentGear = 3;
          else if (speedKmh < 175) this.currentGear = 4;
          else this.currentGear = 5;
        }
      } else if (input.manualGearShift !== undefined) {
        this.currentGear = input.manualGearShift;
      }

      // Engine RPM calculation
      const gearRatio = this.gearRatios[this.currentGear] || 0;
      if (this.currentGear === 'N' || !this.isGrounded) {
        const targetRpm = this.idleRpm + input.throttle * (this.redlineRpm - this.idleRpm);
        this.engineRpm = THREE.MathUtils.lerp(this.engineRpm, targetRpm, subDt * 6);
      } else {
        const wheelRpm = (Math.abs(forwardSpeed) / (2 * Math.PI * this.wheelRadius)) * 60;
        const calculatedRpm = wheelRpm * Math.abs(gearRatio) * this.finalDrive;
        const targetRpm = Math.max(this.idleRpm, Math.min(this.redlineRpm, calculatedRpm));
        this.engineRpm = THREE.MathUtils.lerp(this.engineRpm, targetRpm, subDt * 12);
      }

      // Engine Torque curve (Subaru Boxer Turbo EA82)
      const rpmNorm = (this.engineRpm - this.peakTorqueRpm) / 3200;
      const torqueFactor = Math.max(0.25, 1 - 0.45 * rpmNorm * rpmNorm);
      const activePeakTorque = input.boost ? this.boostTorqueNm : this.peakTorqueNm;
      this.engineTorque = activePeakTorque * torqueFactor * input.throttle;

      // Delivered wheel tractive force
      if (this.isGrounded && this.currentGear !== 'N') {
        const gearSign = this.currentGear === 'R' ? -1 : 1;
        const totalRatio = Math.abs(gearRatio) * this.finalDrive * 0.92;
        this.deliveredWheelTorque = this.engineTorque * totalRatio * gearSign;
        const tractiveForce = (this.deliveredWheelTorque / this.wheelRadius);
        totalForce.add(forward.clone().multiplyScalar(tractiveForce));

        // Turbo Boost overboost surge
        if (input.boost && input.throttle > 0.1) {
          totalForce.add(forward.clone().multiplyScalar(this.mass * 12.0));
        }
      } else {
        this.deliveredWheelTorque = 0;
      }

      // Dynamic Aerodynamic Hangtime & Air Glide when launching off jumps
      if (!this.isGrounded) {
        // High-speed aerodynamic lift: lifts car gracefully during big jumps
        const liftFactor = Math.min(0.48, (speed / 45) * 0.44);
        const liftForce = new THREE.Vector3(0, this.mass * 9.81 * liftFactor, 0);
        totalForce.add(liftForce);

        // Boost while airborne produces forward rocket thrust for extended jumps
        if (input.boost) {
          totalForce.add(forward.clone().multiplyScalar(this.mass * 9.5));
        }
      }

      // 5. Braking and Rolling Resistance
      if (this.isGrounded) {
        const rollFrictionMag = 0.015 * this.mass * 9.81;
        if (speed > 0.01) {
          const rollDir = this.velocity.clone().normalize().negate();
          totalForce.add(rollDir.multiplyScalar(rollFrictionMag));
        }

        if (input.brake > 0.01) {
          const maxBrakeForce = 6500 * input.brake;
          const brakeDir = forward.clone().multiplyScalar(-Math.sign(forwardSpeed || 1));
          totalForce.add(brakeDir.multiplyScalar(maxBrakeForce));
        }

        if (input.handbrake) {
          const handbrakeForce = 4800;
          const brakeDir = forward.clone().multiplyScalar(-Math.sign(forwardSpeed || 1));
          totalForce.add(brakeDir.multiplyScalar(handbrakeForce));
        }
      }

      // Aerodynamic Drag
      const airDragMag = 0.5 * 1.225 * 0.36 * 2.0 * speed * speed;
      if (speed > 0.1) {
        totalForce.add(this.velocity.clone().normalize().multiplyScalar(-airDragMag));
      }

      // 6. Integrate Acceleration & Velocity
      const acceleration = totalForce.divideScalar(this.mass);
      lastAccel = acceleration.clone();
      this.velocity.add(acceleration.multiplyScalar(subDt));

      // Lateral Grip & Drift Simulation
      if (this.isGrounded) {
        const lateralVel = this.velocity.dot(right);
        const gripCoeff = input.handbrake ? 0.32 : 0.88;
        const lateralDamping = Math.min(1, gripCoeff * 16 * subDt);
        this.velocity.sub(right.clone().multiplyScalar(lateralVel * lateralDamping));

        const slipAmount = Math.min(1, Math.abs(lateralVel) / (speed + 2));
        this.wheelSlip[0] = slipAmount * (input.throttle > 0.8 ? 0.8 : 0.3);
        this.wheelSlip[1] = slipAmount * (input.throttle > 0.8 ? 0.8 : 0.3);
        this.wheelSlip[2] = input.handbrake ? 0.95 : slipAmount * 0.4;
        this.wheelSlip[3] = input.handbrake ? 0.95 : slipAmount * 0.4;

        const turnRate = (forwardSpeed / this.wheelBase) * Math.sin(this.steeringAngle);
        this.rotationY += turnRate * subDt;
      }

      // Update position
      this.position.add(this.velocity.clone().multiplyScalar(subDt));

      // Post-integration ground clamp to prevent any tunneling at high velocity
      if (this.isGrounded) {
        const currentGroundH = SandboxTerrain.getHeight(this.position.x, this.position.z);
        const minChassisY = currentGroundH;
        if (this.position.y < minChassisY) {
          this.position.y = minChassisY;
          if (this.velocity.y < 0) this.velocity.y = 0;
        }
      }

      // 7. Dynamic Pitch & Roll
      // Front wheels at +Z = 1.28, rear wheels at -Z = -1.28
      const frontH = (wheelHeights[0] + wheelHeights[1]) / 2;
      const rearH = (wheelHeights[2] + wheelHeights[3]) / 2;
      // When going uphill (frontH > rearH), slopePitch is POSITIVE (nose up)
      const slopePitch = Math.atan2(frontH - rearH, this.wheelBase);

      // Pitch squat under forward acceleration (lifts nose) and dive under braking (drops nose)
      const accelLong = lastAccel.dot(forward);
      const pitchInertia = (accelLong / 9.81) * 0.045; // Positive lifts nose, negative dives nose
      const targetPitch = this.isGrounded ? (slopePitch + pitchInertia) : 0;

      // Roll calculation
      const leftH = (wheelHeights[0] + wheelHeights[2]) / 2;
      const rightH = (wheelHeights[1] + wheelHeights[3]) / 2;
      const slopeRoll = Math.atan2(leftH - rightH, this.trackWidth);

      const accelLat = lastAccel.dot(right);
      const rollInertia = (accelLat / 9.81) * 0.04;
      const targetRoll = this.isGrounded ? (slopeRoll + rollInertia) : 0;

      const levelRate = this.isGrounded ? 14 : 3.8;
      this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, subDt * levelRate);
      this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, subDt * levelRate);
    }

    // G-Forces calculation for dashboard telemetry
    this.longitudinalG = lastAccel.dot(lastForward) / 9.81;
    this.lateralG = lastAccel.dot(lastRight) / 9.81;

    // Metric Horsepower
    const hp = Math.max(0, (this.engineTorque * this.engineRpm) / 7127);
    const forwardSpeed = this.velocity.dot(lastForward);

    return {
      speedKmh: Math.abs(forwardSpeed) * 3.6,
      speedMph: Math.abs(forwardSpeed) * 2.237,
      engineRpm: Math.round(this.engineRpm),
      engineTorqueNm: Math.round(this.engineTorque),
      horsepower: Math.round(hp),
      gear: this.currentGear,
      throttle: input.throttle,
      brake: input.brake,
      handbrake: input.handbrake,
      steeringAngleDeg: THREE.MathUtils.radToDeg(this.steeringAngle),
      lateralG: Number(this.lateralG.toFixed(2)),
      longitudinalG: Number(this.longitudinalG.toFixed(2)),
      pitchDeg: Number(THREE.MathUtils.radToDeg(this.pitch).toFixed(1)),
      rollDeg: Number(THREE.MathUtils.radToDeg(this.roll).toFixed(1)),
      altitudeM: Number(this.position.y.toFixed(2)),
      wheelSlip: [...this.wheelSlip],
      suspensionCompression: [...this.suspensionCompression],
      isGrounded: this.isGrounded
    };
  }
}
