import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SubaruLoyaleModel } from './SubaruLoyaleModel';
import { SandboxTerrain } from '../physics/Terrain';
import { CarPhysics, CarControlInput } from '../physics/CarPhysics';
import { CameraViewMode, CarDoorState, TelemetryData } from '../types';

interface SandboxSceneProps {
  cameraMode: CameraViewMode;
  cameraFov: number;
  doorState: CarDoorState;
  headlightsOn: boolean;
  environmentTime: 'day' | 'sunset' | 'studio';
  onTelemetryUpdate: (data: TelemetryData) => void;
  externalInput: CarControlInput;
  resetTrigger: { key: string; timestamp: number } | null;
  onDoorToggle?: (door: keyof CarDoorState) => void;
}

export const SandboxScene: React.FC<SandboxSceneProps> = ({
  cameraMode,
  cameraFov,
  doorState,
  headlightsOn,
  environmentTime,
  onTelemetryUpdate,
  externalInput,
  resetTrigger,
  onDoorToggle
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // References to engine objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const carModelRef = useRef<SubaruLoyaleModel | null>(null);
  const carPhysicsRef = useRef<CarPhysics | null>(null);

  // Orbit camera drag state
  const orbitStateRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    theta: 0.8, // Azimuth angle
    phi: 0.45,  // Elevation angle
    radius: 6.5
  });

  // Lights refs for environment changes
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Tire dust particles system
  const dustParticlesRef = useRef<{
    mesh: THREE.InstancedMesh;
    data: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number; scale: number }[];
  } | null>(null);

  // Keyboard input state
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Fresh references to prevent stale closures in the animation loop
  const cameraModeRef = useRef<CameraViewMode>(cameraMode);
  const externalInputRef = useRef<CarControlInput>(externalInput);
  const headlightsOnRef = useRef<boolean>(headlightsOn);
  const onTelemetryUpdateRef = useRef<(data: TelemetryData) => void>(onTelemetryUpdate);

  // Sync refs and manage seamless camera mode transitions
  useEffect(() => {
    const prevMode = cameraModeRef.current;
    cameraModeRef.current = cameraMode;

    if (cameraRef.current && carPhysicsRef.current) {
      const cam = cameraRef.current;
      const phys = carPhysicsRef.current;
      const carPos = phys.position;

      // When switching into orbit mode, initialize orbit angles from current camera position
      if (cameraMode === 'orbit') {
        const dx = cam.position.x - carPos.x;
        const dy = cam.position.y - (carPos.y + 0.7);
        const dz = cam.position.z - carPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        orbitStateRef.current.radius = THREE.MathUtils.clamp(dist, 3.2, 16);
        orbitStateRef.current.theta = Math.atan2(dx, dz);
        orbitStateRef.current.phi = Math.acos(THREE.MathUtils.clamp(dy / Math.max(dist, 0.1), 0.08, 0.95));
      } else if (cameraMode === 'chase' && (prevMode === 'drone' || prevMode === 'cockpit' || prevMode === 'orbit')) {
        // Fast snap behind the car so it doesn't spend seconds lerping across the sky
        const headingQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), phys.rotationY);
        const behindVec = new THREE.Vector3(0, 1.85, -5.2).applyQuaternion(headingQuat);
        const desiredPos = carPos.clone().add(behindVec);
        cam.position.copy(desiredPos);
        cam.lookAt(carPos.clone().add(new THREE.Vector3(0, 0.7, 0)));
      }
    }
  }, [cameraMode]);

  useEffect(() => {
    externalInputRef.current = externalInput;
  }, [externalInput]);

  useEffect(() => {
    headlightsOnRef.current = headlightsOn;
  }, [headlightsOn]);

  useEffect(() => {
    onTelemetryUpdateRef.current = onTelemetryUpdate;
  }, [onTelemetryUpdate]);

  // 1. Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      cameraFov,
      container.clientWidth / container.clientHeight,
      0.1,
      600
    );
    camera.position.set(0, 5, -80);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.5);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfffdf0, 1.4);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 180;
    const shadowDist = 45;
    sunLight.shadow.camera.left = -shadowDist;
    sunLight.shadow.camera.right = shadowDist;
    sunLight.shadow.camera.top = shadowDist;
    sunLight.shadow.camera.bottom = -shadowDist;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Create Subaru Loyale Car Model
    const carModel = new SubaruLoyaleModel();
    scene.add(carModel.group);
    carModelRef.current = carModel;

    // Add Terrain to scene
    const terrainMesh = SandboxTerrain.createTerrainMesh(carModel.textures);
    scene.add(terrainMesh);

    // Initialize Physics engine (Spawn on Launch Hill Slope: z = -68, facing downhill +Z)
    const carPhysics = new CarPhysics(0, -68, 0);
    carPhysicsRef.current = carPhysics;

    // Setup Tire Dust Particle System
    const dustCount = 80;
    const dustGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const dustMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.9,
      transparent: true,
      opacity: 0.4
    });
    const dustInstanced = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
    dustInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(dustInstanced);

    const dustData = Array.from({ length: dustCount }, () => ({
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(0, 0, 0),
      life: 0,
      maxLife: 1.0,
      scale: 0.1
    }));
    dustParticlesRef.current = { mesh: dustInstanced, data: dustData };

    // Mouse Drag for Orbit camera
    const handleMouseDown = (e: MouseEvent) => {
      orbitStateRef.current.isDragging = true;
      orbitStateRef.current.prevX = e.clientX;
      orbitStateRef.current.prevY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!orbitStateRef.current.isDragging) return;
      const dx = e.clientX - orbitStateRef.current.prevX;
      const dy = e.clientY - orbitStateRef.current.prevY;
      orbitStateRef.current.prevX = e.clientX;
      orbitStateRef.current.prevY = e.clientY;

      orbitStateRef.current.theta -= dx * 0.008;
      orbitStateRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI * 0.46, orbitStateRef.current.phi + dy * 0.008)
      );
    };

    const handleMouseUp = () => {
      orbitStateRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      orbitStateRef.current.radius = Math.max(
        2.5,
        Math.min(22, orbitStateRef.current.radius + e.deltaY * 0.008)
      );
    };

    const domElem = renderer.domElement;

    // Touch controls for Orbit Camera on mobile/trackpads
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        orbitStateRef.current.isDragging = true;
        orbitStateRef.current.prevX = e.touches[0].clientX;
        orbitStateRef.current.prevY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!orbitStateRef.current.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - orbitStateRef.current.prevX;
      const dy = e.touches[0].clientY - orbitStateRef.current.prevY;
      orbitStateRef.current.prevX = e.touches[0].clientX;
      orbitStateRef.current.prevY = e.touches[0].clientY;

      orbitStateRef.current.theta -= dx * 0.008;
      orbitStateRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI * 0.46, orbitStateRef.current.phi + dy * 0.008)
      );
    };

    const handleTouchEnd = () => {
      orbitStateRef.current.isDragging = false;
    };

    domElem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domElem.addEventListener('wheel', handleWheel, { passive: true });
    domElem.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ResizeObserver for canvas container
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Main Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let dustSpawnIndex = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.06);
      lastTime = now;

      // 1. Gather Keyboard Inputs
      const keys = keysRef.current;
      let throttle = 0;
      let brake = 0;
      let steer = 0;
      let handbrake = false;

      if (keys['KeyW'] || keys['ArrowUp']) throttle = 1;
      if (keys['KeyS'] || keys['ArrowDown']) brake = 1;
      if (keys['KeyA'] || keys['ArrowLeft']) steer = -1;
      if (keys['KeyD'] || keys['ArrowRight']) steer = 1;
      if (keys['Space']) handbrake = true;

      // Combine with on-screen / external touch inputs
      const ext = externalInputRef.current;
      if (ext.throttle > 0) throttle = Math.max(throttle, ext.throttle);
      if (ext.brake > 0) brake = Math.max(brake, ext.brake);
      if (Math.abs(ext.steer) > 0) steer = ext.steer;
      if (ext.handbrake) handbrake = true;

      const currentInput: CarControlInput = {
        throttle,
        brake,
        steer,
        handbrake,
        manualGearShift: ext.manualGearShift
      };

      // 2. Physics Simulation Step
      const telemetry = carPhysics.update(dt, currentInput);
      onTelemetryUpdateRef.current(telemetry);

      // 3. Update 3D Car Model Position & Orientation
      const carGroup = carModel.group;
      carGroup.position.copy(carPhysics.position);

      // Combine Yaw (heading), Pitch (slope incline), and Roll (cornering tilt)
      // Negative pitch in Euler X tilts +Z (front nose and front wheels) UPwards when climbing
      const euler = new THREE.Euler(-carPhysics.pitch, carPhysics.rotationY, carPhysics.roll, 'YXZ');
      carGroup.quaternion.setFromEuler(euler);

      // Steer front wheels & wheel spinning
      carModel.setSteering(carPhysics.steeringAngle);
      const forwardSpeed = carPhysics.velocity.length();
      const wheelRadPerSec = (forwardSpeed / carPhysics.wheelRadius) * Math.sign(carPhysics.velocity.dot(new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, carPhysics.rotationY, 0))));
      carModel.setWheelSpeed(wheelRadPerSec);

      // Brake lights
      carModel.setBrakeLights(brake > 0.05 || handbrake);

      // Update in-car live working dashboard display & taillight blinkers
      carModel.updateDashboard(telemetry, headlightsOnRef.current, steer, dt);

      // Update model animations (doors, lights)
      carModel.update(dt);

      // Update Sun Light target to follow car so shadow map is sharp
      if (sunLightRef.current) {
        sunLightRef.current.position.set(
          carPhysics.position.x + 35,
          carPhysics.position.y + 50,
          carPhysics.position.z + 25
        );
        sunLightRef.current.target.position.copy(carPhysics.position);
        sunLightRef.current.target.updateMatrixWorld();
      }

      // 4. Update Tire Dust Particles
      if (dustParticlesRef.current) {
        const { mesh, data } = dustParticlesRef.current;
        const isSlipping = telemetry.wheelSlip[0] > 0.4 || telemetry.wheelSlip[2] > 0.4;
        const isFastOnGround = telemetry.isGrounded && forwardSpeed > 4;

        if ((isSlipping || isFastOnGround) && Math.random() < 0.6) {
          // Emit from rear wheels
          const headingQuat = carGroup.quaternion;
          const leftRear = new THREE.Vector3(0.78, 0.1, -1.28).applyQuaternion(headingQuat).add(carPhysics.position);
          const rightRear = new THREE.Vector3(-0.78, 0.1, -1.28).applyQuaternion(headingQuat).add(carPhysics.position);

          const spawnPos = Math.random() > 0.5 ? leftRear : rightRear;
          const p = data[dustSpawnIndex % data.length];
          p.pos.copy(spawnPos);
          p.vel.set(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 1.8 + 0.5,
            (Math.random() - 0.5) * 1.5
          );
          p.life = 0;
          p.maxLife = 0.8 + Math.random() * 0.4;
          p.scale = 0.4 + Math.random() * 0.6;
          dustSpawnIndex++;
        }

        const dummy = new THREE.Object3D();
        data.forEach((p, idx) => {
          if (p.life < p.maxLife) {
            p.life += dt;
            p.pos.addScaledVector(p.vel, dt);
            const progress = p.life / p.maxLife;
            const currentScale = p.scale * (1 + progress * 2.5) * (1 - progress);
            dummy.position.copy(p.pos);
            dummy.scale.set(currentScale, currentScale, currentScale);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);
          } else {
            dummy.position.set(0, -200, 0);
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);
          }
        });
        mesh.instanceMatrix.needsUpdate = true;
      }

      // 5. Update Camera according to Mode
      updateCameraPosition(
        camera,
        carPhysics,
        carGroup,
        cameraModeRef.current,
        dt,
        orbitStateRef.current
      );

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      domElem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domElem.removeEventListener('wheel', handleWheel);
      domElem.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update FOV dynamically
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = cameraFov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [cameraFov]);

  // Update Doors dynamically
  useEffect(() => {
    if (!carModelRef.current) return;
    const model = carModelRef.current;
    (Object.keys(doorState) as (keyof CarDoorState)[]).forEach((door) => {
      model.setDoorProgress(door, doorState[door] ? 1 : 0);
    });
  }, [doorState]);

  // Auto-open hood when entering engine inspection view mode
  useEffect(() => {
    if (cameraMode === 'engine' && !doorState.hood && onDoorToggle) {
      onDoorToggle('hood');
    }
  }, [cameraMode, doorState.hood, onDoorToggle]);

  // Update Headlights
  useEffect(() => {
    if (carModelRef.current) {
      carModelRef.current.setHeadlights(headlightsOn);
    }
  }, [headlightsOn]);

  // Update Environment / Sky lighting
  useEffect(() => {
    if (!sceneRef.current || !sunLightRef.current || !ambientLightRef.current || !rendererRef.current)
      return;

    const scene = sceneRef.current;
    const sun = sunLightRef.current;
    const amb = ambientLightRef.current;

    if (environmentTime === 'day') {
      scene.background = new THREE.Color(0xdbeafe);
      scene.fog = new THREE.FogExp2(0xdbeafe, 0.0035);
      sun.color.setHex(0xfffef0);
      sun.intensity = 1.4;
      sun.position.set(40, 60, 30);
      amb.color.setHex(0xffffff);
      amb.intensity = 0.65;
    } else if (environmentTime === 'sunset') {
      scene.background = new THREE.Color(0xfdba74);
      scene.fog = new THREE.FogExp2(0xfdba74, 0.005);
      sun.color.setHex(0xf97316);
      sun.intensity = 1.8;
      sun.position.set(80, 20, -40);
      amb.color.setHex(0xfef08a);
      amb.intensity = 0.45;
    } else {
      // Studio
      scene.background = new THREE.Color(0x0f172a);
      scene.fog = new THREE.FogExp2(0x0f172a, 0.006);
      sun.color.setHex(0x38bdf8);
      sun.intensity = 1.2;
      sun.position.set(0, 40, 0);
      amb.color.setHex(0xe2e8f0);
      amb.intensity = 0.75;
    }
  }, [environmentTime]);

  // Handle Preset Spawn Resets
  useEffect(() => {
    if (!resetTrigger || !carPhysicsRef.current) return;
    const phys = carPhysicsRef.current;

    switch (resetTrigger.key) {
      case 'slope': // Starts atop Launch Slope facing downhill!
        phys.reset(0, -68, 0);
        break;
      case 'flat': // Main asphalt skid pad
        phys.reset(0, 0, 0);
        break;
      case 'ramp': // Just before jump ramp
        phys.reset(0, 22, 0);
        break;
      case 'banked': // In banked curve
        phys.reset(40, 85, Math.PI * 0.4);
        break;
      default:
        phys.reset(0, -68, 0);
    }
  }, [resetTrigger]);

  return (
    <div
      ref={containerRef}
      id="three-sandbox-container"
      className={`absolute inset-0 w-full h-full overflow-hidden ${
        cameraMode === 'orbit' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    />
  );
};

// Helper: Camera position updates based on mode
function updateCameraPosition(
  camera: THREE.PerspectiveCamera,
  phys: CarPhysics,
  carGroup: THREE.Group,
  mode: CameraViewMode,
  dt: number,
  orbit: { theta: number; phi: number; radius: number }
) {
  const carPos = phys.position.clone();
  const headingQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), phys.rotationY);

  if (mode === 'chase') {
    // Dynamic Third-Person Chase Camera
    const speed = phys.velocity.length();
    const dynamicDist = 5.2 + Math.min(speed * 0.12, 3.5);
    const dynamicHeight = 1.85 + Math.min(speed * 0.04, 0.8);

    // Target position behind car
    const behindVec = new THREE.Vector3(0, dynamicHeight, -dynamicDist).applyQuaternion(headingQuat);
    const desiredPos = carPos.clone().add(behindVec);

    // Keep camera above terrain
    const terrainH = SandboxTerrain.getHeight(desiredPos.x, desiredPos.z);
    desiredPos.y = Math.max(desiredPos.y, terrainH + 0.8);

    // Smooth camera damping
    camera.position.lerp(desiredPos, Math.min(dt * 7, 1));
    const lookTarget = carPos.clone().add(new THREE.Vector3(0, 0.7, 0));
    camera.lookAt(lookTarget);
  } else if (mode === 'orbit') {
    // 360° Free Inspect Camera
    const cx = carPos.x;
    const cy = carPos.y + 0.7;
    const cz = carPos.z;
    const x = cx + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    const y = cy + orbit.radius * Math.cos(orbit.phi);
    const z = cz + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);

    const terrainH = SandboxTerrain.getHeight(x, z);
    const clampedY = Math.max(y, terrainH + 0.35);

    camera.position.set(x, clampedY, z);
    camera.lookAt(cx, cy, cz);
  } else if (mode === 'cockpit') {
    // Driver First-Person Perspective: Placed at driver eye level looking through windshield
    // In-car driver eye: X = 0.38 (driver side), Y = 1.08 (eye line), Z = -0.06 (forward of headrest)
    const cockpitOffset = new THREE.Vector3(0.38, 1.08, -0.06).applyQuaternion(carGroup.quaternion);
    camera.position.copy(carPos).add(cockpitOffset);

    // Look forward through windshield with slight down-angle framing the working instrument cluster and hood
    const lookOffset = new THREE.Vector3(0.38, 0.98, 6.0).applyQuaternion(carGroup.quaternion);
    camera.lookAt(carPos.clone().add(lookOffset));
  } else if (mode === 'hood') {
    // Front Bumper / Wedge Hood Cam
    // Mounted atop the hood scoop looking ahead across the front nose
    const hoodOffset = new THREE.Vector3(0, 0.90, 1.35).applyQuaternion(carGroup.quaternion);
    camera.position.copy(carPos).add(hoodOffset);

    const lookOffset = new THREE.Vector3(0, 0.75, 12).applyQuaternion(carGroup.quaternion);
    camera.lookAt(carPos.clone().add(lookOffset));
  } else if (mode === 'wheel') {
    // Front-Left Turbine Wheel Cam
    // Positioned low just outside the front-left fender, angled back-and-in to show the spinning turbine hubcap and steering
    const wheelCamOffset = new THREE.Vector3(1.35, 0.48, 1.85).applyQuaternion(carGroup.quaternion);
    camera.position.copy(carPos).add(wheelCamOffset);

    const lookTarget = new THREE.Vector3(0.78, 0.31, 1.24).applyQuaternion(carGroup.quaternion).add(carPos);
    camera.lookAt(lookTarget);
  } else if (mode === 'engine') {
    // Engine Bay Close-up Inspection View
    // Positioned in front of the car looking down into the hollow engine bay
    const engineCamOffset = new THREE.Vector3(0.12, 1.45, 2.70).applyQuaternion(carGroup.quaternion);
    camera.position.copy(carPos).add(engineCamOffset);

    const lookTarget = new THREE.Vector3(0, 0.52, 1.34).applyQuaternion(carGroup.quaternion).add(carPos);
    camera.lookAt(lookTarget);
  } else if (mode === 'drone') {
    // High-altitude aerial chase view smoothly tracking the car
    const droneOffset = new THREE.Vector3(0, 24, -20).applyQuaternion(headingQuat);
    const dronePos = carPos.clone().add(droneOffset);
    camera.position.lerp(dronePos, Math.min(dt * 4, 1));
    camera.lookAt(carPos.x, carPos.y + 0.6, carPos.z);
  }
}
