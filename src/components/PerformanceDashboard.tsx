import React, { useEffect, useRef, useState } from 'react';
import { TelemetryData } from '../types';
import { Gauge, Zap, Activity, Compass, ArrowDownRight, Layers, Sliders } from 'lucide-react';

interface DashboardProps {
  telemetry: TelemetryData;
}

export const PerformanceDashboard: React.FC<DashboardProps> = ({ telemetry }) => {
  const [unitImperial, setUnitImperial] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // History buffer for velocity and torque graph (last 100 frames)
  const historyRef = useRef<{ velocity: number; torque: number }[]>([]);

  useEffect(() => {
    const history = historyRef.current;
    history.push({
      velocity: telemetry.speedKmh,
      torque: telemetry.engineTorqueNm
    });
    if (history.length > 120) {
      history.shift();
    }

    // Render telemetry graph to canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 10; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (history.length < 2) return;

    const step = w / (120 - 1);

    // Plot Velocity (Cyan)
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    history.forEach((pt, idx) => {
      const x = idx * step;
      const y = h - (Math.min(pt.velocity, 160) / 160) * (h - 8) - 4;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot Torque (Amber)
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    history.forEach((pt, idx) => {
      const x = idx * step;
      const y = h - (Math.min(pt.torque, 150) / 150) * (h - 8) - 4;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [telemetry]);

  const speedDisplay = unitImperial ? telemetry.speedMph : telemetry.speedKmh;
  const speedUnit = unitImperial ? 'MPH' : 'KM/H';
  const torqueDisplay = unitImperial
    ? Math.round(telemetry.engineTorqueNm * 0.73756)
    : telemetry.engineTorqueNm;
  const torqueUnit = unitImperial ? 'lb-ft' : 'Nm';

  // Needle calculations for gauges
  const rpmPercent = Math.min(telemetry.engineRpm / 7000, 1);
  const rpmAngle = -120 + rpmPercent * 240; // -120deg to +120deg

  const speedPercent = Math.min(speedDisplay / (unitImperial ? 120 : 180), 1);
  const speedAngle = -120 + speedPercent * 240;

  return (
    <div
      id="performance-dashboard-container"
      className="pointer-events-auto bg-slate-950/90 text-slate-100 rounded-xl border border-slate-800 shadow-2xl backdrop-blur-md transition-all duration-200"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="font-bold tracking-wider uppercase text-sky-400">
            Telemetry & Dynamics
          </span>
          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono">
            1992 Loyale 1.8L Boxer
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-units"
            onClick={() => setUnitImperial(!unitImperial)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium transition"
          >
            {unitImperial ? 'Imperial' : 'Metric'}
          </button>
          <button
            id="btn-toggle-dashboard-compact"
            onClick={() => setIsCompact(!isCompact)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title={isCompact ? 'Expand Dashboard' : 'Minimize Dashboard'}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Dashboard Body */}
      <div className="p-3.5 space-y-3">
        {/* Speedometer & Tachometer Cluster */}
        <div className="grid grid-cols-2 gap-3">
          {/* Speedometer Card */}
          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 flex flex-col items-center relative">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-sky-400" />
              Velocity
            </div>

            {/* Circular Gauge Visualization */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#334155"
                  strokeWidth="7"
                  fill="transparent"
                  strokeDasharray="188"
                  strokeDashoffset="47"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#38bdf8"
                  strokeWidth="7"
                  fill="transparent"
                  strokeDasharray="188"
                  strokeDashoffset={188 - speedPercent * 141}
                  strokeLinecap="round"
                  className="transition-all duration-75"
                />
              </svg>

              {/* Digital Readout inside circle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black tracking-tight text-white font-mono">
                  {Math.round(speedDisplay)}
                </span>
                <span className="text-[10px] font-bold text-sky-400">{speedUnit}</span>
              </div>
            </div>

            {/* Incline / Slope indicator below velocity */}
            <div className="mt-1 text-[11px] text-slate-300 flex items-center gap-1 font-mono">
              <ArrowDownRight className="w-3 h-3 text-amber-400" />
              <span>Pitch: {telemetry.pitchDeg}°</span>
              <span className="text-slate-500">|</span>
              <span>Roll: {telemetry.rollDeg}°</span>
            </div>
          </div>

          {/* Tachometer & Engine Torque Card */}
          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 flex flex-col items-center relative">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Engine & Torque
            </div>

            {/* Circular RPM Gauge */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#334155"
                  strokeWidth="7"
                  fill="transparent"
                  strokeDasharray="188"
                  strokeDashoffset="47"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={telemetry.engineRpm > 5800 ? '#ef4444' : '#fbbf24'}
                  strokeWidth="7"
                  fill="transparent"
                  strokeDasharray="188"
                  strokeDashoffset={188 - rpmPercent * 141}
                  strokeLinecap="round"
                  className="transition-all duration-75"
                />
              </svg>

              {/* Digital RPM & Gear Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black tracking-tight text-white font-mono">
                  {telemetry.engineRpm}
                </span>
                <span className="text-[9px] font-medium text-slate-400">RPM</span>
                <div className="mt-0.5 px-1.5 py-0.2 rounded bg-sky-950 border border-sky-600/60 text-sky-300 font-bold text-[10px]">
                  GEAR {telemetry.gear}
                </div>
              </div>
            </div>

            {/* Torque & Power Readout */}
            <div className="mt-1 text-[11px] text-slate-300 flex items-center gap-2 font-mono">
              <span className="text-amber-300 font-semibold">
                {torqueDisplay} {torqueUnit}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400">{telemetry.horsepower} HP</span>
            </div>
          </div>
        </div>

        {/* Detailed Expanded Metrics (Graphs, G-Force, Pedals, Suspension) */}
        {!isCompact && (
          <>
            {/* Real-time Velocity & Torque Graph */}
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-1">
                <span className="font-semibold uppercase tracking-wider">Live Dynamics Trace</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sky-400">
                    <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>
                    Speed ({Math.round(speedDisplay)} {speedUnit})
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                    Torque ({torqueDisplay} {torqueUnit})
                  </span>
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={260}
                height={55}
                className="w-full h-14 rounded bg-slate-950/70 border border-slate-900 block"
              />
            </div>

            {/* Inputs & G-Force Row */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Throttle & Brake Bars */}
              <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/80 space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Throttle</span>
                    <span className="font-mono">{Math.round(telemetry.throttle * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${telemetry.throttle * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Foot Brake</span>
                    <span className="font-mono">{Math.round(telemetry.brake * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-75"
                      style={{ width: `${telemetry.brake * 100}%` }}
                    />
                  </div>
                </div>

                {/* Handbrake Badge */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-slate-400">Handbrake</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      telemetry.handbrake
                        ? 'bg-rose-950 text-rose-300 border border-rose-600'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {telemetry.handbrake ? 'LOCKED' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* 2D G-Force Circle & Incline */}
              <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/80 flex items-center justify-between">
                <div className="flex flex-col justify-center space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    G-Forces
                  </div>
                  <div className="font-mono text-[11px] text-slate-300">
                    <div>Lat: {telemetry.lateralG > 0 ? `+${telemetry.lateralG}` : telemetry.lateralG}G</div>
                    <div>Lon: {telemetry.longitudinalG > 0 ? `+${telemetry.longitudinalG}` : telemetry.longitudinalG}G</div>
                  </div>
                </div>

                {/* 2D Crosshair G-Meter */}
                <div className="relative w-12 h-12 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center">
                  <div className="absolute w-full h-[1px] bg-slate-800" />
                  <div className="absolute h-full w-[1px] bg-slate-800" />
                  <div
                    className="absolute w-2.5 h-2.5 rounded-full bg-sky-400 shadow-md shadow-sky-500/50 transition-all duration-75"
                    style={{
                      transform: `translate(${Math.max(-18, Math.min(18, telemetry.lateralG * 18))}px, ${Math.max(-18, Math.min(18, -telemetry.longitudinalG * 18))}px)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Suspension Compression Telemetry (4 Wheels) */}
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-sky-400" />
                  Suspension Springs
                </span>
                <span className={telemetry.isGrounded ? 'text-emerald-400' : 'text-amber-400'}>
                  {telemetry.isGrounded ? 'Contact: Grounded' : 'Contact: Airborne'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                {(['FL', 'FR', 'RL', 'RR'] as const).map((wheel, idx) => {
                  const comp = telemetry.suspensionCompression[idx];
                  return (
                    <div key={wheel} className="bg-slate-950/80 rounded p-1 border border-slate-800">
                      <div className="text-[9px] text-slate-400 mb-0.5">{wheel}</div>
                      <div className="w-full h-10 bg-slate-900 rounded overflow-hidden flex flex-col justify-end">
                        <div
                          className="w-full bg-sky-500 transition-all duration-75"
                          style={{ height: `${Math.round(comp * 100)}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-300 mt-0.5">
                        {Math.round(comp * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
