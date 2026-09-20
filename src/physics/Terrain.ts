import * as THREE from 'three';
import { ProceduralTextures } from '../utils/textures';

export interface TerrainPoint {
  height: number;
  normal: THREE.Vector3;
  surfaceType: 'asphalt' | 'slope' | 'curb' | 'dirt' | 'grass';
}

export class SandboxTerrain {
  // Slope parameters
  // Main Launch Hill: from z = -120 to z = -30
  // Peak at z <= -85, height = 15m
  // Incline transition between z = -85 and z = -30
  private static readonly HILL_Z_START = -30;
  private static readonly HILL_Z_PEAK = -85;
  private static readonly HILL_HEIGHT = 14.5;
  private static readonly HILL_WIDTH = 48;

  // Jump Ramp at z = 35 to 55, x = -15 to 15
  private static readonly RAMP_Z_START = 35;
  private static readonly RAMP_Z_END = 54;
  private static readonly RAMP_HEIGHT = 4.0;

  // Banked Turn around z = 80 to 140, x = 30 to 80
  // Washboard / Bumps section around x = -40 to -20, z = -10 to 30

  public static getHeight(x: number, z: number): number {
    let h = 0;

    // 1. Launch Hill & Slope (smooth cubic Hermite descent)
    if (z < SandboxTerrain.HILL_Z_START && z > -150) {
      const halfWidth = SandboxTerrain.HILL_WIDTH;
      // Width falloff (smooth bell curve on sides)
      let widthFactor = 1;
      const absX = Math.abs(x);
      if (absX > halfWidth - 8) {
        const tSide = Math.min(1, (absX - (halfWidth - 8)) / 16);
        widthFactor = 1 - (3 * tSide * tSide - 2 * tSide * tSide * tSide);
        if (widthFactor < 0) widthFactor = 0;
      }

      if (widthFactor > 0) {
        if (z <= SandboxTerrain.HILL_Z_PEAK) {
          // Plateau
          h += SandboxTerrain.HILL_HEIGHT * widthFactor;
        } else {
          // Smooth slope transition using smoothstep
          const t = (SandboxTerrain.HILL_Z_START - z) / (SandboxTerrain.HILL_Z_START - SandboxTerrain.HILL_Z_PEAK);
          const smoothT = t * t * (3 - 2 * t); // C1 continuous Hermite
          h += SandboxTerrain.HILL_HEIGHT * smoothT * widthFactor;
        }
      }
    }

    // 2. Launch Jump Ramp (x in [-7.5, 7.5], z in [35, 52])
    if (Math.abs(x) <= 8.0 && z >= SandboxTerrain.RAMP_Z_START && z <= SandboxTerrain.RAMP_Z_END) {
      const tRamp = (z - SandboxTerrain.RAMP_Z_START) / (SandboxTerrain.RAMP_Z_END - SandboxTerrain.RAMP_Z_START);
      let rampH = SandboxTerrain.RAMP_HEIGHT * (tRamp * tRamp);
      // Smooth side taper from 6.8 to 8.0m width
      const absX = Math.abs(x);
      if (absX > 6.8) {
        const sideT = (absX - 6.8) / 1.2;
        rampH *= (1 - sideT * sideT * (3 - 2 * sideT));
      }
      h += rampH;
    }

    // 3. Banked Curve (z in [70, 130], x in [20, 80]) - Smooth profile that blends to 0 at edges
    if (z >= 65 && z <= 135 && x >= 15 && x <= 85) {
      const cz = 100;
      const cx = 50;
      const dist = Math.hypot(x - cx, z - cz);
      if (dist >= 14 && dist <= 38) {
        const tBank = (dist - 14) / 24;
        const bankProfile = Math.sin(tBank * Math.PI); // Reaches 3.2m peak, 0 at both boundaries
        h += 3.2 * bankProfile;
      }
    }

    // 4. Suspension Washboard Bumps (x in [-42, -18], z in [-15, 30])
    if (x >= -42 && x <= -18 && z >= -15 && z <= 30) {
      const wave = Math.sin(z * 1.8) * Math.cos(x * 0.4);
      const edgeX = Math.sin(Math.min(1, Math.max(0, (x + 42) / 6)) * Math.PI * 0.5) *
                    Math.sin(Math.min(1, Math.max(0, ( -18 - x) / 6)) * Math.PI * 0.5);
      const edgeZ = Math.sin(Math.min(1, Math.max(0, (z + 15) / 6)) * Math.PI * 0.5) *
                    Math.sin(Math.min(1, Math.max(0, (30 - z) / 6)) * Math.PI * 0.5);
      h += 0.28 * wave * edgeX * edgeZ;
    }

    // Boundary containment lip around outer edge of 300x300 arena
    const rDist = Math.hypot(x, z);
    if (rDist > 120) {
      const tEdge = Math.min(1, (rDist - 120) / 30);
      h += 12 * (tEdge * tEdge);
    }

    return h;
  }

  public static getNormal(x: number, z: number): THREE.Vector3 {
    // Exact analytical normal on the jump ramp surface
    if (Math.abs(x) <= 6.8 && z >= SandboxTerrain.RAMP_Z_START && z <= SandboxTerrain.RAMP_Z_END) {
      const t = (z - SandboxTerrain.RAMP_Z_START) / (SandboxTerrain.RAMP_Z_END - SandboxTerrain.RAMP_Z_START);
      const dhdz = (2 * SandboxTerrain.RAMP_HEIGHT * t) / (SandboxTerrain.RAMP_Z_END - SandboxTerrain.RAMP_Z_START);
      // dhdz > 0 so normal component in Z is -dhdz < 0 (pointing backward/up)
      return new THREE.Vector3(0, 1, -dhdz).normalize();
    }

    const eps = 0.08;
    // Guard against finite difference crossing the ramp lip at z = RAMP_Z_END
    const zU = (z <= SandboxTerrain.RAMP_Z_END && z + eps > SandboxTerrain.RAMP_Z_END) ? SandboxTerrain.RAMP_Z_END : z + eps;
    const zD = (z > SandboxTerrain.RAMP_Z_END && z - eps <= SandboxTerrain.RAMP_Z_END) ? SandboxTerrain.RAMP_Z_END + 0.02 : z - eps;
    const dz = Math.max(0.01, zU - zD);

    const hL = SandboxTerrain.getHeight(x - eps, z);
    const hR = SandboxTerrain.getHeight(x + eps, z);
    const hD = SandboxTerrain.getHeight(x, zD);
    const hU = SandboxTerrain.getHeight(x, zU);

    const dhdx = (hR - hL) / (2 * eps);
    const dhdz = (hU - hD) / dz;

    const norm = new THREE.Vector3(-dhdx, 1, -dhdz);
    return norm.normalize();
  }

  public static getPoint(x: number, z: number): TerrainPoint {
    const height = SandboxTerrain.getHeight(x, z);
    const normal = SandboxTerrain.getNormal(x, z);

    let surfaceType: 'asphalt' | 'slope' | 'curb' | 'dirt' | 'grass' = 'asphalt';
    if (z < -30 && z > -90 && Math.abs(x) < 40) {
      surfaceType = 'slope';
    } else if (normal.y < 0.92) {
      surfaceType = 'curb';
    }

    return { height, normal, surfaceType };
  }

  public static createTerrainMesh(textures: ProceduralTextures): THREE.Group {
    const group = new THREE.Group();

    // 1. High-resolution terrain grid: 280m x 280m
    const width = 280;
    const depth = 280;
    const segsX = 140;
    const segsZ = 140;

    const geo = new THREE.PlaneGeometry(width, depth, segsX, segsZ);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = SandboxTerrain.getHeight(vx, vz);
      pos.setY(i, vy);

      // Color coding for visual clarity:
      // High slope = warning chevron / track surface
      // Ramp = racing red & white
      // Washboard = test grid
      // Asphalt track = clean charcoal
      const norm = SandboxTerrain.getNormal(vx, vz);
      const slopeAngle = 1 - norm.y; // 0 for flat, >0.1 for steep

      if (vz < -30 && vz > -85 && Math.abs(vx) < 25) {
        // Main launch slope: marked incline with warning contrast
        const checker = Math.floor(vz * 0.4) % 2 === 0 ? 0.18 : 0.22;
        colors[i * 3 + 0] = checker + 0.05;
        colors[i * 3 + 1] = checker + 0.08;
        colors[i * 3 + 2] = checker + 0.12;
      } else if (Math.abs(vx) < 7.5 && vz >= 35 && vz <= 52) {
        // Jump ramp
        colors[i * 3 + 0] = 0.85;
        colors[i * 3 + 1] = 0.25;
        colors[i * 3 + 2] = 0.25;
      } else if (slopeAngle > 0.08) {
        // Banking or natural slope
        colors[i * 3 + 0] = 0.22;
        colors[i * 3 + 1] = 0.28;
        colors[i * 3 + 2] = 0.32;
      } else if (Math.abs(vx) < 40 && Math.abs(vz) < 40) {
        // Main flat proving grounds
        colors[i * 3 + 0] = 0.15;
        colors[i * 3 + 1] = 0.17;
        colors[i * 3 + 2] = 0.19;
      } else {
        // Outer run-off terrain
        colors[i * 3 + 0] = 0.12;
        colors[i * 3 + 1] = 0.14;
        colors[i * 3 + 2] = 0.15;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: textures.asphaltTrack,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 2. Track Markings (Poles, Start/Finish Grid, Slalom Cones, Distance Signs)
    SandboxTerrain.addTrackDecorations(group);

    return group;
  }

  private static addTrackDecorations(group: THREE.Group) {
    // Starting Arch / Gantry atop the Launch Hill
    const gantryGroup = new THREE.Group();
    const hillTopY = SandboxTerrain.HILL_HEIGHT;
    gantryGroup.position.set(0, hillTopY, -75);

    // Left & Right truss columns
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.3 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });

    [-9, 9].forEach((gx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 8), trussMat);
      col.position.set(gx, 2.5, 0);
      col.castShadow = true;
      gantryGroup.add(col);
    });

    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.6, 0.6), trussMat);
    crossbeam.position.set(0, 5, 0);
    gantryGroup.add(crossbeam);

    // Banner board
    const banner = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.1), bannerMat);
    banner.position.set(0, 4.4, 0);
    gantryGroup.add(banner);

    group.add(gantryGroup);

    // Slope distance marker posts along the hill slope
    const postMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6);

    for (let z = -70; z <= -30; z += 10) {
      [-10, 10].forEach((px) => {
        const py = SandboxTerrain.getHeight(px, z);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, py + 0.7, z);
        post.castShadow = true;
        group.add(post);
      });
    }

    // Slalom Cones on the flat testing area
    const coneGeo = new THREE.ConeGeometry(0.24, 0.65, 8);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const coneWhiteGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.18, 8);
    const coneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    for (let i = 0; i < 8; i++) {
      const coneZ = -10 + i * 6;
      const coneX = Math.sin(i * 1.2) * 4;
      const coneY = SandboxTerrain.getHeight(coneX, coneZ);

      const coneGroup = new THREE.Group();
      coneGroup.position.set(coneX, coneY, coneZ);

      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 0.325;
      cone.castShadow = true;
      coneGroup.add(cone);

      const ring = new THREE.Mesh(coneWhiteGeo, coneWhiteMat);
      ring.position.y = 0.32;
      coneGroup.add(ring);

      group.add(coneGroup);
    }

    // Jump Ramp Solid Structure (matching exact analytical physics curvature)
    const rampGroup = new THREE.Group();
    const rampWidth = 14;
    const rampLength = SandboxTerrain.RAMP_Z_END - SandboxTerrain.RAMP_Z_START; // 17m
    const numSegs = 32;
    const rampGeo = new THREE.PlaneGeometry(rampWidth, rampLength, 1, numSegs);
    rampGeo.rotateX(-Math.PI / 2);
    const pos = rampGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const zLocal = pos.getZ(i); // ranges from -rampLength/2 to +rampLength/2
      const t = (zLocal + rampLength / 2) / rampLength;
      const y = SandboxTerrain.RAMP_HEIGHT * t * t;
      pos.setY(i, y + 0.02);
    }
    rampGeo.computeVertexNormals();
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x1f242c,
      roughness: 0.65,
      metalness: 0.1
    });
    const rampSurface = new THREE.Mesh(rampGeo, rampMat);
    rampSurface.position.set(0, 0, SandboxTerrain.RAMP_Z_START + rampLength / 2);
    rampSurface.receiveShadow = true;
    rampGroup.add(rampSurface);

    // Left and Right safety side barrier walls along ramp curve
    [-rampWidth / 2, rampWidth / 2].forEach(wallX => {
      for (let s = 0; s < numSegs; s++) {
        const t1 = s / numSegs;
        const t2 = (s + 1) / numSegs;
        const z1 = SandboxTerrain.RAMP_Z_START + t1 * rampLength;
        const z2 = SandboxTerrain.RAMP_Z_START + t2 * rampLength;
        const y1 = SandboxTerrain.RAMP_HEIGHT * t1 * t1;
        const y2 = SandboxTerrain.RAMP_HEIGHT * t2 * t2;
        const segLen = (z2 - z1) * 1.02;
        const avgY = (y1 + y2) / 2;
        const wallH = avgY + 0.45;
        const wallSeg = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, wallH, segLen),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 })
        );
        wallSeg.position.set(wallX, wallH / 2, (z1 + z2) / 2);
        rampGroup.add(wallSeg);
      }
    });

    // Jump Lip Yellow-Black Warning Bar
    const lipMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const lipMesh = new THREE.Mesh(new THREE.BoxGeometry(rampWidth + 0.5, 0.16, 0.35), lipMat);
    lipMesh.position.set(0, SandboxTerrain.RAMP_HEIGHT + 0.05, SandboxTerrain.RAMP_Z_END);
    rampGroup.add(lipMesh);

    group.add(rampGroup);
  }
}
