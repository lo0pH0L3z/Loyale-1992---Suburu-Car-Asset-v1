export type CameraViewMode = 'chase' | 'orbit' | 'cockpit' | 'engine' | 'hood' | 'wheel' | 'drone';

export interface TelemetryData {
  speedKmh: number;
  speedMph: number;
  engineRpm: number;
  engineTorqueNm: number;
  horsepower: number;
  gear: number | 'R' | 'N';
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  handbrake: boolean;
  steeringAngleDeg: number;
  lateralG: number;
  longitudinalG: number;
  pitchDeg: number;
  rollDeg: number;
  altitudeM: number;
  wheelSlip: [number, number, number, number]; // FL, FR, RL, RR (0 to 1)
  suspensionCompression: [number, number, number, number]; // FL, FR, RL, RR (0 to 1)
  isGrounded: boolean;
}

export interface SandboxPreset {
  id: string;
  name: string;
  description: string;
  carSpawn: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
  };
}

export interface CarDoorState {
  frontLeft: boolean;
  frontRight: boolean;
  rearLeft: boolean;
  rearRight: boolean;
  hood: boolean;
  trunk: boolean;
}
