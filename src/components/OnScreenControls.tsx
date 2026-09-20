import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Disc, Flame } from 'lucide-react';
import { CarControlInput } from '../physics/CarPhysics';

interface OnScreenControlsProps {
  input: CarControlInput;
  onChangeInput: (updater: (prev: CarControlInput) => CarControlInput) => void;
}

export const OnScreenControls: React.FC<OnScreenControlsProps> = ({
  input,
  onChangeInput
}) => {
  return (
    <div
      id="onscreen-driving-controls"
      className="pointer-events-none fixed bottom-4 left-4 right-4 flex items-end justify-between z-20 select-none md:hidden"
    >
      {/* Steering Buttons (Left / Right) */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          id="touch-steer-left"
          onPointerDown={() => onChangeInput((p) => ({ ...p, steer: -1 }))}
          onPointerUp={() => onChangeInput((p) => ({ ...p, steer: 0 }))}
          onPointerLeave={() => onChangeInput((p) => ({ ...p, steer: 0 }))}
          className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-700/80 active:bg-sky-600 flex items-center justify-center text-white shadow-xl backdrop-blur-md"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          id="touch-steer-right"
          onPointerDown={() => onChangeInput((p) => ({ ...p, steer: 1 }))}
          onPointerUp={() => onChangeInput((p) => ({ ...p, steer: 0 }))}
          onPointerLeave={() => onChangeInput((p) => ({ ...p, steer: 0 }))}
          className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-700/80 active:bg-sky-600 flex items-center justify-center text-white shadow-xl backdrop-blur-md"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Throttle, Brake, and Handbrake */}
      <div className="flex items-end gap-2 pointer-events-auto">
        {/* Handbrake */}
        <button
          id="touch-handbrake"
          onPointerDown={() => onChangeInput((p) => ({ ...p, handbrake: true }))}
          onPointerUp={() => onChangeInput((p) => ({ ...p, handbrake: false }))}
          onPointerLeave={() => onChangeInput((p) => ({ ...p, handbrake: false }))}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold border shadow-xl backdrop-blur-md ${
            input.handbrake
              ? 'bg-rose-600 border-rose-400 text-white'
              : 'bg-slate-950/80 border-slate-700/80 text-rose-300 active:bg-rose-700'
          }`}
        >
          <Flame className="w-5 h-5" />
        </button>

        {/* Foot Brake / Reverse */}
        <button
          id="touch-brake"
          onPointerDown={() => onChangeInput((p) => ({ ...p, brake: 1 }))}
          onPointerUp={() => onChangeInput((p) => ({ ...p, brake: 0 }))}
          onPointerLeave={() => onChangeInput((p) => ({ ...p, brake: 0 }))}
          className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-700/80 active:bg-rose-600 flex flex-col items-center justify-center text-white shadow-xl backdrop-blur-md"
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">BRAKE</span>
        </button>

        {/* Gas / Throttle */}
        <button
          id="touch-gas"
          onPointerDown={() => onChangeInput((p) => ({ ...p, throttle: 1 }))}
          onPointerUp={() => onChangeInput((p) => ({ ...p, throttle: 0 }))}
          onPointerLeave={() => onChangeInput((p) => ({ ...p, throttle: 0 }))}
          className="w-16 h-20 rounded-2xl bg-emerald-950/80 border border-emerald-600/80 active:bg-emerald-600 flex flex-col items-center justify-center text-white shadow-xl backdrop-blur-md"
        >
          <ArrowUp className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">GAS</span>
        </button>
      </div>
    </div>
  );
};
