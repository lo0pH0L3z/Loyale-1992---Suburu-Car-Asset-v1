import React from 'react';
import { CameraViewMode } from '../types';
import { Video, Eye, Compass, Disc3, ShieldAlert, Navigation, Wrench } from 'lucide-react';

interface CameraControlsProps {
  currentMode: CameraViewMode;
  onSelectMode: (mode: CameraViewMode) => void;
  fov: number;
  onChangeFov: (fov: number) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  currentMode,
  onSelectMode,
  fov,
  onChangeFov
}) => {
  const modes: { id: CameraViewMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    {
      id: 'chase',
      label: 'Chase',
      icon: <Navigation className="w-3.5 h-3.5" />,
      shortcut: 'Key C'
    },
    {
      id: 'orbit',
      label: 'Inspect',
      icon: <Compass className="w-3.5 h-3.5" />,
      shortcut: 'Free Drag'
    },
    {
      id: 'engine',
      label: 'Engine Bay',
      icon: <Wrench className="w-3.5 h-3.5" />,
      shortcut: 'Boxer-4'
    },
    {
      id: 'cockpit',
      label: 'Cockpit',
      icon: <Eye className="w-3.5 h-3.5" />,
      shortcut: 'Interior'
    },
    {
      id: 'hood',
      label: 'Hood Cam',
      icon: <Video className="w-3.5 h-3.5" />,
      shortcut: 'Front'
    },
    {
      id: 'wheel',
      label: 'Turbine',
      icon: <Disc3 className="w-3.5 h-3.5" />,
      shortcut: 'Hubcap'
    },
    {
      id: 'drone',
      label: 'Drone',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      shortcut: 'Top'
    }
  ];

  return (
    <div
      id="camera-controls-panel"
      className="pointer-events-auto bg-slate-950/90 text-slate-100 rounded-xl border border-slate-800 shadow-xl backdrop-blur-md p-2.5 space-y-2"
    >
      <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-1.5 px-1">
        <span className="font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5" />
          Camera Angles
        </span>
        <span className="text-[10px] text-slate-400">Press 'C' to cycle</span>
      </div>

      {/* Button Grid for 7 Camera Perspectives */}
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              id={`cam-btn-${m.id}`}
              onClick={() => onSelectMode(m.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 font-semibold'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
              }`}
            >
              <div className="mb-1">{m.icon}</div>
              <span className="text-center leading-tight whitespace-nowrap">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* FOV slider */}
      <div className="pt-1 px-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>Field of View</span>
        <div className="flex items-center gap-2 w-32">
          <input
            type="range"
            min="35"
            max="85"
            value={fov}
            onChange={(e) => onChangeFov(Number(e.target.value))}
            className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-slate-300 text-[10px] w-6 text-right">{fov}°</span>
        </div>
      </div>
    </div>
  );
};
