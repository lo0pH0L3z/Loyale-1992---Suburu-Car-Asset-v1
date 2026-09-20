import React from 'react';
import { Sparkles, HelpCircle, RotateCcw, Car } from 'lucide-react';
import { TelemetryData } from '../types';

interface TopStatusBarProps {
  telemetry: TelemetryData;
  onReset: (key: 'slope' | 'flat') => void;
  onToggleHelp: () => void;
  showHelp: boolean;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  telemetry,
  onReset,
  onToggleHelp,
  showHelp
}) => {
  // Determine driving status
  let statusText = 'Parked / Idling';
  let statusColor = 'text-slate-400';

  if (!telemetry.isGrounded) {
    statusText = 'Airborne / Ramp Jump!';
    statusColor = 'text-amber-400 font-bold animate-pulse';
  } else if (telemetry.speedKmh > 2) {
    if (telemetry.pitchDeg < -5) {
      statusText = `Kinetic Slope Roll (${Math.abs(telemetry.pitchDeg)}° Incline)`;
      statusColor = 'text-sky-400 font-semibold';
    } else if (telemetry.handbrake) {
      statusText = 'Handbrake Drift Slide!';
      statusColor = 'text-rose-400 font-bold';
    } else {
      statusText = `Cruising (${Math.round(telemetry.speedKmh)} km/h)`;
      statusColor = 'text-emerald-400 font-semibold';
    }
  }

  return (
    <header
      id="top-status-bar"
      className="pointer-events-auto bg-slate-950/85 text-slate-100 border-b border-slate-800/80 backdrop-blur-md px-4 py-2 flex items-center justify-between z-10 shadow-lg"
    >
      {/* App Branding */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-600/50 flex items-center justify-center text-sky-400 shadow-md shadow-sky-900/40">
          <Car className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-white">
              1992 Subaru Loyale
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-semibold bg-sky-900/60 border border-sky-700/60 text-sky-300 rounded">
              Kinetic Sandbox
            </span>
          </div>
          <div className="text-[11px] flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            <span className={statusColor}>{statusText}</span>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-2">
        <button
          id="btn-quick-reset-slope"
          onClick={() => onReset('slope')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700/70 text-sky-200 text-xs font-medium transition shadow-sm"
          title="Reset position to top of Launch Slope"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
          <span>Launch Slope</span>
        </button>

        <button
          id="btn-toggle-keyboard-guide"
          onClick={onToggleHelp}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
            showHelp
              ? 'bg-sky-600 text-white border-sky-400'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Controls & Info</span>
        </button>
      </div>
    </header>
  );
};
