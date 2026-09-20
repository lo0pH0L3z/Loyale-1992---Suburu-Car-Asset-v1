import React from 'react';
import { CarDoorState } from '../types';
import {
  Sun,
  Sunset,
  Lightbulb,
  RotateCcw,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';

interface CarInspectorControlsProps {
  doorState: CarDoorState;
  onToggleDoor: (door: keyof CarDoorState) => void;
  onToggleAllDoors: () => void;
  headlightsOn: boolean;
  onToggleHeadlights: () => void;
  onResetPosition: (presetKey: 'slope' | 'flat' | 'ramp' | 'banked') => void;
  environmentTime: 'day' | 'sunset' | 'studio';
  onChangeEnvironment: (env: 'day' | 'sunset' | 'studio') => void;
  allDoorsOpen: boolean;
}

export const CarInspectorControls: React.FC<CarInspectorControlsProps> = ({
  doorState,
  onToggleDoor,
  onToggleAllDoors,
  headlightsOn,
  onToggleHeadlights,
  onResetPosition,
  environmentTime,
  onChangeEnvironment,
  allDoorsOpen
}) => {
  const doors: { key: keyof CarDoorState; label: string; shortcut: string }[] = [
    { key: 'frontLeft', label: 'FL Door', shortcut: '1' },
    { key: 'frontRight', label: 'FR Door', shortcut: '2' },
    { key: 'rearLeft', label: 'RL Door', shortcut: '3' },
    { key: 'rearRight', label: 'RR Door', shortcut: '4' },
    { key: 'hood', label: 'Hood (Engine)', shortcut: 'H' },
    { key: 'trunk', label: 'Trunk (Boot)', shortcut: 'T' }
  ];

  return (
    <div
      id="car-inspector-panel"
      className="pointer-events-auto bg-slate-950/90 text-slate-100 rounded-xl border border-slate-800 shadow-xl backdrop-blur-md p-2.5 space-y-2.5"
    >
      <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-1.5 px-1">
        <span className="font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Vehicle Articulation
        </span>
        <span className="text-[10px] text-slate-400">1992 Loyale Sedan</span>
      </div>

      {/* Door / Hood / Trunk Buttons Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {doors.map((d) => {
          const isOpen = doorState[d.key];
          return (
            <button
              key={d.key}
              id={`btn-door-${d.key}`}
              onClick={() => onToggleDoor(d.key)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                isOpen
                  ? 'bg-sky-600/90 text-white border border-sky-400 shadow-sm'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
              }`}
            >
              <span className="truncate">{d.label}</span>
              <span className="font-mono text-[9px] px-1 py-0.2 bg-slate-950/60 rounded text-slate-300 ml-1">
                {d.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Actions: All Doors & Headlights */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          id="btn-toggle-all-doors"
          onClick={onToggleAllDoors}
          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
            allDoorsOpen
              ? 'bg-sky-500 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
          }`}
        >
          {allDoorsOpen ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          <span>{allDoorsOpen ? 'Close All' : 'Open All'}</span>
        </button>

        <button
          id="btn-toggle-headlights"
          onClick={onToggleHeadlights}
          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
            headlightsOn
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{headlightsOn ? 'Lights: ON' : 'Lights: OFF'}</span>
        </button>
      </div>

      {/* Spawn Location Presets */}
      <div className="pt-1 border-t border-slate-800/80">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 px-1 flex items-center justify-between">
          <span>Spawn & Test Presets</span>
          <span className="text-[9px] text-amber-400">Kinetic Slope Ready</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <button
            id="spawn-slope"
            onClick={() => onResetPosition('slope')}
            className="px-2 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-200 border border-sky-800/80 flex items-center justify-center gap-1"
            title="Start on the Launch Hill slope to test gravity roll"
          >
            <RotateCcw className="w-3 h-3 text-sky-400" />
            <span>Launch Slope</span>
          </button>

          <button
            id="spawn-flat"
            onClick={() => onResetPosition('flat')}
            className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Flat Arena</span>
          </button>

          <button
            id="spawn-ramp"
            onClick={() => onResetPosition('ramp')}
            className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>Jump Ramp</span>
          </button>

          <button
            id="spawn-banked"
            onClick={() => onResetPosition('banked')}
            className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Banked Curve</span>
          </button>
        </div>
      </div>

      {/* Lighting / Environment Selector */}
      <div className="pt-1 border-t border-slate-800/80">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 px-1">
          Sky Atmosphere
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            id="env-day"
            onClick={() => onChangeEnvironment('day')}
            className={`p-1.5 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition ${
              environmentTime === 'day'
                ? 'bg-sky-600 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Sun className="w-3 h-3" />
            <span>Day</span>
          </button>
          <button
            id="env-sunset"
            onClick={() => onChangeEnvironment('sunset')}
            className={`p-1.5 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition ${
              environmentTime === 'sunset'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Sunset className="w-3 h-3" />
            <span>Sunset</span>
          </button>
          <button
            id="env-studio"
            onClick={() => onChangeEnvironment('studio')}
            className={`p-1.5 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition ${
              environmentTime === 'studio'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Lightbulb className="w-3 h-3" />
            <span>Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
