import React, { useState, useEffect, useCallback } from 'react';
import { SandboxScene } from './components/SandboxScene';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { CameraControls } from './components/CameraControls';
import { CarInspectorControls } from './components/CarInspectorControls';
import { TopStatusBar } from './components/TopStatusBar';
import { ControlsGuideModal } from './components/ControlsGuideModal';
import { OnScreenControls } from './components/OnScreenControls';
import { CameraViewMode, CarDoorState, TelemetryData } from './types';
import { CarControlInput } from './physics/CarPhysics';
import { ChevronRight, ChevronLeft, Eye, SlidersHorizontal, Gauge } from 'lucide-react';

export default function App() {
  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speedKmh: 0,
    speedMph: 0,
    engineRpm: 850,
    engineTorqueNm: 0,
    horsepower: 0,
    gear: 1,
    throttle: 0,
    brake: 0,
    handbrake: false,
    steeringAngleDeg: 0,
    lateralG: 0,
    longitudinalG: 0,
    pitchDeg: -15, // Starts on slope
    rollDeg: 0,
    altitudeM: 14.8,
    wheelSlip: [0, 0, 0, 0],
    suspensionCompression: [0.3, 0.3, 0.3, 0.3],
    isGrounded: true
  });

  // Camera settings
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [cameraFov, setCameraFov] = useState<number>(50);

  // Vehicle doors & lights
  const [doorState, setDoorState] = useState<CarDoorState>({
    frontLeft: false,
    frontRight: false,
    rearLeft: false,
    rearRight: false,
    hood: false,
    trunk: false
  });
  const [headlightsOn, setHeadlightsOn] = useState<boolean>(false);
  const [environmentTime, setEnvironmentTime] = useState<'day' | 'sunset' | 'studio'>('day');

  // Driving input state
  const [externalInput, setExternalInput] = useState<CarControlInput>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false
  });

  // Reset trigger
  const [resetTrigger, setResetTrigger] = useState<{ key: string; timestamp: number } | null>({
    key: 'slope',
    timestamp: Date.now()
  });

  // UI Panel visibilities
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [rightPanelTab, setRightPanelTab] = useState<'camera' | 'inspector'>('camera');
  const [showDashboard, setShowDashboard] = useState<boolean>(true);

  // Auto-hide 2D overlay when entering first-person cockpit view to highlight in-car working dashboard
  useEffect(() => {
    if (cameraMode === 'cockpit') {
      setShowDashboard(false);
    }
  }, [cameraMode]);

  // Door toggle handlers
  const handleToggleDoor = useCallback((doorKey: keyof CarDoorState) => {
    setDoorState((prev) => ({
      ...prev,
      [doorKey]: !prev[doorKey]
    }));
  }, []);

  const allDoorsOpen = Object.values(doorState).every(Boolean);

  const handleToggleAllDoors = useCallback(() => {
    const nextState = !allDoorsOpen;
    setDoorState({
      frontLeft: nextState,
      frontRight: nextState,
      rearLeft: nextState,
      rearRight: nextState,
      hood: nextState,
      trunk: nextState
    });
  }, [allDoorsOpen]);

  const handleResetPosition = useCallback((presetKey: 'slope' | 'flat' | 'ramp' | 'banked') => {
    setResetTrigger({ key: presetKey, timestamp: Date.now() });
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      // Camera cycle ('c' or 'v')
      if (key === 'c' || key === 'v') {
        const modes: CameraViewMode[] = ['chase', 'orbit', 'engine', 'cockpit', 'hood', 'wheel', 'drone'];
        setCameraMode((prev) => {
          const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
          return modes[nextIdx];
        });
      }

      // Headlights
      if (key === 'l') {
        setHeadlightsOn((prev) => !prev);
      }

      // Reset to slope
      if (key === 'r') {
        handleResetPosition('slope');
      }

      // Door shortcuts
      if (key === '1') handleToggleDoor('frontLeft');
      if (key === '2') handleToggleDoor('frontRight');
      if (key === '3') handleToggleDoor('rearLeft');
      if (key === '4') handleToggleDoor('rearRight');
      if (key === 'h') handleToggleDoor('hood');
      if (key === 't') handleToggleDoor('trunk');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleDoor, handleResetPosition]);

  return (
    <div id="subaru-loyale-app" className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Layer */}
      <SandboxScene
        cameraMode={cameraMode}
        cameraFov={cameraFov}
        doorState={doorState}
        headlightsOn={headlightsOn}
        environmentTime={environmentTime}
        onTelemetryUpdate={setTelemetry}
        externalInput={externalInput}
        resetTrigger={resetTrigger}
        onDoorToggle={handleToggleDoor}
      />

      {/* Top Status Bar & Navigation */}
      <TopStatusBar
        telemetry={telemetry}
        onReset={handleResetPosition}
        onToggleHelp={() => setShowHelp(true)}
        showHelp={showHelp}
      />

      {/* Floating HUD Layout */}
      <div className="absolute inset-0 pointer-events-none p-4 pt-16 flex justify-between items-start">
        {/* Left Column: Real-time Performance Dashboard */}
        <div className="flex flex-col gap-2 max-w-xs w-full">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              id="btn-toggle-dashboard-visibility"
              onClick={() => setShowDashboard(!showDashboard)}
              className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 shadow-md backdrop-blur-md transition"
            >
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {cameraMode === 'cockpit'
                  ? showDashboard
                    ? 'Hide 2D Overlay'
                    : 'Show 2D HUD (In-Car Active)'
                  : showDashboard
                  ? 'Hide 2D HUD'
                  : 'Show 2D HUD'}
              </span>
            </button>
            {cameraMode === 'cockpit' && !showDashboard && (
              <span className="text-[11px] font-medium text-sky-400 bg-sky-950/90 border border-sky-800/80 px-2 py-0.5 rounded shadow">
                In-Car Dash Live
              </span>
            )}
          </div>

          {showDashboard && (
            <div className="animate-fadeIn">
              <PerformanceDashboard telemetry={telemetry} />
            </div>
          )}
        </div>

        {/* Right Column: Camera Controls & Vehicle Articulation Inspector */}
        <div className="flex flex-col items-end gap-2 max-w-xs w-full">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 backdrop-blur-md flex shadow-md">
              <button
                id="tab-camera-controls"
                onClick={() => {
                  setRightPanelTab('camera');
                  setShowRightPanel(true);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                  showRightPanel && rightPanelTab === 'camera'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Cameras</span>
              </button>

              <button
                id="tab-inspector-controls"
                onClick={() => {
                  setRightPanelTab('inspector');
                  setShowRightPanel(true);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                  showRightPanel && rightPanelTab === 'inspector'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Car Parts</span>
              </button>
            </div>

            <button
              id="btn-toggle-right-panel"
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white shadow-md backdrop-blur-md"
              title={showRightPanel ? 'Collapse Panel' : 'Expand Panel'}
            >
              {showRightPanel ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Right Panel Body */}
          {showRightPanel && (
            <div className="w-full animate-fadeIn">
              {rightPanelTab === 'camera' ? (
                <CameraControls
                  currentMode={cameraMode}
                  onSelectMode={setCameraMode}
                  fov={cameraFov}
                  onChangeFov={setCameraFov}
                />
              ) : (
                <CarInspectorControls
                  doorState={doorState}
                  onToggleDoor={handleToggleDoor}
                  onToggleAllDoors={handleToggleAllDoors}
                  headlightsOn={headlightsOn}
                  onToggleHeadlights={() => setHeadlightsOn(!headlightsOn)}
                  onResetPosition={handleResetPosition}
                  environmentTime={environmentTime}
                  onChangeEnvironment={setEnvironmentTime}
                  allDoorsOpen={allDoorsOpen}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* On-Screen Mobile Driving Controls */}
      <OnScreenControls
        input={externalInput}
        onChangeInput={setExternalInput}
      />

      {/* Bottom Hint Strip on Desktop */}
      <div className="hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-md text-[11px] text-slate-400 items-center gap-3 shadow-lg">
        <span><strong className="text-slate-200">WASD / Arrows:</strong> Drive & Steer</span>
        <span className="text-slate-600">•</span>
        <span><strong className="text-slate-200">Space:</strong> Handbrake Drift</span>
        <span className="text-slate-600">•</span>
        <span><strong className="text-slate-200">C:</strong> Camera View</span>
        <span className="text-slate-600">•</span>
        <span><strong className="text-slate-200">R:</strong> Reset Slope</span>
        <span className="text-slate-600">•</span>
        <span><strong className="text-slate-200">1-4, H, T:</strong> Doors/Hood</span>
      </div>

      {/* Controls & Features Guide Modal */}
      <ControlsGuideModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
