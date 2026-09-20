import * as THREE from 'three';
import { TelemetryData } from '../types';

export class DashboardCanvasManager {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;

  private lastBlinkTime = 0;
  private blinkState = false;
  private simulatedOdo = 300250.4;
  private fuelLevel = 0.82; // 82% full
  private coolantTemp = 88; // 88 deg C normal operating temp

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 4;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    // Initial render
    this.render({
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
      pitchDeg: 0,
      rollDeg: 0,
      altitudeM: 0,
      wheelSlip: [0, 0, 0, 0],
      suspensionCompression: [0.3, 0.3, 0.3, 0.3],
      isGrounded: true
    }, false, 0, false);
  }

  public render(
    telemetry: TelemetryData,
    headlightsOn: boolean,
    steerInput: number,
    anyDoorOpen = false
  ) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Blinker timing
    const now = performance.now();
    if (now - this.lastBlinkTime > 320) {
      this.blinkState = !this.blinkState;
      this.lastBlinkTime = now;
    }

    // Dynamic fuel consumption and coolant temperature
    this.simulatedOdo += (telemetry.speedKmh / 3600) * 0.05;
    this.fuelLevel = Math.max(0.08, this.fuelLevel - (telemetry.throttle * 0.00002 + 0.000005));

    const targetTemp = 86 + (telemetry.engineRpm / 7000) * 12 + (telemetry.speedKmh > 120 ? 4 : 0);
    this.coolantTemp = this.coolantTemp * 0.98 + targetTemp * 0.02;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // 1. Outer Binnacle Silhouette (Matches user reference image shape: curved hood cowl)
    ctx.save();
    this.drawClusterBezel(ctx, w, h);
    ctx.clip();

    // 2. Carbon Fiber Weave Textured Background
    this.drawCarbonFiberBackground(ctx, w, h);

    // 3. FAR LEFT GAUGE: Engine Coolant Temperature Gauge (50°C - 140°C)
    this.drawTemperatureGauge(ctx, 130, 260, 90, this.coolantTemp);

    // 4. CENTER LEFT GAUGE: Tachometer (0 - 6 x 1000 RPM)
    this.drawTachometer(ctx, 350, 240, 155, telemetry.engineRpm, headlightsOn, telemetry.gear);

    // 5. CENTER TOP: Warning Lamps & Turn Signals
    this.drawCenterTopWarnings(ctx, w / 2, 130, steerInput, telemetry.engineRpm);

    // 6. CENTER RIGHT GAUGE: Speedometer (0 - 220 km/h)
    this.drawSpeedometer(ctx, 674, 240, 155, telemetry.speedKmh);

    // 7. FAR RIGHT GAUGE: Fuel / Petrol Gauge (E - F)
    this.drawFuelGauge(ctx, 894, 260, 90, this.fuelLevel);

    // 8. Warning Indicators in Upper Wings (Door open & Brake warning)
    this.drawWingWarnings(ctx, anyDoorOpen, telemetry.handbrake || telemetry.brake > 0.1);

    // 9. BOTTOM AUXILIARY STRIP (Odometer, digital speed, service inspection LEDs, icons)
    this.drawBottomStatusStrip(ctx, w, h, telemetry.speedKmh, headlightsOn);

    ctx.restore();

    // 10. Outer Bezel Border Highlight Ring
    this.drawOuterBezelRim(ctx, w, h);

    this.texture.needsUpdate = true;
  }

  // Outer cluster silhouette (wide curved dome with side pods)
  private drawClusterBezel(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.beginPath();
    // Rounded oval cluster profile matching user reference image
    const padX = 14;
    const padY = 14;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const rx = innerW / 2;
    const ry = innerH / 2;
    const cx = w / 2;
    const cy = h / 2;

    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#080a0e';
    ctx.fill();
  }

  // Procedural Carbon Fiber Diagonal Cross-Weave Texture
  private drawCarbonFiberBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#0f1318';
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    // Diagonal weave lines
    for (let d = -h; d < w + h; d += 8) {
      ctx.strokeStyle = '#181f28';
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + h, h);
      ctx.stroke();

      ctx.strokeStyle = '#121720';
      ctx.beginPath();
      ctx.moveTo(d, h);
      ctx.lineTo(d + h, 0);
      ctx.stroke();
    }

    // Radial vignette shading around cluster edges
    const grad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // 3. FAR LEFT: Temperature Gauge (50°C to 140°C)
  private drawTemperatureGauge(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    tempC: number
  ) {
    const startAng = 0.85 * Math.PI;
    const endAng = 1.65 * Math.PI;
    const sweep = endAng - startAng;

    // Glowing cyan background track arc
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 7;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, startAng, endAng);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Radial ticks
    for (let i = 0; i <= 6; i++) {
      const ang = startAng + (i / 6) * sweep;
      const isMajor = i === 0 || i === 3 || i === 6;
      const tickLen = isMajor ? 12 : 7;

      ctx.strokeStyle = i === 6 ? '#ef4444' : '#e0f2fe';
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + (r - tickLen - 6) * Math.cos(ang), cy + (r - tickLen - 6) * Math.sin(ang));
      ctx.lineTo(cx + (r - 6) * Math.cos(ang), cy + (r - 6) * Math.sin(ang));
      ctx.stroke();
    }

    // Labels: 50, 90, 140, C, H
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50', cx - 44, cy + 24);
    ctx.fillText('C', cx - 44, cy + 40);

    ctx.fillText('90', cx - 42, cy - 28);
    ctx.fillText('140', cx + 6, cy - 64);
    ctx.fillText('H', cx + 18, cy - 48);

    // Coolant wave symbol icon
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + 20, cy - 14, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 8);
    ctx.lineTo(cx + 26, cy - 8);
    ctx.moveTo(cx + 12, cy - 4);
    ctx.lineTo(cx + 28, cy - 4);
    ctx.stroke();

    // Needle
    const tNorm = Math.max(0, Math.min(1, (tempC - 50) / 90));
    const needleAng = startAng + tNorm * sweep;
    this.drawCyanNeedle(ctx, cx, cy, needleAng, r - 12);
  }

  // 4. CENTER LEFT: Tachometer (x 1000 RPM)
  private drawTachometer(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rpm: number,
    headlightsOn: boolean,
    gear: number | 'R' | 'N'
  ) {
    const startAng = 0.78 * Math.PI;
    const endAng = 2.22 * Math.PI;
    const sweep = endAng - startAng;

    // Glowing cyan perimeter band
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, startAng, startAng + sweep * (5 / 6));
    ctx.stroke();

    // Redline band from 5 to 6
    ctx.strokeStyle = '#dc2626';
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, startAng + sweep * (5 / 6), endAng);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Numerals 1 to 6 and tick marks
    for (let i = 1; i <= 6; i++) {
      const ang = startAng + ((i - 0) / 6) * sweep;
      const isRed = i >= 5;

      // Major tick
      ctx.strokeStyle = isRed ? '#ef4444' : '#f8fafc';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx + (r - 26) * Math.cos(ang), cy + (r - 26) * Math.sin(ang));
      ctx.lineTo(cx + (r - 8) * Math.cos(ang), cy + (r - 8) * Math.sin(ang));
      ctx.stroke();

      // Number label
      const tx = cx + (r - 46) * Math.cos(ang);
      const ty = cy + (r - 46) * Math.sin(ang);
      ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), tx, ty);

      // Sub-ticks
      if (i < 6) {
        for (let sub = 1; sub < 4; sub++) {
          const subAng = ang + (sub / 24) * sweep;
          const subRed = i >= 5;
          ctx.strokeStyle = subRed ? '#f87171' : '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx + (r - 18) * Math.cos(subAng), cy + (r - 18) * Math.sin(subAng));
          ctx.lineTo(cx + (r - 8) * Math.cos(subAng), cy + (r - 8) * Math.sin(subAng));
          ctx.stroke();
        }
      }
    }

    // "x 1000" label
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('x 1000', cx, cy - 40);

    // Headlight indicator icon inside dial
    ctx.fillStyle = headlightsOn ? '#eab308' : '#334155';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('≡D', cx - 36, cy + 50);

    // Gear indicator badge [P] / [R] / [N] / [D]
    const gearStr = gear === 'R' ? 'R' : gear === 'N' ? 'N' : gear === 1 ? '1' : `${gear}`;
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 26, cy + 38, 26, 26);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(gearStr, cx + 39, cy + 51);

    // Needle
    const clampedRpm = Math.max(0, Math.min(6000, rpm));
    const needleAng = startAng + (clampedRpm / 6000) * sweep;
    this.drawCyanNeedle(ctx, cx, cy, needleAng, r - 16);
  }

  // 5. CENTER TOP: Warning Lamps & Turn Signals
  private drawCenterTopWarnings(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    steerInput: number,
    rpm: number
  ) {
    const isLeftSignaling = steerInput < -0.15;
    const isRightSignaling = steerInput > 0.15;

    // Left Turn Arrow (Green glowing chevron)
    const leftActive = isLeftSignaling && this.blinkState;
    ctx.fillStyle = leftActive ? '#22c55e' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy);
    ctx.lineTo(cx - 32, cy - 12);
    ctx.lineTo(cx - 32, cy - 4);
    ctx.lineTo(cx - 18, cy - 4);
    ctx.lineTo(cx - 18, cy + 4);
    ctx.lineTo(cx - 32, cy + 4);
    ctx.lineTo(cx - 32, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Right Turn Arrow (Green glowing chevron)
    const rightActive = isRightSignaling && this.blinkState;
    ctx.fillStyle = rightActive ? '#22c55e' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx + 50, cy);
    ctx.lineTo(cx + 32, cy - 12);
    ctx.lineTo(cx + 32, cy - 4);
    ctx.lineTo(cx + 18, cy - 4);
    ctx.lineTo(cx + 18, cy + 4);
    ctx.lineTo(cx + 32, cy + 4);
    ctx.lineTo(cx + 32, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Oil Pressure Warning Lamp (Red Oil Can)
    const oilWarning = rpm < 400; // on when engine off or stalled
    ctx.fillStyle = oilWarning ? '#ef4444' : '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🛢', cx - 10, cy + 22);

    // Battery 12V Warning Lamp
    ctx.fillStyle = oilWarning ? '#ef4444' : '#1e293b';
    ctx.fillText('[-+]', cx + 16, cy + 22);
  }

  // 6. CENTER RIGHT: Speedometer (km/h)
  private drawSpeedometer(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    speedKmh: number
  ) {
    const startAng = 0.78 * Math.PI;
    const endAng = 2.22 * Math.PI;
    const sweep = endAng - startAng;
    const maxKmh = 220;

    // Glowing cyan perimeter band
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, startAng, endAng);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Major numbers: 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220
    for (let v = 20; v <= maxKmh; v += 20) {
      const ang = startAng + (v / maxKmh) * sweep;

      // Major tick mark
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx + (r - 26) * Math.cos(ang), cy + (r - 26) * Math.sin(ang));
      ctx.lineTo(cx + (r - 8) * Math.cos(ang), cy + (r - 8) * Math.sin(ang));
      ctx.stroke();

      // Number text
      const tx = cx + (r - 46) * Math.cos(ang);
      const ty = cy + (r - 46) * Math.sin(ang);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 19px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(v.toString(), tx, ty);

      // Intermediate ticks (every 10 km/h)
      if (v < maxKmh) {
        const midAng = ang + (10 / maxKmh) * sweep;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + (r - 18) * Math.cos(midAng), cy + (r - 18) * Math.sin(midAng));
        ctx.lineTo(cx + (r - 8) * Math.cos(midAng), cy + (r - 8) * Math.sin(midAng));
        ctx.stroke();
      }
    }

    // "km/h" label
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('km/h', cx, cy - 40);

    // Seatbelt warning icon
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('💺', cx - 34, cy + 50);

    // "4WD" Subaru illuminated badge
    ctx.fillStyle = '#f97316';
    ctx.font = '900 18px "Arial Black", sans-serif';
    ctx.fillText('4WD', cx + 36, cy + 50);

    // Needle
    const clampedKmh = Math.max(0, Math.min(maxKmh, speedKmh));
    const needleAng = startAng + (clampedKmh / maxKmh) * sweep;
    this.drawCyanNeedle(ctx, cx, cy, needleAng, r - 16);
  }

  // 7. FAR RIGHT: Fuel / Petrol Gauge (E - F)
  private drawFuelGauge(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    fuelNorm01: number
  ) {
    const startAng = 1.35 * Math.PI;
    const endAng = 2.15 * Math.PI;
    const sweep = endAng - startAng;

    // Glowing cyan background track arc
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 7;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, startAng, endAng);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Radial ticks
    for (let i = 0; i <= 4; i++) {
      const ang = startAng + (i / 4) * sweep;
      const isMajor = i === 0 || i === 2 || i === 4;
      const tickLen = isMajor ? 12 : 7;

      ctx.strokeStyle = i === 0 ? '#ef4444' : '#e0f2fe';
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + (r - tickLen - 6) * Math.cos(ang), cy + (r - tickLen - 6) * Math.sin(ang));
      ctx.lineTo(cx + (r - 6) * Math.cos(ang), cy + (r - 6) * Math.sin(ang));
      ctx.stroke();
    }

    // Labels: E, F
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', cx - 22, cy - 48);
    ctx.fillText('F', cx + 46, cy + 34);

    // Petrol Pump Dispenser Icon
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('⛽', cx - 20, cy - 14);

    // Needle (from E to F)
    const clampedFuel = Math.max(0, Math.min(1, fuelNorm01));
    const needleAng = startAng + clampedFuel * sweep;
    this.drawCyanNeedle(ctx, cx, cy, needleAng, r - 12);
  }

  // Wing Warning Icons (Upper Left: Door Ajar, Upper Right: Brake System)
  private drawWingWarnings(
    ctx: CanvasRenderingContext2D,
    doorOpen: boolean,
    brakeActive: boolean
  ) {
    // Door open indicator (car with open doors in red)
    ctx.fillStyle = doorOpen ? '#ef4444' : '#1e293b';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚗', 180, 160);

    // Brake / Handbrake system warning ((!))
    ctx.fillStyle = brakeActive ? '#ef4444' : '#1e293b';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('((!))', 840, 160);
  }

  // 9. BOTTOM AUXILIARY STRIP
  private drawBottomStatusStrip(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    speedKmh: number,
    headlightsOn: boolean
  ) {
    const barY = h - 68;
    const barH = 44;

    // Dark pill container framing bottom strip
    ctx.fillStyle = '#06080b';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(130, barY, w - 260, barH, 22) : ctx.fillRect(130, barY, w - 260, barH);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Left Icons: Fog light, A/C snowflake, trunk open
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = headlightsOn ? '#22c55e' : '#334155';
    ctx.fillText('D≡', 190, barY + 22);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('❄', 240, barY + 22);

    ctx.fillStyle = '#f97316';
    ctx.fillText('🛈', 290, barY + 22);

    // Odometer: e.g. 300250 km (Digital cyan segmented display)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(340, barY + 8, 125, 28);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(340, barY + 8, 125, 28);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    const odoDigits = Math.floor(this.simulatedOdo).toString().padStart(6, '0');
    ctx.fillText(`${odoDigits} km`, 402, barY + 22);

    // Digital Speed: e.g. "80 km/h"
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(480, barY + 8, 95, 28);
    ctx.strokeRect(480, barY + 8, 95, 28);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${Math.round(speedKmh)} km/h`, 527, barY + 22);

    // "SERVICE INSPECTION" LED Dots (Green, Green, Green, Yellow, Red)
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('SERVICE INSPECTION', 624, barY + 12);

    const ledColors = ['#22c55e', '#22c55e', '#22c55e', '#eab308', '#ef4444'];
    ledColors.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(596 + idx * 14, barY + 26, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Right Icons: Washer, Wiper, High Beam
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('🚿', 720, barY + 22);
    ctx.fillText('彡', 765, barY + 22);

    ctx.fillStyle = headlightsOn ? '#3b82f6' : '#334155';
    ctx.fillText('≡D', 815, barY + 22);
  }

  // Stylized Glowing Blue/White Needle matching user reference photo
  private drawCyanNeedle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    ang: number,
    len: number
  ) {
    const tipX = cx + len * Math.cos(ang);
    const tipY = cy + len * Math.sin(ang);
    const tailX = cx - 18 * Math.cos(ang);
    const tailY = cy - 18 * Math.sin(ang);

    // Needle light glow
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Bright needle core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center pivot cap with white center dot
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer glossy bezel rim with double highlight bevel
  private drawOuterBezelRim(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    const rx = (w - 28) / 2;
    const ry = (h - 28) / 2;
    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeStyle = '#1e2530';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
