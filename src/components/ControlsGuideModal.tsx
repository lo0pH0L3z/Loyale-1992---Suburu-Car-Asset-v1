import React from 'react';
import { X, Key, Compass, Sliders, Zap, Mountain } from 'lucide-react';

interface ControlsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsGuideModal: React.FC<ControlsGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="controls-guide-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="controls-guide-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Sandbox Driving & Vehicle Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-4 text-xs">
          {/* Driving Controls */}
          <div>
            <h3 className="font-semibold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-400" />
              Driving & Kinetic Physics
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Accelerate / Gas</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-sky-300 font-bold">W / ↑</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Brake / Reverse</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-rose-300 font-bold">S / ↓</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Steer Left / Right</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-200 font-bold">A / D or ← / →</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Handbrake (Drift)</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">Spacebar</span>
              </div>
            </div>
          </div>

          {/* Kinetic Slope Feature */}
          <div className="bg-sky-950/40 p-3 rounded-xl border border-sky-800/60 space-y-1">
            <div className="font-bold text-sky-300 flex items-center gap-1.5">
              <Mountain className="w-4 h-4 text-sky-400" />
              Kinetic Slope Rolling & Smooth Terrain Transitions
            </div>
            <p className="text-slate-300 leading-relaxed">
              The car spawns on a 15° inclined launch slope with authentic gravitational kinetics. Release the handbrake and watch the car roll downhill picking up speed and wheel spin naturally without throttle! Smooth cubic Hermite terrain math ensures zero collision clipping when transitioning from slope to flat asphalt.
            </p>
          </div>

          {/* Camera Angles */}
          <div>
            <h3 className="font-semibold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-sky-400" />
              Camera Controls
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Cycle Camera Modes</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-sky-300 font-bold">C</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Orbit / Inspect Look</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-sky-300 font-bold">Click + Drag</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Zoom In / Out</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-sky-300 font-bold">Mouse Wheel</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Headlights Toggle</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">L</span>
              </div>
            </div>
          </div>

          {/* Interactive Doors & Parts */}
          <div>
            <h3 className="font-semibold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              Interactive Car Parts (1992 Loyale)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">Front Doors</div>
                <div className="font-mono text-sky-300 font-bold mt-1">Keys 1 & 2</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">Rear Doors</div>
                <div className="font-mono text-sky-300 font-bold mt-1">Keys 3 & 4</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">Hood / Engine Bay & Trunk</div>
                <div className="font-mono text-sky-300 font-bold mt-1">Keys H & T</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition shadow-md shadow-sky-600/30"
          >
            Got it, Let's Drive!
          </button>
        </div>
      </div>
    </div>
  );
};
