import * as THREE from 'three';

export interface ProceduralTextures {
  wheel: THREE.CanvasTexture;
  sideMolding: THREE.CanvasTexture;
  frontGrille: THREE.CanvasTexture;
  tail: THREE.CanvasTexture;
  asphaltTrack: THREE.CanvasTexture;
  curbPattern: THREE.CanvasTexture;
  slopeGrid: THREE.CanvasTexture;
  radiatorCore: THREE.CanvasTexture;
  batteryLabel: THREE.CanvasTexture;
  licensePlate: THREE.CanvasTexture;
  headlightLens: THREE.CanvasTexture;
}

export function generateCarTextures(): ProceduralTextures {
  // 1. Turbine Spoke Wheel Rim Texture (24 radial fins matching the 1992 Loyale)
  const canvasWheel = document.createElement('canvas');
  canvasWheel.width = 512;
  canvasWheel.height = 512;
  const ctxW = canvasWheel.getContext('2d')!;
  const cx = 256;
  const cy = 256;
  const rOuter = 236;
  const rHub = 82;

  // Outer alloy lip
  ctxW.fillStyle = '#b8c0c9';
  ctxW.beginPath();
  ctxW.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctxW.fill();

  // Dark recessed inner well
  ctxW.fillStyle = '#1c1e22';
  ctxW.beginPath();
  ctxW.arc(cx, cy, rOuter - 14, 0, Math.PI * 2);
  ctxW.fill();

  // 24 Radial turbine spokes
  ctxW.strokeStyle = '#e6edf2';
  ctxW.lineWidth = 6;
  for (let i = 0; i < 24; i++) {
    const ang = i * ((Math.PI * 2) / 24);
    ctxW.beginPath();
    ctxW.moveTo(cx + (rHub + 6) * Math.cos(ang), cy + (rHub + 6) * Math.sin(ang));
    ctxW.lineTo(cx + (rOuter - 16) * Math.cos(ang), cy + (rOuter - 16) * Math.sin(ang));
    ctxW.stroke();
  }

  // Center hub plate
  ctxW.fillStyle = '#d5dde4';
  ctxW.beginPath();
  ctxW.arc(cx, cy, rHub, 0, Math.PI * 2);
  ctxW.fill();

  ctxW.strokeStyle = '#8f9ba6';
  ctxW.lineWidth = 3;
  ctxW.stroke();

  // Center Subaru badge medallion
  ctxW.fillStyle = '#1d3c78';
  ctxW.beginPath();
  ctxW.arc(cx, cy, 32, 0, Math.PI * 2);
  ctxW.fill();

  // 4 Lug nuts (Subaru 4x140 PCD)
  for (let j = 0; j < 4; j++) {
    const a = j * (Math.PI / 2) + Math.PI / 4;
    const lx = cx + 56 * Math.cos(a);
    const ly = cy + 56 * Math.sin(a);
    ctxW.fillStyle = '#222222';
    ctxW.beginPath();
    ctxW.arc(lx, ly, 8, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.fillStyle = '#cbd5e1';
    ctxW.beginPath();
    ctxW.arc(lx, ly, 5, 0, Math.PI * 2);
    ctxW.fill();
  }

  const wheelTex = new THREE.CanvasTexture(canvasWheel);
  wheelTex.anisotropy = 4;

  // 2. Side Molding with "LOYALE" Badge
  const canvasSide = document.createElement('canvas');
  canvasSide.width = 1024;
  canvasSide.height = 128;
  const ctxS = canvasSide.getContext('2d')!;

  ctxS.fillStyle = '#141618';
  ctxS.fillRect(0, 20, 1024, 88);
  ctxS.fillStyle = '#2e3338';
  ctxS.fillRect(0, 20, 1024, 4); // upper highlight bevel

  // Chrome "LOYALE" lettering badge
  ctxS.fillStyle = '#e2e8f0';
  ctxS.font = 'bold 36px "Arial Black", "Helvetica Neue", sans-serif';
  ctxS.fillText('LOYALE', 220, 76);

  const sideMoldingTex = new THREE.CanvasTexture(canvasSide);

  // 3. Front Grille & Headlamp Texture
  const canvasGrille = document.createElement('canvas');
  canvasGrille.width = 1024;
  canvasGrille.height = 256;
  const ctxG = canvasGrille.getContext('2d')!;

  ctxG.fillStyle = '#181a1d';
  ctxG.fillRect(0, 0, 1024, 256);

  // Amber corner indicators
  ctxG.fillStyle = '#f59e0b';
  ctxG.fillRect(0, 30, 120, 196);
  ctxG.fillRect(1024 - 120, 30, 120, 196);

  // Rectangular Headlight reflectors
  ctxG.fillStyle = '#f8fafc';
  ctxG.fillRect(135, 36, 220, 184);
  ctxG.fillRect(1024 - 355, 36, 220, 184);

  // Headlight fluted glass ribs
  ctxG.fillStyle = '#cbd5e1';
  for (let k = 145; k < 345; k += 16) {
    ctxG.fillRect(k, 38, 5, 180);
    ctxG.fillRect(1024 - 355 + (k - 135), 38, 5, 180);
  }

  // Center Chrome Grille Slats
  ctxG.strokeStyle = '#94a3b8';
  ctxG.lineWidth = 6;
  for (let l = 60; l <= 200; l += 34) {
    ctxG.beginPath();
    ctxG.moveTo(380, l);
    ctxG.lineTo(644, l);
    ctxG.stroke();
  }

  // Center Subaru 6-star emblem box
  ctxG.fillStyle = '#1d3c78';
  ctxG.fillRect(482, 90, 60, 42);
  ctxG.strokeStyle = '#e2e8f0';
  ctxG.lineWidth = 3;
  ctxG.strokeRect(482, 90, 60, 42);
  ctxG.fillStyle = '#f8fafc';
  ctxG.font = 'bold 20px sans-serif';
  ctxG.fillText('★★★', 486, 120);

  const frontGrilleTex = new THREE.CanvasTexture(canvasGrille);

  // 4. Rear Taillight Cluster Texture (Amber/Red/White)
  const canvasTail = document.createElement('canvas');
  canvasTail.width = 512;
  canvasTail.height = 128;
  const ctxT = canvasTail.getContext('2d')!;
  ctxT.fillStyle = '#141517';
  ctxT.fillRect(0, 0, 512, 128);

  // Amber turn segment
  ctxT.fillStyle = '#ea580c';
  ctxT.fillRect(8, 10, 80, 108);

  // White reverse segment
  ctxT.fillStyle = '#e2e8f0';
  ctxT.fillRect(96, 10, 70, 108);

  // Red dual brake/tail light segment
  ctxT.fillStyle = '#b91c1c';
  ctxT.fillRect(174, 10, 328, 108);

  const tailTex = new THREE.CanvasTexture(canvasTail);

  // 5. Asphalt Proving Ground Texture
  const canvasTrack = document.createElement('canvas');
  canvasTrack.width = 512;
  canvasTrack.height = 512;
  const ctxTr = canvasTrack.getContext('2d')!;

  ctxTr.fillStyle = '#26292d';
  ctxTr.fillRect(0, 0, 512, 512);

  // Asphalt grain noise
  for (let n = 0; n < 3000; n++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const lum = 30 + Math.random() * 20;
    ctxTr.fillStyle = `rgb(${lum}, ${lum + 2}, ${lum + 4})`;
    ctxTr.fillRect(px, py, 2, 2);
  }

  // Grid line accents
  ctxTr.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctxTr.lineWidth = 1;
  for (let g = 0; g < 512; g += 64) {
    ctxTr.beginPath();
    ctxTr.moveTo(g, 0);
    ctxTr.lineTo(g, 512);
    ctxTr.stroke();
    ctxTr.beginPath();
    ctxTr.moveTo(0, g);
    ctxTr.lineTo(512, g);
    ctxTr.stroke();
  }

  const asphaltTrack = new THREE.CanvasTexture(canvasTrack);
  asphaltTrack.wrapS = THREE.RepeatWrapping;
  asphaltTrack.wrapT = THREE.RepeatWrapping;
  asphaltTrack.repeat.set(16, 16);

  // 6. Red and White Curb Pattern (for track curbs & slopes)
  const canvasCurb = document.createElement('canvas');
  canvasCurb.width = 256;
  canvasCurb.height = 64;
  const ctxC = canvasCurb.getContext('2d')!;
  for (let c = 0; c < 4; c++) {
    ctxC.fillStyle = c % 2 === 0 ? '#dc2626' : '#f8fafc';
    ctxC.fillRect(c * 64, 0, 64, 64);
  }
  const curbPattern = new THREE.CanvasTexture(canvasCurb);
  curbPattern.wrapS = THREE.RepeatWrapping;
  curbPattern.wrapT = THREE.RepeatWrapping;

  // 7. Slope & Terrain Grid Texture
  const canvasSlope = document.createElement('canvas');
  canvasSlope.width = 256;
  canvasSlope.height = 256;
  const ctxSl = canvasSlope.getContext('2d')!;
  ctxSl.fillStyle = '#1e293b';
  ctxSl.fillRect(0, 0, 256, 256);
  ctxSl.strokeStyle = '#38bdf8';
  ctxSl.lineWidth = 2;
  ctxSl.strokeRect(0, 0, 256, 256);
  ctxSl.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctxSl.lineWidth = 1;
  ctxSl.strokeRect(64, 64, 128, 128);

  const slopeGrid = new THREE.CanvasTexture(canvasSlope);
  slopeGrid.wrapS = THREE.RepeatWrapping;
  slopeGrid.wrapT = THREE.RepeatWrapping;
  slopeGrid.repeat.set(8, 8);

  // 8. Aluminum Radiator Core Fin Matrix Texture
  const canvasRad = document.createElement('canvas');
  canvasRad.width = 512;
  canvasRad.height = 256;
  const ctxR = canvasRad.getContext('2d')!;
  ctxR.fillStyle = '#1c1f24';
  ctxR.fillRect(0, 0, 512, 256);

  // Horizontal cooling tubes
  ctxR.fillStyle = '#6b7280';
  for (let y = 8; y < 256; y += 14) {
    ctxR.fillRect(0, y, 512, 4);
  }
  // Fine corrugated aluminum cooling louvers/fins
  ctxR.strokeStyle = '#4b5563';
  ctxR.lineWidth = 1;
  for (let x = 4; x < 512; x += 6) {
    ctxR.beginPath();
    ctxR.moveTo(x, 0);
    ctxR.lineTo(x, 256);
    ctxR.stroke();
  }
  const radiatorCore = new THREE.CanvasTexture(canvasRad);
  radiatorCore.anisotropy = 2;

  // 9. Automotive OEM 12V Battery Top Label
  const canvasBat = document.createElement('canvas');
  canvasBat.width = 256;
  canvasBat.height = 128;
  const ctxB = canvasBat.getContext('2d')!;
  ctxB.fillStyle = '#111315';
  ctxB.fillRect(0, 0, 256, 128);

  // Warning label banner
  ctxB.fillStyle = '#eab308';
  ctxB.fillRect(16, 12, 224, 24);
  ctxB.fillStyle = '#000000';
  ctxB.font = 'bold 12px monospace';
  ctxB.fillText('SUBARU OEM 12V 550CCA', 24, 28);

  // Battery info & specs
  ctxB.fillStyle = '#1e293b';
  ctxB.fillRect(16, 42, 224, 72);
  ctxB.fillStyle = '#94a3b8';
  ctxB.font = '10px sans-serif';
  ctxB.fillText('MAINTENANCE FREE', 24, 60);
  ctxB.fillText('CAUTION: EXPLOSIVE GASES', 24, 76);

  // Red + and Blue - markers
  ctxB.fillStyle = '#ef4444';
  ctxB.font = 'bold 22px monospace';
  ctxB.fillText('+', 210, 72);
  ctxB.fillStyle = '#3b82f6';
  ctxB.fillText('−', 32, 102);

  const batteryLabel = new THREE.CanvasTexture(canvasBat);

  // 10. Authentic Embossed License Plate ("D34D")
  const canvasPlate = document.createElement('canvas');
  canvasPlate.width = 512;
  canvasPlate.height = 256;
  const ctxP = canvasPlate.getContext('2d')!;

  // Background plate metal (cool retro pearl white with slight metallic sheen)
  const plateGrad = ctxP.createLinearGradient(0, 0, 0, 256);
  plateGrad.addColorStop(0, '#f1f5f9');
  plateGrad.addColorStop(0.5, '#ffffff');
  plateGrad.addColorStop(1, '#e2e8f0');
  ctxP.fillStyle = plateGrad;
  ctxP.roundRect ? ctxP.roundRect(16, 16, 480, 224, 24) : ctxP.fillRect(16, 16, 480, 224);
  ctxP.fill();

  // Outer stamped embossed rim border
  ctxP.strokeStyle = '#1e3a8a';
  ctxP.lineWidth = 10;
  ctxP.roundRect ? ctxP.roundRect(24, 24, 464, 208, 18) : ctxP.strokeRect(24, 24, 464, 208);
  ctxP.stroke();

  // Subtle stamped inner bevel highlight
  ctxP.strokeStyle = '#93c5fd';
  ctxP.lineWidth = 2;
  ctxP.roundRect ? ctxP.roundRect(28, 28, 456, 200, 15) : ctxP.strokeRect(28, 28, 456, 200);
  ctxP.stroke();

  // 4 Corner Mounting Holes with Bolt Screws
  const boltPositions = [
    [54, 54],
    [512 - 54, 54],
    [54, 256 - 54],
    [512 - 54, 256 - 54]
  ];
  boltPositions.forEach(([bx, by]) => {
    // Hole cutout
    ctxP.fillStyle = '#0f172a';
    ctxP.beginPath();
    ctxP.arc(bx, by, 10, 0, Math.PI * 2);
    ctxP.fill();
    // Stainless bolt & washer
    ctxP.fillStyle = '#94a3b8';
    ctxP.beginPath();
    ctxP.arc(bx, by, 7, 0, Math.PI * 2);
    ctxP.fill();
    ctxP.fillStyle = '#e2e8f0';
    ctxP.beginPath();
    ctxP.arc(bx, by, 4, 0, Math.PI * 2);
    ctxP.fill();
  });

  // Header State Banner / Brand
  ctxP.fillStyle = '#1e3a8a';
  ctxP.font = 'bold 28px "Arial Black", Impact, sans-serif';
  ctxP.textAlign = 'center';
  ctxP.fillText('S U B A R U', 256, 62);

  // Month & Year Registration Decals in corners
  ctxP.fillStyle = '#22c55e';
  ctxP.fillRect(78, 38, 44, 28);
  ctxP.fillStyle = '#ffffff';
  ctxP.font = 'bold 16px monospace';
  ctxP.fillText('09', 100, 58);

  ctxP.fillStyle = '#ef4444';
  ctxP.fillRect(512 - 122, 38, 44, 28);
  ctxP.fillStyle = '#ffffff';
  ctxP.font = 'bold 16px monospace';
  ctxP.fillText('92', 512 - 100, 58);

  // Stamped Main License Characters: "D34D"
  // Embossed shadow for stamped metallic press effect
  ctxP.fillStyle = '#93c5fd';
  ctxP.font = '900 120px "Arial Black", Impact, sans-serif';
  ctxP.fillText('D34D', 258, 172);

  // Main bold stamped blue ink
  ctxP.fillStyle = '#0f172a';
  ctxP.fillText('D34D', 256, 170);

  // Embossed specular top edge highlight
  ctxP.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctxP.font = '900 120px "Arial Black", Impact, sans-serif';
  ctxP.fillText('D34D', 255, 168);

  // Bottom Slogan
  ctxP.fillStyle = '#1e3a8a';
  ctxP.font = 'bold 20px "Arial Black", sans-serif';
  ctxP.fillText('• 4WD TURBO •', 256, 216);

  const licensePlateTex = new THREE.CanvasTexture(canvasPlate);
  licensePlateTex.anisotropy = 4;

  // 11. Headlight Optical Fluted Glass Lens Texture
  const canvasHead = document.createElement('canvas');
  canvasHead.width = 512;
  canvasHead.height = 256;
  const ctxH = canvasHead.getContext('2d')!;

  // Crystal reflector backing
  ctxH.fillStyle = '#f8fafc';
  ctxH.fillRect(0, 0, 512, 256);

  // Center parabolic circular dispersion Fresnel rings
  ctxH.strokeStyle = '#cbd5e1';
  ctxH.lineWidth = 4;
  for (let r = 20; r < 140; r += 20) {
    ctxH.beginPath();
    ctxH.arc(256, 128, r, 0, Math.PI * 2);
    ctxH.stroke();
  }

  // Vertical optical fluting ribs
  for (let fx = 12; fx < 512; fx += 16) {
    ctxH.strokeStyle = '#e2e8f0';
    ctxH.lineWidth = 6;
    ctxH.beginPath();
    ctxH.moveTo(fx, 0);
    ctxH.lineTo(fx, 256);
    ctxH.stroke();

    ctxH.strokeStyle = '#94a3b8';
    ctxH.lineWidth = 2;
    ctxH.beginPath();
    ctxH.moveTo(fx + 2, 0);
    ctxH.lineTo(fx + 2, 256);
    ctxH.stroke();
  }

  const headlightLensTex = new THREE.CanvasTexture(canvasHead);
  headlightLensTex.anisotropy = 4;

  return {
    wheel: wheelTex,
    sideMolding: sideMoldingTex,
    frontGrille: frontGrilleTex,
    tail: tailTex,
    asphaltTrack,
    curbPattern,
    slopeGrid,
    radiatorCore,
    batteryLabel,
    licensePlate: licensePlateTex,
    headlightLens: headlightLensTex
  };
}
