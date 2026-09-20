import * as THREE from 'three';
import { generateCarTextures, ProceduralTextures } from '../utils/textures';
import { DashboardCanvasManager } from '../utils/dashboardCanvas';
import { CarDoorState, TelemetryData } from '../types';

export class SubaruLoyaleModel {
  public group: THREE.Group;
  public textures: ProceduralTextures;
  public dashboardManager: DashboardCanvasManager;

  public colors = {
    bodyIceBlue: 0xe0ecf2,     // 1992 Loyale Glacier Frost / Ice Blue
    lowerRocker: 0xc3d8e5,     // Subtle 2-tone lower rocker panel
    bumperCharcoal: 0x1f2124,  // Rugged dark textured matte bumpers & trim
    trimStrip: 0x141618,       // Beltline molding with chrome Loyale badge
    glassUntinted: 0xecf4fb,   // Clear untinted automotive safety glass
    interiorDark: 0x24272c,    // Charcoal cabin interior
    interiorSeat: 0x3b414b,    // Fabric bucket seats with bolsters
    interiorAccent: 0x525b6a,  // Seat fabric center inserts
    headlightRefl: 0xeeeeee,   // Chrome headlight reflector
    turnAmber: 0xf59e0b,       // Amber turn signals
    tailRed: 0xdc2626,         // Ruby red brake/tail light lens
    tailRedBrake: 0xff1111,    // Bright red on brake
    wheelSpoke: 0xe6edf3,      // Turbine alloy wheel silver
    tireRubber: 0x1b1c1e       // Matte black rubber
  };

  public doors: Record<
    keyof CarDoorState,
    { pivot: THREE.Group | null; target: number; current: number; max: number }
  > = {
    frontLeft: { pivot: null, target: 0, current: 0, max: -1.05 },  // Opens OUTWARDS to the left
    frontRight: { pivot: null, target: 0, current: 0, max: 1.05 },   // Opens OUTWARDS to the right
    rearLeft: { pivot: null, target: 0, current: 0, max: -1.0 },    // Opens OUTWARDS to the left
    rearRight: { pivot: null, target: 0, current: 0, max: 1.0 },     // Opens OUTWARDS to the right
    hood: { pivot: null, target: 0, current: 0, max: -0.85 }, // Opens wide for engine inspection (~49°)
    trunk: { pivot: null, target: 0, current: 0, max: 0.75 }
  };

  public steeringAngle: number = 0;
  public wheelSpinSpeed: number = 0;
  public wheelRotation: number = 0;
  public headlightsOn: boolean = false;
  public brakeLightsOn: boolean = false;

  public wheelSteerNodes: THREE.Group[] = [];
  public wheelSpinNodes: THREE.Group[] = [];
  public wheelMeshes: THREE.Mesh[] = [];
  public headlightSpots: THREE.SpotLight[] = [];
  public interiorSteeringWheel: THREE.Mesh | null = null;
  private rearBrakeLight: THREE.PointLight | null = null;
  private headlightFlood: THREE.PointLight | null = null;
  private volumetricBeams: THREE.Mesh[] = [];
  public turboFlameMesh: THREE.Mesh | null = null;

  // Materials
  private matBody!: THREE.MeshStandardMaterial;
  private matLowerRocker!: THREE.MeshStandardMaterial;
  private matBumper!: THREE.MeshStandardMaterial;
  private matGlass!: THREE.MeshPhysicalMaterial;
  private matInterior!: THREE.MeshStandardMaterial;
  private matSeatBolster!: THREE.MeshStandardMaterial;
  private matSeatCenter!: THREE.MeshStandardMaterial;
  private matChrome!: THREE.MeshStandardMaterial;
  private matMirrorGlass!: THREE.MeshStandardMaterial;
  private matBrakeLight!: THREE.MeshStandardMaterial;
  private matLeftBlinker!: THREE.MeshStandardMaterial;
  private matRightBlinker!: THREE.MeshStandardMaterial;
  private matReverseLight!: THREE.MeshStandardMaterial;
  private matDashDisplay!: THREE.MeshBasicMaterial;
  private matCarpet!: THREE.MeshStandardMaterial;
  private matRubberMat!: THREE.MeshStandardMaterial;
  private matPedalPad!: THREE.MeshStandardMaterial;
  private matPedalArm!: THREE.MeshStandardMaterial;
  private matLicensePlate!: THREE.MeshStandardMaterial;
  private matHeadlightLens!: THREE.MeshStandardMaterial;

  // Engine & Engine Bay Materials
  private matEngineBlock!: THREE.MeshStandardMaterial;
  private matValveCover!: THREE.MeshStandardMaterial;
  private matIntakeAlloy!: THREE.MeshStandardMaterial;
  private matEngineBlackHose!: THREE.MeshStandardMaterial;
  private matSparkWire!: THREE.MeshStandardMaterial;
  private matPlasticTank!: THREE.MeshStandardMaterial;
  private matBatteryCase!: THREE.MeshStandardMaterial;
  private matBatteryTermRed!: THREE.MeshStandardMaterial;
  private matYellowAccent!: THREE.MeshStandardMaterial;
  private matCopper!: THREE.MeshStandardMaterial;
  private matExhaustHeader!: THREE.MeshStandardMaterial;
  private matRadiatorFin!: THREE.MeshStandardMaterial;
  private matBatteryLabel!: THREE.MeshStandardMaterial;
  private matEngineBayApron!: THREE.MeshStandardMaterial;

  private blinkTimer = 0;
  private blinkState = false;

  constructor() {
    this.group = new THREE.Group();
    this.textures = generateCarTextures();
    this.dashboardManager = new DashboardCanvasManager();

    this.initMaterials();
    this.buildChassis();
    this.buildDoors();
    this.buildHoodAndTrunk();
    this.buildEngine();
    this.buildInterior();
    this.buildWheels();
    this.buildExteriorDetails();

    this.group.position.y = 0;
  }

  private initMaterials() {
    this.matBody = new THREE.MeshStandardMaterial({
      color: this.colors.bodyIceBlue,
      roughness: 0.35,
      metalness: 0.18
    });

    this.matLowerRocker = new THREE.MeshStandardMaterial({
      color: this.colors.lowerRocker,
      roughness: 0.42,
      metalness: 0.12
    });

    this.matBumper = new THREE.MeshStandardMaterial({
      color: this.colors.bumperCharcoal,
      roughness: 0.75,
      metalness: 0.05
    });

    // Untinted clear automotive safety glass: allows clear visibility of driver and interior
    this.matGlass = new THREE.MeshPhysicalMaterial({
      color: this.colors.glassUntinted,
      roughness: 0.04,
      metalness: 0.05,
      transmission: 0.94,
      transparent: true,
      opacity: 0.24,
      reflectivity: 0.65,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.matInterior = new THREE.MeshStandardMaterial({
      color: this.colors.interiorDark,
      roughness: 0.85
    });

    this.matSeatBolster = new THREE.MeshStandardMaterial({
      color: this.colors.interiorSeat,
      roughness: 0.9
    });

    this.matSeatCenter = new THREE.MeshStandardMaterial({
      color: this.colors.interiorAccent,
      roughness: 0.88
    });

    this.matChrome = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.1
    });

    this.matMirrorGlass = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.04
    });

    // Taillight discrete materials
    this.matBrakeLight = new THREE.MeshStandardMaterial({
      color: this.colors.tailRed,
      roughness: 0.2,
      emissive: 0x330505,
      emissiveIntensity: 0.4
    });

    this.matLeftBlinker = new THREE.MeshStandardMaterial({
      color: this.colors.turnAmber,
      roughness: 0.25,
      emissive: 0x000000,
      emissiveIntensity: 0
    });

    this.matRightBlinker = new THREE.MeshStandardMaterial({
      color: this.colors.turnAmber,
      roughness: 0.25,
      emissive: 0x000000,
      emissiveIntensity: 0
    });

    this.matReverseLight = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25
    });

    // Live In-Car Dashboard Cluster Material
    this.matDashDisplay = new THREE.MeshBasicMaterial({
      map: this.dashboardManager.texture,
      toneMapped: false
    });

    // Cabin plush carpet
    this.matCarpet = new THREE.MeshStandardMaterial({
      color: 0x22262e, // Subaru dark slate cabin carpet
      roughness: 0.98,
      metalness: 0.02
    });

    // All-weather ribbed rubber floor mat
    this.matRubberMat = new THREE.MeshStandardMaterial({
      color: 0x14171c,
      roughness: 0.88,
      metalness: 0.05
    });

    // High-friction rubber pedal pad
    this.matPedalPad = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.92,
      metalness: 0.08
    });

    // Steel pedal arms and seat runners
    this.matPedalArm = new THREE.MeshStandardMaterial({
      color: 0x333842,
      roughness: 0.45,
      metalness: 0.75
    });

    // Engine & Underhood Materials
    this.matEngineBlock = new THREE.MeshStandardMaterial({
      color: 0x4a5563, // Cast iron/aluminum EA82 engine block
      roughness: 0.65,
      metalness: 0.48
    });

    this.matValveCover = new THREE.MeshStandardMaterial({
      color: 0x2e343b, // Dark textured aluminum Boxer valve cover
      roughness: 0.42,
      metalness: 0.58
    });

    this.matIntakeAlloy = new THREE.MeshStandardMaterial({
      color: 0xa1a8b3, // Cast raw aluminum intake runners & alternator housing
      roughness: 0.35,
      metalness: 0.7
    });

    this.matEngineBlackHose = new THREE.MeshStandardMaterial({
      color: 0x161719, // Matte vulcanized rubber radiator hose / intake duct
      roughness: 0.94,
      metalness: 0.04
    });

    this.matSparkWire = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // High-performance 8mm blue silicone ignition leads
      roughness: 0.32,
      metalness: 0.15
    });

    this.matPlasticTank = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6, // Translucent coolant & washer fluid tanks
      roughness: 0.38,
      metalness: 0.04,
      transparent: true,
      opacity: 0.84
    });

    this.matBatteryCase = new THREE.MeshStandardMaterial({
      color: 0x17191d, // Heavy-duty polypropylene battery casing
      roughness: 0.82,
      metalness: 0.08
    });

    this.matBatteryTermRed = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Positive terminal red clamp cover
      roughness: 0.4,
      metalness: 0.2
    });

    this.matYellowAccent = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Dipstick loop, oil cap, radiator warning, washer cap
      roughness: 0.35,
      metalness: 0.1
    });

    this.matCopper = new THREE.MeshStandardMaterial({
      color: 0xc2410c, // Alternator copper stator windings
      roughness: 0.35,
      metalness: 0.85
    });

    this.matExhaustHeader = new THREE.MeshStandardMaterial({
      color: 0x483a31, // Heat-tempered bronze/steel exhaust manifold
      roughness: 0.7,
      metalness: 0.65
    });

    this.matRadiatorFin = new THREE.MeshStandardMaterial({
      map: this.textures.radiatorCore,
      roughness: 0.5,
      metalness: 0.62
    });

    this.matBatteryLabel = new THREE.MeshStandardMaterial({
      map: this.textures.batteryLabel,
      roughness: 0.52
    });

    this.matEngineBayApron = new THREE.MeshStandardMaterial({
      color: 0xbfd3e1, // Unibody inner sheet metal painted in body tone
      roughness: 0.58,
      metalness: 0.18
    });
  }

  // Precision 3D Structural Bar Extrusion helper connecting point A to point B
  private createOrientedBar(
    a: THREE.Vector3,
    b: THREE.Vector3,
    thickX = 0.032,
    thickY = 0.026,
    material: THREE.Material = this.matBumper
  ): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const geo = new THREE.BoxGeometry(thickX, thickY, len);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    mesh.castShadow = true;
    return mesh;
  }

  private buildChassis() {
    const bodyRoot = new THREE.Group();

    // 1. Hollow Engine Bay Unibody Frame Rails & Lower Subframe Cradle
    // Left & Right Front Longitudinal Frame Rails (from firewall Z = 0.72 to core support Z = 2.06)
    [-0.46, 0.46].forEach((rx) => {
      const railGeo = new THREE.BoxGeometry(0.10, 0.10, 1.34);
      const railMesh = new THREE.Mesh(railGeo, this.matBumper);
      railMesh.position.set(rx, 0.25, 1.39);
      railMesh.castShadow = true;
      bodyRoot.add(railMesh);
    });

    // Lower Engine Cradle K-Member Crossmember (supporting engine mounts under crankcase)
    const engineCradleGeo = new THREE.BoxGeometry(0.86, 0.08, 0.22);
    const engineCradle = new THREE.Mesh(engineCradleGeo, this.matBumper);
    engineCradle.position.set(0, 0.22, 1.24);
    engineCradle.castShadow = true;
    bodyRoot.add(engineCradle);

    // Engine Under-Skid Splash Shield (protecting steering rack and lower pulley at Y = 0.18)
    const engineShieldGeo = new THREE.BoxGeometry(0.86, 0.02, 0.52);
    const engineShield = new THREE.Mesh(engineShieldGeo, this.matBumper);
    engineShield.position.set(0, 0.18, 1.60);
    engineShield.castShadow = true;
    bodyRoot.add(engineShield);

    // 2. Rear Trunk Floor & Fuel Tank Pan (from rear bulkhead Z = -1.22 to rear bumper Z = -2.12)
    const rearTrunkFloorGeo = new THREE.BoxGeometry(1.62, 0.16, 0.90);
    const rearTrunkFloor = new THREE.Mesh(rearTrunkFloorGeo, this.matBumper);
    rearTrunkFloor.position.set(0, 0.30, -1.67);
    rearTrunkFloor.castShadow = true;
    bodyRoot.add(rearTrunkFloor);

    // 3. Left & Right Structural Outer Sill Boxes (Z = -1.22 to +0.70)
    [-0.75, 0.75].forEach((sx) => {
      const sillGeo = new THREE.BoxGeometry(0.16, 0.16, 1.92);
      const sill = new THREE.Mesh(sillGeo, this.matBumper);
      sill.position.set(sx, 0.26, -0.26);
      sill.castShadow = true;
      bodyRoot.add(sill);
    });

    // 4. Exterior Lower Rocker Panels (running between wheel wells)
    const rockerGeo = new THREE.BoxGeometry(1.67, 0.16, 1.92);
    const rockerMesh = new THREE.Mesh(rockerGeo, this.matLowerRocker);
    rockerMesh.position.set(0, 0.34, -0.26);
    bodyRoot.add(rockerMesh);

    // 5. Exterior Protective Underside Belly Pan (protecting cabin underside at Y = 0.17)
    const bellyGeo = new THREE.BoxGeometry(1.48, 0.02, 1.92);
    const bellyMesh = new THREE.Mesh(bellyGeo, this.matBumper);
    bellyMesh.position.set(0, 0.17, -0.26);
    bellyMesh.castShadow = true;
    bodyRoot.add(bellyMesh);

    // 6. Hollow Engine Bay Architecture & Outer Front Fenders
    // Left & Right Outer Front Fenders (spanning from cowl Z = 0.70 to front bumper Z = 2.12)
    [-1, 1].forEach((xSide) => {
      const sx = xSide * 0.77;
      // Outer curved fender skin
      const fenderGeo = new THREE.BoxGeometry(0.12, 0.44, 1.42);
      const fenderMesh = new THREE.Mesh(fenderGeo, this.matBody);
      fenderMesh.position.set(sx, 0.60, 1.41);
      fenderMesh.castShadow = true;
      bodyRoot.add(fenderMesh);

      // Fender top mating gutter / rain trough for hood shutline (Y = 0.81)
      const gutterGeo = new THREE.BoxGeometry(0.08, 0.02, 1.38);
      const gutterMesh = new THREE.Mesh(gutterGeo, this.matEngineBayApron);
      gutterMesh.position.set(xSide * 0.71, 0.81, 1.41);
      bodyRoot.add(gutterMesh);

      // Rubber hood resting cushions
      [1.05, 1.85].forEach((bz) => {
        const stopGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.015, 8);
        const stopMesh = new THREE.Mesh(stopGeo, this.matBumper);
        stopMesh.position.set(xSide * 0.70, 0.825, bz);
        bodyRoot.add(stopMesh);
      });

      // Inner fender apron stamping wall (forming engine compartment side wall)
      const apronGeo = new THREE.BoxGeometry(0.02, 0.48, 1.38);
      const apronMesh = new THREE.Mesh(apronGeo, this.matEngineBayApron);
      apronMesh.position.set(xSide * 0.65, 0.57, 1.41);
      apronMesh.castShadow = true;
      bodyRoot.add(apronMesh);

      // Wheel well inner arch tub covering front tire (Z = 1.24, Y = 0.46)
      const wheelTubGeo = new THREE.BoxGeometry(0.16, 0.24, 0.76);
      const wheelTub = new THREE.Mesh(wheelTubGeo, this.matBumper);
      wheelTub.position.set(xSide * 0.72, 0.46, 1.24);
      bodyRoot.add(wheelTub);

      // Front Strut / Shock Tower (conical stamping rising from inner apron)
      const strutTowerGeo = new THREE.CylinderGeometry(0.10, 0.13, 0.24, 12);
      const strutTower = new THREE.Mesh(strutTowerGeo, this.matEngineBayApron);
      strutTower.position.set(xSide * 0.52, 0.64, 1.24);
      strutTower.castShadow = true;
      bodyRoot.add(strutTower);

      // Strut top mount reinforcement plate with center nut & 3 perimeter studs
      const topPlateGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.015, 12);
      const topPlate = new THREE.Mesh(topPlateGeo, this.matPedalArm);
      topPlate.position.set(xSide * 0.52, 0.765, 1.24);
      bodyRoot.add(topPlate);

      const centerNutGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.02, 6);
      const centerNut = new THREE.Mesh(centerNutGeo, this.matChrome);
      centerNut.position.set(xSide * 0.52, 0.78, 1.24);
      bodyRoot.add(centerNut);

      for (let s = 0; s < 3; s++) {
        const ang = s * ((Math.PI * 2) / 3);
        const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.016, 6);
        const bolt = new THREE.Mesh(boltGeo, this.matChrome);
        bolt.position.set(
          xSide * 0.52 + Math.cos(ang) * 0.065,
          0.778,
          1.24 + Math.sin(ang) * 0.065
        );
        bodyRoot.add(bolt);
      }
    });

    // Front Core Support (Radiator Support Header & Slam Panel at Z = 2.06)
    // Upper radiator support crossmember / slam panel
    const coreUpperGeo = new THREE.BoxGeometry(1.34, 0.04, 0.08);
    const coreUpper = new THREE.Mesh(coreUpperGeo, this.matEngineBayApron);
    coreUpper.position.set(0, 0.79, 2.06);
    coreUpper.castShadow = true;
    bodyRoot.add(coreUpper);

    // Center hood latch lock mechanism & safety catch hook
    const latchGeo = new THREE.BoxGeometry(0.12, 0.07, 0.06);
    const latchMesh = new THREE.Mesh(latchGeo, this.matBumper);
    latchMesh.position.set(0, 0.78, 2.08);
    bodyRoot.add(latchMesh);

    // Lower radiator core support crossmember
    const coreLowerGeo = new THREE.BoxGeometry(1.34, 0.06, 0.08);
    const coreLower = new THREE.Mesh(coreLowerGeo, this.matBumper);
    coreLower.position.set(0, 0.25, 2.06);
    bodyRoot.add(coreLower);

    // Left and Right vertical core support upright posts
    [-0.44, 0.44].forEach((ux) => {
      const postGeo = new THREE.BoxGeometry(0.06, 0.50, 0.06);
      const postMesh = new THREE.Mesh(postGeo, this.matEngineBayApron);
      postMesh.position.set(ux, 0.52, 2.06);
      bodyRoot.add(postMesh);
    });

    // Rear Trunk Quarter Panels (from rear door shutline Z = -1.22 over rear wheel to bumper Z = -2.12)
    const rearQuarterGeo = new THREE.BoxGeometry(1.66, 0.42, 0.90);
    const rearQuarterMesh = new THREE.Mesh(rearQuarterGeo, this.matBody);
    rearQuarterMesh.position.set(0, 0.64, -1.67);
    rearQuarterMesh.castShadow = true;
    bodyRoot.add(rearQuarterMesh);

    // Aerodynamic Sculpted Roof (spans from front header Z = +0.42 to rear header Z = -0.88, height Y = 1.38)
    const roofGeo = new THREE.BoxGeometry(1.36, 0.04, 1.30);
    const roofMesh = new THREE.Mesh(roofGeo, this.matBody);
    roofMesh.position.set(0, 1.38, -0.23);
    roofMesh.castShadow = true;
    bodyRoot.add(roofMesh);

    // Loyale Factory Roof Drip Moldings / Trim Rails (running along left & right roof edges)
    [-0.68, 0.68].forEach((rx) => {
      const railGeo = new THREE.BoxGeometry(0.026, 0.026, 1.30);
      const rail = new THREE.Mesh(railGeo, this.matBumper);
      rail.position.set(rx, 1.40, -0.23);
      bodyRoot.add(rail);
    });

    // 1. Precision Sloped A-Pillars (Left & Right)
    // Seamlessly rakes backward from cowl beltline (Y = 0.83, Z = 0.70) to roof front header (Y = 1.38, Z = 0.42)
    [-1, 1].forEach((xSide) => {
      const pCowl = new THREE.Vector3(xSide * 0.78, 0.83, 0.70);
      const pRoof = new THREE.Vector3(xSide * 0.68, 1.38, 0.42);
      const aPillar = this.createOrientedBar(pCowl, pRoof, 0.052, 0.044, this.matBody);
      bodyRoot.add(aPillar);
    });

    // 2. Center B-Pillars (Vertical division between front and rear doors at Z = -0.18)
    [-1, 1].forEach((xSide) => {
      const pBelt = new THREE.Vector3(xSide * 0.79, 0.83, -0.18);
      const pRoof = new THREE.Vector3(xSide * 0.68, 1.38, -0.18);
      const bPillar = this.createOrientedBar(pBelt, pRoof, 0.044, 0.065, this.matBumper);
      bodyRoot.add(bPillar);
    });

    // 3. Precision Sloped C-Pillars & Aerodynamic Sail Panels (Left & Right)
    // Connects roof rear header (Y = 1.38, Z = -0.88) to rear door shutline over rear wheel (Y = 0.83, Z = -1.22) and rear deck (Y = 0.83, Z = -1.35)
    [-1, 1].forEach((xSide) => {
      const pRoof = new THREE.Vector3(xSide * 0.68, 1.38, -0.88);
      const pDoorBelt = new THREE.Vector3(xSide * 0.79, 0.83, -1.22);
      const pDeckCorner = new THREE.Vector3(xSide * 0.77, 0.83, -1.35);

      // Main structural diagonal post framing back window
      const cPillarBar = this.createOrientedBar(pDeckCorner, pRoof, 0.062, 0.046, this.matBody);
      bodyRoot.add(cPillarBar);

      // Aerodynamic C-pillar outer sail panel sheet (perfectly flush, zero protruding vertices)
      const sailGeo = new THREE.BufferGeometry();
      const sailPos = new Float32Array([
        pRoof.x, pRoof.y, pRoof.z,
        pDoorBelt.x, pDoorBelt.y, pDoorBelt.z,
        pDeckCorner.x, pDeckCorner.y, pDeckCorner.z,

        // Reverse face
        pRoof.x, pRoof.y, pRoof.z,
        pDeckCorner.x, pDeckCorner.y, pDeckCorner.z,
        pDoorBelt.x, pDoorBelt.y, pDoorBelt.z,
      ]);
      sailGeo.setAttribute('position', new THREE.BufferAttribute(sailPos, 3));
      sailGeo.computeVertexNormals();
      const sailMesh = new THREE.Mesh(sailGeo, this.matBody);
      sailMesh.castShadow = true;
      bodyRoot.add(sailMesh);
    });

    // 4. Front Windscreen (Windshield)
    // Spans from cowl (Y = 0.83, Z = 0.70) to roof front header (Y = 1.38, Z = 0.42)
    const windTL = new THREE.Vector3(-0.68, 1.378, 0.422);
    const windTR = new THREE.Vector3(0.68, 1.378, 0.422);
    const windBR = new THREE.Vector3(0.77, 0.832, 0.70);
    const windBL = new THREE.Vector3(-0.77, 0.832, 0.70);

    const windGeo = new THREE.BufferGeometry();
    const windPos = new Float32Array([
      windBL.x, windBL.y, windBL.z,
      windBR.x, windBR.y, windBR.z,
      windTR.x, windTR.y, windTR.z,

      windBL.x, windBL.y, windBL.z,
      windTR.x, windTR.y, windTR.z,
      windTL.x, windTL.y, windTL.z,

      // Reverse winding for two-sided interior/exterior visibility
      windBL.x, windBL.y, windBL.z,
      windTR.x, windTR.y, windTR.z,
      windBR.x, windBR.y, windBR.z,

      windBL.x, windBL.y, windBL.z,
      windTL.x, windTL.y, windTL.z,
      windTR.x, windTR.y, windTR.z,
    ]);
    windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
    windGeo.computeVertexNormals();
    const windshield = new THREE.Mesh(windGeo, this.matGlass);
    bodyRoot.add(windshield);

    // Windshield perimeter rubber weatherstrip trim
    bodyRoot.add(this.createOrientedBar(windTL, windTR, 0.024, 0.02, this.matBumper)); // Roof cowl header
    bodyRoot.add(this.createOrientedBar(windBL, windBR, 0.024, 0.02, this.matBumper)); // Lower cowl sill
    bodyRoot.add(this.createOrientedBar(windTL, windBL, 0.024, 0.02, this.matBumper)); // Right A-pillar inner trim
    bodyRoot.add(this.createOrientedBar(windTR, windBR, 0.024, 0.02, this.matBumper)); // Left A-pillar inner trim

    // 5. Back Window (Rear Windscreen)
    // Spans from roof rear header (Y = 1.38, Z = -0.88) to trunk deck (Y = 0.83, Z = -1.35)
    const rearTL = new THREE.Vector3(-0.68, 1.378, -0.88);
    const rearTR = new THREE.Vector3(0.68, 1.378, -0.88);
    const rearBR = new THREE.Vector3(0.76, 0.832, -1.35);
    const rearBL = new THREE.Vector3(-0.76, 0.832, -1.35);

    const rearWindGeo = new THREE.BufferGeometry();
    const rearWindPos = new Float32Array([
      rearBL.x, rearBL.y, rearBL.z,
      rearBR.x, rearBR.y, rearBR.z,
      rearTR.x, rearTR.y, rearTR.z,

      rearBL.x, rearBL.y, rearBL.z,
      rearTR.x, rearTR.y, rearTR.z,
      rearTL.x, rearTL.y, rearTL.z,

      // Reverse winding for two-sided interior/exterior visibility
      rearBL.x, rearBL.y, rearBL.z,
      rearTR.x, rearTR.y, rearTR.z,
      rearBR.x, rearBR.y, rearBR.z,

      rearBL.x, rearBL.y, rearBL.z,
      rearTL.x, rearTL.y, rearTL.z,
      rearTR.x, rearTR.y, rearTR.z,
    ]);
    rearWindGeo.setAttribute('position', new THREE.BufferAttribute(rearWindPos, 3));
    rearWindGeo.computeVertexNormals();
    const rearWind = new THREE.Mesh(rearWindGeo, this.matGlass);
    bodyRoot.add(rearWind);

    // Back window perimeter rubber weatherstrip trim
    bodyRoot.add(this.createOrientedBar(rearTL, rearTR, 0.024, 0.02, this.matBumper)); // Roof rear header
    bodyRoot.add(this.createOrientedBar(rearBL, rearBR, 0.024, 0.02, this.matBumper)); // Trunk deck sill
    bodyRoot.add(this.createOrientedBar(rearTL, rearBL, 0.024, 0.02, this.matBumper)); // Right C-pillar inner trim
    bodyRoot.add(this.createOrientedBar(rearTR, rearBR, 0.024, 0.02, this.matBumper)); // Left C-pillar inner trim

    this.group.add(bodyRoot);
  }

  private buildDoors() {
    const createDoor = (isLeft: boolean, isRear: boolean) => {
      const doorPivot = new THREE.Group();
      const doorMeshGroup = new THREE.Group();

      const xSide = isLeft ? 1 : -1;
      const doorLen = isRear ? 1.04 : 0.88;
      const doorZCenter = -doorLen / 2;

      // 1. Aerodynamic Sculpted Outer Door Skin
      // Multi-profile bodywork with tumblehome curvature, swage line, and lower inward tuck
      const skinUpperGeo = new THREE.BoxGeometry(0.055, 0.22, doorLen);
      const skinUpper = new THREE.Mesh(skinUpperGeo, this.matBody);
      skinUpper.position.set(0.01 * xSide, 0.12, doorZCenter);
      skinUpper.rotation.z = -0.06 * xSide; // Slight tumblehome slope toward window sill
      skinUpper.castShadow = true;
      doorMeshGroup.add(skinUpper);

      if (!isRear) {
        // Front Door Lower Skin
        const skinLowerGeo = new THREE.BoxGeometry(0.06, 0.26, doorLen);
        const skinLower = new THREE.Mesh(skinLowerGeo, this.matBody);
        skinLower.position.set(0, -0.12, doorZCenter);
        skinLower.castShadow = true;
        doorMeshGroup.add(skinLower);
      } else {
        // Rear Door Lower Skin with Authentic Wheel-Arch Cutout (Dogleg)
        // Stops before the rear tire (Z = -0.74 in local space, Z = -0.92 in world space)
        const skinLowerFrontGeo = new THREE.BoxGeometry(0.06, 0.26, 0.74);
        const skinLowerFront = new THREE.Mesh(skinLowerFrontGeo, this.matBody);
        skinLowerFront.position.set(0, -0.12, -0.37);
        skinLowerFront.castShadow = true;
        doorMeshGroup.add(skinLowerFront);

        // Rear Dogleg sheet matching the contour over the rear wheel arch
        const doglegGeo = new THREE.BufferGeometry();
        const xThick = 0.03 * xSide;
        const doglegPos = new Float32Array([
          0, 0.01, -0.74,
          xThick, 0.01, -1.04,
          0, -0.25, -0.74,

          0, -0.25, -0.74,
          xThick, 0.01, -1.04,
          xThick, -0.08, -1.04,

          // Reverse face
          0, 0.01, -0.74,
          0, -0.25, -0.74,
          xThick, 0.01, -1.04,

          0, -0.25, -0.74,
          xThick, -0.08, -1.04,
          xThick, 0.01, -1.04,
        ]);
        doglegGeo.setAttribute('position', new THREE.BufferAttribute(doglegPos, 3));
        doglegGeo.computeVertexNormals();
        const doglegMesh = new THREE.Mesh(doglegGeo, this.matBody);
        doglegMesh.castShadow = true;
        doorMeshGroup.add(doglegMesh);
      }

      // Side Protective Molding Strip with "LOYALE" Badge
      const stripGeo = new THREE.BoxGeometry(0.075, 0.10, doorLen);
      const stripMat = new THREE.MeshStandardMaterial({
        map: this.textures.sideMolding,
        roughness: 0.8
      });
      const stripMesh = new THREE.Mesh(stripGeo, stripMat);
      stripMesh.position.set(0.005 * xSide, 0.05, doorZCenter);
      doorMeshGroup.add(stripMesh);

      // 2. Aerodynamic Window Frame & Untinted Glass
      let P0: THREE.Vector3;
      let P1: THREE.Vector3;
      let P2: THREE.Vector3;
      let P3: THREE.Vector3;

      if (!isRear) {
        // FRONT DOOR:
        // Hinge at (0.81 * xSide, 0.60, 0.70)
        // P0: A-pillar base at cowl (world: 0.79 * xSide, 0.83, 0.70) -> local (-0.02 * xSide, 0.23, 0.00)
        P0 = new THREE.Vector3(-0.02 * xSide, 0.23, 0.00);
        // P1: A-pillar header at roofline (world: 0.68 * xSide, 1.38, 0.42) -> local (-0.13 * xSide, 0.78, -0.28)
        P1 = new THREE.Vector3(-0.13 * xSide, 0.78, -0.28);
        // P2: B-pillar header at roofline (world: 0.68 * xSide, 1.38, -0.18) -> local (-0.13 * xSide, 0.78, -0.88)
        P2 = new THREE.Vector3(-0.13 * xSide, 0.78, -0.88);
        // P3: B-pillar base at beltline (world: 0.79 * xSide, 0.83, -0.18) -> local (-0.02 * xSide, 0.23, -0.88)
        P3 = new THREE.Vector3(-0.02 * xSide, 0.23, -0.88);
      } else {
        // REAR DOOR:
        // Hinge at (0.81 * xSide, 0.60, -0.18)
        // P0: B-pillar base at beltline (world: 0.79 * xSide, 0.83, -0.18) -> local (-0.02 * xSide, 0.23, 0.00)
        P0 = new THREE.Vector3(-0.02 * xSide, 0.23, 0.00);
        // P1: B-pillar header at roofline (world: 0.68 * xSide, 1.38, -0.18) -> local (-0.13 * xSide, 0.78, 0.00)
        P1 = new THREE.Vector3(-0.13 * xSide, 0.78, 0.00);
        // P2: C-pillar header at roofline (world: 0.68 * xSide, 1.38, -0.88) -> local (-0.13 * xSide, 0.78, -0.70)
        P2 = new THREE.Vector3(-0.13 * xSide, 0.78, -0.70);
        // P3: C-pillar base at beltline ending over rear wheel (world: 0.79 * xSide, 0.83, -1.22) -> local (-0.02 * xSide, 0.23, -1.04)
        P3 = new THREE.Vector3(-0.02 * xSide, 0.23, -1.04);
      }

      // Untinted Double-Sided Window Glass Pane
      const glassGeo = new THREE.BufferGeometry();
      const glassPositions = new Float32Array([
        // Front-facing winding
        P0.x, P0.y, P0.z,
        P1.x, P1.y, P1.z,
        P2.x, P2.y, P2.z,

        P0.x, P0.y, P0.z,
        P2.x, P2.y, P2.z,
        P3.x, P3.y, P3.z,

        // Reverse winding for two-sided visibility from interior/exterior
        P0.x, P0.y, P0.z,
        P2.x, P2.y, P2.z,
        P1.x, P1.y, P1.z,

        P0.x, P0.y, P0.z,
        P3.x, P3.y, P3.z,
        P2.x, P2.y, P2.z,
      ]);
      glassGeo.setAttribute('position', new THREE.BufferAttribute(glassPositions, 3));
      glassGeo.computeVertexNormals();
      const glassMesh = new THREE.Mesh(glassGeo, this.matGlass);
      doorMeshGroup.add(glassMesh);

      // Sleek Aerodynamic Window Frame Trim Bars (attached to doorMeshGroup)
      doorMeshGroup.add(this.createOrientedBar(P0, P1, 0.032, 0.026, this.matBumper)); // Forward pillar sash
      doorMeshGroup.add(this.createOrientedBar(P1, P2, 0.032, 0.026, this.matBumper)); // Upper roofline sash
      doorMeshGroup.add(this.createOrientedBar(P2, P3, 0.032, 0.026, this.matBumper)); // Rear pillar sash
      doorMeshGroup.add(this.createOrientedBar(P3, P0, 0.032, 0.024, this.matBumper)); // Beltline weatherstrip sill

      // Authentic Subaru Loyale rear door quarter vent division bar
      if (isRear) {
        const divTop = new THREE.Vector3(-0.13 * xSide, 0.78, -0.68);
        const divBot = new THREE.Vector3(-0.02 * xSide, 0.23, -0.68);
        doorMeshGroup.add(this.createOrientedBar(divTop, divBot, 0.026, 0.022, this.matBumper));
      }

      // 3. Ergonomic Aerodynamic Door Handle
      const handleRecessGeo = new THREE.BoxGeometry(0.01, 0.05, 0.16);
      const handleRecess = new THREE.Mesh(handleRecessGeo, this.matBumper);
      const handleZ = isRear ? -0.86 : -0.64;
      handleRecess.position.set(0.032 * xSide, 0.14, handleZ);
      doorMeshGroup.add(handleRecess);

      const handleBarGeo = new THREE.BoxGeometry(0.02, 0.03, 0.12);
      const handleBar = new THREE.Mesh(handleBarGeo, this.matChrome);
      handleBar.position.set(0.042 * xSide, 0.14, handleZ);
      doorMeshGroup.add(handleBar);

      // 4. Aerodynamic Streamlined Side Mirrors (on front doors)
      if (!isRear) {
        const mirrorArmGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.10, 8);
        const mirrorArm = new THREE.Mesh(mirrorArmGeo, this.matBumper);
        mirrorArm.position.set(0.06 * xSide, 0.27, -0.12);
        mirrorArm.rotation.z = (Math.PI / 3) * xSide;
        doorMeshGroup.add(mirrorArm);

        // Teardrop aerodynamic mirror housing
        const mirrorHeadGeo = new THREE.BoxGeometry(0.07, 0.11, 0.17);
        const mirrorHead = new THREE.Mesh(mirrorHeadGeo, this.matBumper);
        mirrorHead.position.set(0.12 * xSide, 0.31, -0.14);
        mirrorHead.castShadow = true;
        doorMeshGroup.add(mirrorHead);

        // Reflective Chrome Mirror Glass Facing Backward
        const mirrorFaceGeo = new THREE.PlaneGeometry(0.09, 0.15);
        const mirrorFace = new THREE.Mesh(mirrorFaceGeo, this.matMirrorGlass);
        mirrorFace.position.set(0.12 * xSide, 0.31, -0.176);
        mirrorFace.rotation.y = Math.PI;
        doorMeshGroup.add(mirrorFace);
      }

      // 5. Inner Molded Door Panel Card
      const innerCardGeo = new THREE.BoxGeometry(0.04, 0.44, isRear ? 0.78 : doorLen * 0.96);
      const innerCard = new THREE.Mesh(innerCardGeo, this.matInterior);
      innerCard.position.set(-0.025 * xSide, 0, isRear ? -0.40 : doorZCenter);
      doorMeshGroup.add(innerCard);

      // Armrest & Power Window Pod
      const armrestGeo = new THREE.BoxGeometry(0.06, 0.06, 0.34);
      const armrest = new THREE.Mesh(armrestGeo, this.matSeatBolster);
      armrest.position.set(-0.05 * xSide, 0.02, isRear ? -0.40 : doorZCenter + 0.05);
      doorMeshGroup.add(armrest);

      doorPivot.add(doorMeshGroup);
      return doorPivot;
    };

    this.doors.frontLeft.pivot = createDoor(true, false);
    this.doors.frontLeft.pivot.position.set(0.81, 0.60, 0.70);
    this.group.add(this.doors.frontLeft.pivot);

    this.doors.frontRight.pivot = createDoor(false, false);
    this.doors.frontRight.pivot.position.set(-0.81, 0.60, 0.70);
    this.group.add(this.doors.frontRight.pivot);

    this.doors.rearLeft.pivot = createDoor(true, true);
    this.doors.rearLeft.pivot.position.set(0.81, 0.60, -0.18);
    this.group.add(this.doors.rearLeft.pivot);

    this.doors.rearRight.pivot = createDoor(false, true);
    this.doors.rearRight.pivot.position.set(-0.81, 0.60, -0.18);
    this.group.add(this.doors.rearRight.pivot);
  }

  private buildHoodAndTrunk() {
    // Aerodynamic Sculpted Hood with Dual Character Ridges & Stamped Underside
    const hoodPivot = new THREE.Group();
    hoodPivot.position.set(0, 0.83, 0.70);

    const hoodMeshGroup = new THREE.Group();
    // Hood Outer Top Skin
    const hoodGeo = new THREE.BoxGeometry(1.58, 0.035, 1.42);
    const hoodMesh = new THREE.Mesh(hoodGeo, this.matBody);
    hoodMesh.position.set(0, 0, 0.71);
    hoodMesh.rotation.x = -0.04;
    hoodMesh.castShadow = true;
    hoodMeshGroup.add(hoodMesh);

    // Hood Dual Center Aerodynamic Strakes
    [-0.32, 0.32].forEach((sx) => {
      const strakeGeo = new THREE.BoxGeometry(0.03, 0.015, 1.20);
      const strake = new THREE.Mesh(strakeGeo, this.matBody);
      strake.position.set(sx, 0.025, 0.68);
      strake.rotation.x = -0.04;
      hoodMeshGroup.add(strake);
    });

    // Hood Underside Stamped Structural Reinforcement Skeleton (visible when hood is open)
    const underFrameGeo = new THREE.BoxGeometry(1.52, 0.018, 1.36);
    const underFrame = new THREE.Mesh(underFrameGeo, this.matEngineBayApron);
    underFrame.position.set(0, -0.02, 0.71);
    underFrame.rotation.x = -0.04;
    hoodMeshGroup.add(underFrame);

    // Hood Underside Thermal & Acoustic Fibrous Insulation Blanket Pad
    const blanketGeo = new THREE.BoxGeometry(1.22, 0.014, 1.08);
    const blanket = new THREE.Mesh(blanketGeo, this.matInterior);
    blanket.position.set(0, -0.028, 0.72);
    blanket.rotation.x = -0.04;
    hoodMeshGroup.add(blanket);

    // Chrome Hood Latch Striker Loop at front nose
    const strikerGeo = new THREE.BoxGeometry(0.04, 0.03, 0.03);
    const striker = new THREE.Mesh(strikerGeo, this.matChrome);
    striker.position.set(0, -0.03, 1.38);
    hoodMeshGroup.add(striker);

    hoodPivot.add(hoodMeshGroup);
    this.doors.hood.pivot = hoodPivot;
    this.group.add(hoodPivot);

    // Windshield wipers fixed to recessed cowl tray behind hood shutline
    [-0.32, 0.28].forEach((x) => {
      const wiperGeo = new THREE.BoxGeometry(0.38, 0.02, 0.02);
      const wiper = new THREE.Mesh(wiperGeo, this.matBumper);
      wiper.position.set(x, 0.84, 0.72);
      wiper.rotation.y = 0.15;
      this.group.add(wiper);
    });

    // Rear Trunk Lid (from back window base Z = -1.35 to rear taillight panel Z = -2.12)
    const trunkPivot = new THREE.Group();
    trunkPivot.position.set(0, 0.83, -1.35);

    const trunkMeshGroup = new THREE.Group();
    const trunkGeo = new THREE.BoxGeometry(1.56, 0.04, 0.77);
    const trunkMesh = new THREE.Mesh(trunkGeo, this.matBody);
    trunkMesh.position.set(0, 0, -0.385);
    trunkMesh.castShadow = true;
    trunkMeshGroup.add(trunkMesh);

    trunkPivot.add(trunkMeshGroup);
    this.doors.trunk.pivot = trunkPivot;
    this.group.add(trunkPivot);
  }

  private buildEngine() {
    const engineGroup = new THREE.Group();

    // 1. SUBARU EA82 BOXER-4 CRANKCASE, BLOCK & DRIVETRAIN
    // Center Cast Engine Block (mounted low between frame rails)
    const blockGeo = new THREE.BoxGeometry(0.38, 0.22, 0.44);
    const block = new THREE.Mesh(blockGeo, this.matEngineBlock);
    block.position.set(0, 0.38, 1.26);
    block.castShadow = true;
    engineGroup.add(block);

    // Stamped Steel Lower Oil Pan with Drain Plug
    const oilPanGeo = new THREE.BoxGeometry(0.32, 0.08, 0.36);
    const oilPan = new THREE.Mesh(oilPanGeo, this.matBumper);
    oilPan.position.set(0, 0.23, 1.26);
    engineGroup.add(oilPan);

    const drainPlugGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.016, 6);
    const drainPlug = new THREE.Mesh(drainPlugGeo, this.matChrome);
    drainPlug.position.set(0, 0.185, 1.12);
    engineGroup.add(drainPlug);

    // 5-Speed Manual / AWD Transmission Bellhousing & Transfer Case
    const bellGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.26, 16);
    const bell = new THREE.Mesh(bellGeo, this.matEngineBlock);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0, 0.36, 0.94);
    engineGroup.add(bell);

    // Center Driveshaft Linkage extending back to cabin tunnel
    const driveShaftGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8);
    const driveShaft = new THREE.Mesh(driveShaftGeo, this.matPedalArm);
    driveShaft.rotation.x = Math.PI / 2;
    driveShaft.position.set(0, 0.32, 0.72);
    engineGroup.add(driveShaft);

    // Heavy Steel Motor Mount Brackets & Rubber Isolators
    [-0.28, 0.28].forEach((mx) => {
      const mountBktGeo = new THREE.BoxGeometry(0.08, 0.06, 0.12);
      const mountBkt = new THREE.Mesh(mountBktGeo, this.matPedalArm);
      mountBkt.position.set(mx, 0.30, 1.24);
      engineGroup.add(mountBkt);

      const damperGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10);
      const damper = new THREE.Mesh(damperGeo, this.matBumper);
      damper.position.set(mx, 0.26, 1.24);
      engineGroup.add(damper);
    });

    // 2. HORIZONTALLY-OPPOSED CYLINDER HEADS & FINNED VALVE COVERS (LEFT & RIGHT)
    [-1, 1].forEach((xSide) => {
      // Cylinder Head Stamping
      const headGeo = new THREE.BoxGeometry(0.18, 0.16, 0.38);
      const head = new THREE.Mesh(headGeo, this.matEngineBlock);
      head.position.set(xSide * 0.26, 0.40, 1.26);
      head.castShadow = true;
      engineGroup.add(head);

      // Finned Aluminum Valve Cover with EA82 OHC Profile
      const coverGeo = new THREE.BoxGeometry(0.08, 0.14, 0.36);
      const cover = new THREE.Mesh(coverGeo, this.matValveCover);
      cover.position.set(xSide * 0.38, 0.42, 1.26);
      cover.castShadow = true;
      engineGroup.add(cover);

      // Valve Cover Longitudinal Cooling Fins
      [-0.04, 0, 0.04].forEach((fz) => {
        const finGeo = new THREE.BoxGeometry(0.015, 0.12, 0.34);
        const fin = new THREE.Mesh(finGeo, this.matIntakeAlloy);
        fin.position.set(xSide * 0.425, 0.42, 1.26 + fz * 0.2);
        engineGroup.add(fin);
      });

      // Spark Plug Recesses & Boots (2 per cylinder bank)
      [-0.09, 0.09].forEach((pz) => {
        const plugRecessGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 8);
        const plugRecess = new THREE.Mesh(plugRecessGeo, this.matPedalArm);
        plugRecess.rotation.z = Math.PI / 2;
        plugRecess.position.set(xSide * 0.43, 0.42, 1.26 + pz);
        engineGroup.add(plugRecess);

        const bootGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8);
        const boot = new THREE.Mesh(bootGeo, this.matEngineBlackHose);
        boot.rotation.z = Math.PI / 2;
        boot.position.set(xSide * 0.45, 0.42, 1.26 + pz);
        engineGroup.add(boot);
      });

      // Exhaust Manifolds / Headers exiting under the heads
      const exhaustPortGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.16, 8);
      const exhaustPort = new THREE.Mesh(exhaustPortGeo, this.matExhaustHeader);
      exhaustPort.position.set(xSide * 0.28, 0.28, 1.26);
      exhaustPort.rotation.z = xSide * 0.4;
      engineGroup.add(exhaustPort);
    });

    // Exhaust Y-Pipe merging beneath engine into center tunnel
    const yPipeGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.42, 8);
    const yPipe = new THREE.Mesh(yPipeGeo, this.matExhaustHeader);
    yPipe.rotation.x = Math.PI / 2;
    yPipe.position.set(0, 0.24, 0.98);
    engineGroup.add(yPipe);

    // Oil Filler Neck & Yellow Cap on Driver Valve Cover
    const oilNeckGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.09, 8);
    const oilNeck = new THREE.Mesh(oilNeckGeo, this.matIntakeAlloy);
    oilNeck.position.set(0.36, 0.52, 1.36);
    engineGroup.add(oilNeck);

    const oilCapGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.022, 8);
    const oilCap = new THREE.Mesh(oilCapGeo, this.matYellowAccent);
    oilCap.position.set(0.36, 0.57, 1.36);
    engineGroup.add(oilCap);

    // Engine Oil Dipstick with Yellow Finger Pull Ring
    const dipTubeGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.22, 6);
    const dipTube = new THREE.Mesh(dipTubeGeo, this.matChrome);
    dipTube.position.set(0.34, 0.50, 1.44);
    dipTube.rotation.z = -0.15;
    engineGroup.add(dipTube);

    const dipRingGeo = new THREE.TorusGeometry(0.016, 0.004, 8, 16);
    const dipRing = new THREE.Mesh(dipRingGeo, this.matYellowAccent);
    dipRing.position.set(0.32, 0.62, 1.44);
    engineGroup.add(dipRing);

    // 3. EA82 MULTI-PORT INTAKE MANIFOLD & FUEL INJECTION
    // Center Intake Plenum
    const intakePlenumGeo = new THREE.BoxGeometry(0.24, 0.10, 0.26);
    const intakePlenum = new THREE.Mesh(intakePlenumGeo, this.matIntakeAlloy);
    intakePlenum.position.set(0, 0.56, 1.24);
    intakePlenum.castShadow = true;
    engineGroup.add(intakePlenum);

    // 4 Curved Cast Aluminum Intake Runners arching from plenum to cylinder heads
    [-0.07, 0.07].forEach((rz) => {
      [-1, 1].forEach((xSide) => {
        const pStart = new THREE.Vector3(xSide * 0.10, 0.56, 1.24 + rz);
        const pEnd = new THREE.Vector3(xSide * 0.28, 0.47, 1.24 + rz * 1.1);
        const runner = this.createOrientedBar(pStart, pEnd, 0.032, 0.032, this.matIntakeAlloy);
        engineGroup.add(runner);

        // Fuel Injector Rail & Injector Nozzle
        const injectorGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.035, 6);
        const injector = new THREE.Mesh(injectorGeo, this.matPedalArm);
        injector.position.set(xSide * 0.24, 0.52, 1.24 + rz);
        engineGroup.add(injector);
      });
    });

    // Fuel Injection Rail Tubes
    [-0.18, 0.18].forEach((fx) => {
      const fuelRailGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.26, 6);
      const fuelRail = new THREE.Mesh(fuelRailGeo, this.matChrome);
      fuelRail.rotation.x = Math.PI / 2;
      fuelRail.position.set(fx, 0.53, 1.24);
      engineGroup.add(fuelRail);
    });

    // Central Throttle Body & Linkage Assembly
    const throttleGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.10, 12);
    const throttle = new THREE.Mesh(throttleGeo, this.matIntakeAlloy);
    throttle.rotation.x = Math.PI / 2;
    throttle.position.set(0, 0.56, 1.39);
    engineGroup.add(throttle);

    // Throttle Cable Bracket & Return Spring
    const cableBktGeo = new THREE.BoxGeometry(0.02, 0.05, 0.06);
    const cableBkt = new THREE.Mesh(cableBktGeo, this.matPedalArm);
    cableBkt.position.set(0.055, 0.58, 1.39);
    engineGroup.add(cableBkt);

    const springGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.04, 6);
    const spring = new THREE.Mesh(springGeo, this.matYellowAccent);
    spring.rotation.x = Math.PI / 2;
    spring.position.set(0.06, 0.57, 1.39);
    engineGroup.add(spring);

    // 4. AIR INTAKE FILTER BOX & ACCORDION RUBBER DUCT
    // Air Filter Airbox Housing mounted on passenger inner apron
    const airboxGeo = new THREE.BoxGeometry(0.22, 0.18, 0.24);
    const airbox = new THREE.Mesh(airboxGeo, this.matBumper);
    airbox.position.set(-0.44, 0.60, 1.58);
    airbox.castShadow = true;
    engineGroup.add(airbox);

    // Airbox Metal Latch Clips
    [-0.08, 0.08].forEach((lz) => {
      const clipGeo = new THREE.BoxGeometry(0.015, 0.03, 0.02);
      const clip = new THREE.Mesh(clipGeo, this.matChrome);
      clip.position.set(-0.325, 0.64, 1.58 + lz);
      engineGroup.add(clip);
    });

    // Fresh Air Snorkel leading to front core support
    const snorkelGeo = new THREE.BoxGeometry(0.10, 0.06, 0.32);
    const snorkel = new THREE.Mesh(snorkelGeo, this.matBumper);
    snorkel.position.set(-0.44, 0.64, 1.86);
    engineGroup.add(snorkel);

    // Ribbed Accordion Rubber Intake Duct from Airbox to Throttle Body
    const ductSegments = [
      new THREE.Vector3(-0.33, 0.60, 1.54),
      new THREE.Vector3(-0.22, 0.61, 1.50),
      new THREE.Vector3(-0.11, 0.59, 1.45),
      new THREE.Vector3(-0.02, 0.56, 1.43)
    ];
    for (let i = 0; i < ductSegments.length - 1; i++) {
      const segMesh = this.createOrientedBar(ductSegments[i], ductSegments[i + 1], 0.075, 0.075, this.matEngineBlackHose);
      engineGroup.add(segMesh);
    }

    // Metallic Hose Clamps on intake duct
    [-0.32, -0.04].forEach((cx) => {
      const clampGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.015, 12);
      const clamp = new THREE.Mesh(clampGeo, this.matChrome);
      clamp.rotation.z = Math.PI / 2;
      clamp.position.set(cx, 0.58, 1.46);
      engineGroup.add(clamp);
    });

    // 5. FRONT ACCESSORY BELT DRIVE (CRANK, ALTERNATOR, PUMPS & BELTS)
    // Front Timing Belt Housing Cover
    const timingCoverGeo = new THREE.BoxGeometry(0.48, 0.28, 0.05);
    const timingCover = new THREE.Mesh(timingCoverGeo, this.matBumper);
    timingCover.position.set(0, 0.44, 1.50);
    engineGroup.add(timingCover);

    // Crankshaft Harmonic Balancer Pulley
    const crankPulleyGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.04, 16);
    const crankPulley = new THREE.Mesh(crankPulleyGeo, this.matPedalArm);
    crankPulley.rotation.x = Math.PI / 2;
    crankPulley.position.set(0, 0.36, 1.54);
    engineGroup.add(crankPulley);

    // Alternator Unit (Driver Side Top)
    const altGroup = new THREE.Group();
    altGroup.position.set(0.20, 0.62, 1.47);

    // Alternator Alloy Body with Vent Slots
    const altBodyGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 14);
    const altBody = new THREE.Mesh(altBodyGeo, this.matIntakeAlloy);
    altBody.rotation.x = Math.PI / 2;
    altGroup.add(altBody);

    // Visible Internal Copper Stator Coils
    const copperGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.07, 12);
    const copper = new THREE.Mesh(copperGeo, this.matCopper);
    copper.rotation.x = Math.PI / 2;
    altGroup.add(copper);

    // Alternator Front Pulley & Cooling Fan Disc
    const altPulleyGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 14);
    const altPulley = new THREE.Mesh(altPulleyGeo, this.matPedalArm);
    altPulley.rotation.x = Math.PI / 2;
    altPulley.position.z = 0.075;
    altGroup.add(altPulley);

    // Alternator Slotted Tensioner Bracket
    const tensionerGeo = new THREE.BoxGeometry(0.12, 0.015, 0.02);
    const tensioner = new THREE.Mesh(tensionerGeo, this.matPedalArm);
    tensioner.position.set(-0.06, 0.07, 0.06);
    altGroup.add(tensioner);

    engineGroup.add(altGroup);

    // Power Steering Pump (Passenger Side)
    const psGroup = new THREE.Group();
    psGroup.position.set(-0.20, 0.54, 1.47);

    const psBodyGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.09, 12);
    const psBody = new THREE.Mesh(psBodyGeo, this.matBumper);
    psBody.rotation.x = Math.PI / 2;
    psGroup.add(psBody);

    const psPulleyGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.025, 14);
    const psPulley = new THREE.Mesh(psPulleyGeo, this.matPedalArm);
    psPulley.rotation.x = Math.PI / 2;
    psPulley.position.z = 0.06;
    psGroup.add(psPulley);

    engineGroup.add(psGroup);

    // AC Compressor (Lower Passenger Side)
    const acBodyGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12);
    const acBody = new THREE.Mesh(acBodyGeo, this.matIntakeAlloy);
    acBody.rotation.x = Math.PI / 2;
    acBody.position.set(-0.22, 0.35, 1.48);
    engineGroup.add(acBody);

    const acPulleyGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 14);
    const acPulley = new THREE.Mesh(acPulleyGeo, this.matPedalArm);
    acPulley.rotation.x = Math.PI / 2;
    acPulley.position.set(-0.22, 0.35, 1.56);
    engineGroup.add(acPulley);

    // Serpentine Accessory Drive Belts (looping snugly between pulleys)
    const belt1 = this.createOrientedBar(
      new THREE.Vector3(0, 0.36, 1.55),
      new THREE.Vector3(0.20, 0.62, 1.55),
      0.015,
      0.018,
      this.matBumper
    );
    engineGroup.add(belt1);

    const belt2 = this.createOrientedBar(
      new THREE.Vector3(0, 0.36, 1.55),
      new THREE.Vector3(-0.20, 0.54, 1.55),
      0.015,
      0.018,
      this.matBumper
    );
    engineGroup.add(belt2);

    const belt3 = this.createOrientedBar(
      new THREE.Vector3(-0.20, 0.54, 1.55),
      new THREE.Vector3(-0.22, 0.35, 1.55),
      0.015,
      0.018,
      this.matBumper
    );
    engineGroup.add(belt3);

    // 6. IGNITION SYSTEM & HIGH-PERFORMANCE BLUE SILICONE SPARK WIRES
    // Ignition Distributor / Coil Assembly (Rear Driver Side)
    const distBodyGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10);
    const distBody = new THREE.Mesh(distBodyGeo, this.matIntakeAlloy);
    distBody.position.set(0.15, 0.58, 1.05);
    engineGroup.add(distBody);

    const distCapGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.045, 10);
    const distCap = new THREE.Mesh(distCapGeo, this.matBumper);
    distCap.position.set(0.15, 0.63, 1.05);
    engineGroup.add(distCap);

    // 4 High-Voltage Silicone Spark Plug Ignition Leads
    const sparkDestinations = [
      new THREE.Vector3(0.44, 0.43, 1.17),  // Cylinder 1 (Driver Rear)
      new THREE.Vector3(0.44, 0.43, 1.35),  // Cylinder 3 (Driver Front)
      new THREE.Vector3(-0.44, 0.43, 1.17), // Cylinder 2 (Pass Rear)
      new THREE.Vector3(-0.44, 0.43, 1.35)  // Cylinder 4 (Pass Front)
    ];
    sparkDestinations.forEach((dest, idx) => {
      const midPoint = new THREE.Vector3(
        (0.15 + dest.x) * 0.5,
        0.62 - idx * 0.015,
        (1.05 + dest.z) * 0.5
      );
      const wirePart1 = this.createOrientedBar(
        new THREE.Vector3(0.15, 0.64, 1.05),
        midPoint,
        0.012,
        0.012,
        this.matSparkWire
      );
      const wirePart2 = this.createOrientedBar(
        midPoint,
        dest,
        0.012,
        0.012,
        this.matSparkWire
      );
      engineGroup.add(wirePart1);
      engineGroup.add(wirePart2);
    });

    // 7. CROSS-FLOW ALUMINUM RADIATOR, DUAL COOLING FANS & HOSES
    // Radiator Core with fine cooling fin texture
    const radCoreGeo = new THREE.BoxGeometry(0.78, 0.38, 0.035);
    const radCore = new THREE.Mesh(radCoreGeo, this.matRadiatorFin);
    radCore.position.set(0, 0.54, 1.98);
    engineGroup.add(radCore);

    // Top and Bottom Radiator Polymer End Tanks
    const radTopTankGeo = new THREE.BoxGeometry(0.80, 0.04, 0.06);
    const radTopTank = new THREE.Mesh(radTopTankGeo, this.matBumper);
    radTopTank.position.set(0, 0.74, 1.98);
    engineGroup.add(radTopTank);

    const radBotTankGeo = new THREE.BoxGeometry(0.80, 0.05, 0.06);
    const radBotTank = new THREE.Mesh(radBotTankGeo, this.matBumper);
    radBotTank.position.set(0, 0.34, 1.98);
    engineGroup.add(radBotTank);

    // Silver Radiator Pressure Cap with Caution Warning Label
    const radCapNeckGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.025, 8);
    const radCapNeck = new THREE.Mesh(radCapNeckGeo, this.matIntakeAlloy);
    radCapNeck.position.set(-0.28, 0.765, 1.98);
    engineGroup.add(radCapNeck);

    const radCapGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.014, 8);
    const radCap = new THREE.Mesh(radCapGeo, this.matChrome);
    radCap.position.set(-0.28, 0.78, 1.98);
    engineGroup.add(radCap);

    const radCapDecalGeo = new THREE.PlaneGeometry(0.038, 0.022);
    const radCapDecal = new THREE.Mesh(radCapDecalGeo, this.matYellowAccent);
    radCapDecal.rotation.x = -Math.PI / 2;
    radCapDecal.position.set(-0.28, 0.788, 1.98);
    engineGroup.add(radCapDecal);

    // Molded Upper Radiator Coolant Hose (Engine Outlet to Radiator Inlet)
    const upperHosePoints = [
      new THREE.Vector3(0.08, 0.54, 1.62),
      new THREE.Vector3(0.14, 0.65, 1.76),
      new THREE.Vector3(0.18, 0.72, 1.95)
    ];
    for (let h = 0; h < upperHosePoints.length - 1; h++) {
      const hoseMesh = this.createOrientedBar(upperHosePoints[h], upperHosePoints[h + 1], 0.048, 0.048, this.matEngineBlackHose);
      engineGroup.add(hoseMesh);
    }

    // Metallic Hose Clamps on Radiator Hose
    [new THREE.Vector3(0.08, 0.54, 1.62), new THREE.Vector3(0.18, 0.72, 1.95)].forEach((pos) => {
      const clampMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.014, 10), this.matChrome);
      clampMesh.position.copy(pos);
      engineGroup.add(clampMesh);
    });

    // Lower Radiator Coolant Return Hose
    const lowerHoseMesh = this.createOrientedBar(
      new THREE.Vector3(-0.24, 0.36, 1.95),
      new THREE.Vector3(-0.06, 0.32, 1.60),
      0.044,
      0.044,
      this.matEngineBlackHose
    );
    engineGroup.add(lowerHoseMesh);

    // Dual Electric Cooling Fan Shroud & Dual Ring Fans
    const fanShroudGeo = new THREE.BoxGeometry(0.74, 0.34, 0.02);
    const fanShroud = new THREE.Mesh(fanShroudGeo, this.matBumper);
    fanShroud.position.set(0, 0.54, 1.94);
    engineGroup.add(fanShroud);

    [-0.18, 0.18].forEach((fx) => {
      // Fan Shroud Ring
      const ringGeo = new THREE.TorusGeometry(0.14, 0.012, 8, 20);
      const ring = new THREE.Mesh(ringGeo, this.matBumper);
      ring.position.set(fx, 0.54, 1.93);
      engineGroup.add(ring);

      // Central Electric Motor Hub
      const motorHubGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.035, 12);
      const motorHub = new THREE.Mesh(motorHubGeo, this.matPedalArm);
      motorHub.rotation.x = Math.PI / 2;
      motorHub.position.set(fx, 0.54, 1.92);
      engineGroup.add(motorHub);

      // 5 Angled Curved Fan Blades
      for (let b = 0; b < 5; b++) {
        const bladeAngle = b * ((Math.PI * 2) / 5);
        const bladeGeo = new THREE.BoxGeometry(0.028, 0.09, 0.008);
        const blade = new THREE.Mesh(bladeGeo, this.matBumper);
        blade.position.set(
          fx + Math.cos(bladeAngle) * 0.08,
          0.54 + Math.sin(bladeAngle) * 0.08,
          1.925
        );
        blade.rotation.z = bladeAngle + 0.35;
        engineGroup.add(blade);
      }
    });

    // Coolant Overflow / Expansion Tank with Coolant Level
    const expTankGeo = new THREE.BoxGeometry(0.14, 0.20, 0.12);
    const expTank = new THREE.Mesh(expTankGeo, this.matPlasticTank);
    expTank.position.set(-0.46, 0.56, 1.88);
    engineGroup.add(expTank);

    // Green engine coolant visible inside reservoir
    const coolantMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.2,
      transparent: true,
      opacity: 0.75
    });
    const coolantGeo = new THREE.BoxGeometry(0.13, 0.12, 0.11);
    const coolantMesh = new THREE.Mesh(coolantGeo, coolantMat);
    coolantMesh.position.set(-0.46, 0.52, 1.88);
    engineGroup.add(coolantMesh);

    // Overflow Hose connecting Radiator Neck to Expansion Tank
    const overHose = this.createOrientedBar(
      new THREE.Vector3(-0.28, 0.77, 1.98),
      new THREE.Vector3(-0.42, 0.65, 1.90),
      0.012,
      0.012,
      this.matEngineBlackHose
    );
    engineGroup.add(overHose);

    // 8. 12V AUTOMOTIVE BATTERY & HOLD-DOWN TRAY
    // Battery Stamped Tray on Driver Side Apron
    const batTrayGeo = new THREE.BoxGeometry(0.24, 0.02, 0.20);
    const batTray = new THREE.Mesh(batTrayGeo, this.matBumper);
    batTray.position.set(0.46, 0.44, 1.84);
    engineGroup.add(batTray);

    // Heavy-duty Polypropylene Battery Case
    const batteryGeo = new THREE.BoxGeometry(0.22, 0.19, 0.17);
    const batteryMesh = new THREE.Mesh(batteryGeo, this.matBatteryCase);
    batteryMesh.position.set(0.46, 0.545, 1.84);
    batteryMesh.castShadow = true;
    engineGroup.add(batteryMesh);

    // Battery Spec Label on top face
    const batLabelGeo = new THREE.PlaneGeometry(0.20, 0.15);
    const batLabel = new THREE.Mesh(batLabelGeo, this.matBatteryLabel);
    batLabel.rotation.x = -Math.PI / 2;
    batLabel.position.set(0.46, 0.642, 1.84);
    engineGroup.add(batLabel);

    // Positive (+) Terminal Post with Red Protective Insulator Clamp
    const posPostGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.022, 8);
    const posPost = new THREE.Mesh(posPostGeo, this.matBatteryTermRed);
    posPost.position.set(0.52, 0.65, 1.88);
    engineGroup.add(posPost);

    // Heavy Red Battery Starter Cable
    const redCable = this.createOrientedBar(
      new THREE.Vector3(0.52, 0.65, 1.88),
      new THREE.Vector3(0.38, 0.48, 1.48),
      0.016,
      0.016,
      this.matBatteryTermRed
    );
    engineGroup.add(redCable);

    // Negative (-) Terminal Post & Black Chassis Ground Strap
    const negPostGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.022, 8);
    const negPost = new THREE.Mesh(negPostGeo, this.matPedalArm);
    negPost.position.set(0.40, 0.65, 1.80);
    engineGroup.add(negPost);

    const gndCable = this.createOrientedBar(
      new THREE.Vector3(0.40, 0.65, 1.80),
      new THREE.Vector3(0.46, 0.52, 1.70),
      0.014,
      0.014,
      this.matBumper
    );
    engineGroup.add(gndCable);

    // Battery Metal Hold-Down Crossbar with J-Bolts
    const holdBarGeo = new THREE.BoxGeometry(0.23, 0.016, 0.035);
    const holdBar = new THREE.Mesh(holdBarGeo, this.matPedalArm);
    holdBar.position.set(0.46, 0.645, 1.84);
    engineGroup.add(holdBar);

    [-0.10, 0.10].forEach((jx) => {
      const jBoltGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.21, 6);
      const jBolt = new THREE.Mesh(jBoltGeo, this.matChrome);
      jBolt.position.set(0.46 + jx, 0.54, 1.84);
      engineGroup.add(jBolt);

      const wingNutGeo = new THREE.BoxGeometry(0.022, 0.01, 0.012);
      const wingNut = new THREE.Mesh(wingNutGeo, this.matChrome);
      wingNut.position.set(0.46 + jx, 0.655, 1.84);
      engineGroup.add(wingNut);
    });

    // 9. BRAKE VACUUM BOOSTER & MASTER CYLINDER (FIREWALL MOUNTED)
    // Large Matte Black Brake Booster Vacuum Drum in front of driver
    const boosterGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
    const booster = new THREE.Mesh(boosterGeo, this.matBumper);
    booster.rotation.x = Math.PI / 2;
    booster.position.set(0.38, 0.68, 0.78);
    engineGroup.add(booster);

    // Cast Aluminum Master Cylinder Body
    const mCylGeo = new THREE.BoxGeometry(0.06, 0.06, 0.14);
    const mCyl = new THREE.Mesh(mCylGeo, this.matIntakeAlloy);
    mCyl.position.set(0.38, 0.68, 0.88);
    engineGroup.add(mCyl);

    // Translucent Plastic Dual-Chamber Brake Fluid Reservoir with Cap
    const bResGeo = new THREE.BoxGeometry(0.08, 0.09, 0.12);
    const bRes = new THREE.Mesh(bResGeo, this.matPlasticTank);
    bRes.position.set(0.38, 0.76, 0.88);
    engineGroup.add(bRes);

    const bCapGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.018, 8);
    const bCap = new THREE.Mesh(bCapGeo, this.matYellowAccent);
    bCap.position.set(0.38, 0.81, 0.88);
    engineGroup.add(bCap);

    // Coiled Steel Brake Lines exiting master cylinder down to chassis
    [-0.015, 0.015].forEach((lz) => {
      const bLineGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.28, 6);
      const bLine = new THREE.Mesh(bLineGeo, this.matChrome);
      bLine.position.set(0.42, 0.54, 0.88 + lz);
      engineGroup.add(bLine);
    });

    // 10. WINDSHIELD WASHER FLUID RESERVOIR (PASSENGER APRON)
    const washerTankGeo = new THREE.BoxGeometry(0.12, 0.24, 0.18);
    const washerTank = new THREE.Mesh(washerTankGeo, this.matPlasticTank);
    washerTank.position.set(-0.52, 0.56, 1.20);
    engineGroup.add(washerTank);

    // Washer Cap (Vibrant Blue Plastic)
    const wCapMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    const wCapGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.014, 8);
    const wCap = new THREE.Mesh(wCapGeo, wCapMat);
    wCap.position.set(-0.52, 0.685, 1.20);
    engineGroup.add(wCap);

    // 11. ENGINE BAY ELECTRICAL WIRING LOOM & HARNESS
    // Main wiring loom harness along the firewall
    const harnessMesh = this.createOrientedBar(
      new THREE.Vector3(-0.56, 0.73, 0.75),
      new THREE.Vector3(0.56, 0.73, 0.75),
      0.022,
      0.022,
      this.matBumper
    );
    engineGroup.add(harnessMesh);

    // Add complete assembled engine group to the car
    this.group.add(engineGroup);
  }

  private buildInterior() {
    const interiorGroup = new THREE.Group();

    // 0. FIREWALL BULKHEAD & CABIN ENCLOSURE
    // Separates cabin footwells from engine bay at Z = 0.72
    const firewallGeo = new THREE.BoxGeometry(1.52, 0.52, 0.04);
    const firewall = new THREE.Mesh(firewallGeo, this.matInterior);
    firewall.position.set(0, 0.50, 0.72);
    interiorGroup.add(firewall);

    const cowlShelfGeo = new THREE.BoxGeometry(1.52, 0.04, 0.20);
    const cowlShelf = new THREE.Mesh(cowlShelfGeo, this.matInterior);
    cowlShelf.position.set(0, 0.74, 0.62);
    interiorGroup.add(cowlShelf);

    // CENTRAL DRIVETRAIN & EXHAUST TUNNEL (Subaru AWD Center Tunnel)
    const tunnelGeo = new THREE.BoxGeometry(0.22, 0.14, 1.92);
    const tunnel = new THREE.Mesh(tunnelGeo, this.matCarpet);
    tunnel.position.set(0, 0.25, -0.26);
    interiorGroup.add(tunnel);

    // Tunnel beveled carpet transitions
    [-0.12, 0.12].forEach((tx, idx) => {
      const bevelGeo = new THREE.BoxGeometry(0.04, 0.12, 1.92);
      const bevel = new THREE.Mesh(bevelGeo, this.matCarpet);
      bevel.position.set(tx, 0.22, -0.26);
      bevel.rotation.z = (idx === 0 ? -0.38 : 0.38);
      interiorGroup.add(bevel);
    });

    // 0B. RECESSED FRONT FOOTWELLS (Floor at Y = 0.18, providing 26cm deep footwells)
    // Driver front footwell carpet bed
    const driverFloorGeo = new THREE.BoxGeometry(0.48, 0.02, 0.75);
    const driverFloor = new THREE.Mesh(driverFloorGeo, this.matCarpet);
    driverFloor.position.set(0.40, 0.18, 0.32);
    interiorGroup.add(driverFloor);

    // Passenger front footwell carpet bed
    const passFloorGeo = new THREE.BoxGeometry(0.48, 0.02, 0.75);
    const passFloor = new THREE.Mesh(passFloorGeo, this.matCarpet);
    passFloor.position.set(-0.40, 0.18, 0.32);
    interiorGroup.add(passFloor);

    // Forward Slanted Toe-Boards (angled up against firewall for feet support)
    [-0.40, 0.40].forEach((fx) => {
      const toeBoardGeo = new THREE.BoxGeometry(0.46, 0.02, 0.26);
      const toeBoard = new THREE.Mesh(toeBoardGeo, this.matCarpet);
      toeBoard.position.set(fx, 0.27, 0.64);
      toeBoard.rotation.x = -0.62;
      interiorGroup.add(toeBoard);
    });

    // All-Weather Front Rubber Floor Mats
    const driverMatGeo = new THREE.BoxGeometry(0.44, 0.01, 0.52);
    const driverMat = new THREE.Mesh(driverMatGeo, this.matRubberMat);
    driverMat.position.set(0.40, 0.19, 0.28);
    interiorGroup.add(driverMat);

    // Driver Heel Strike Pad (ribbed high-wear pad on mat)
    const heelPadGeo = new THREE.BoxGeometry(0.26, 0.006, 0.18);
    const heelPad = new THREE.Mesh(heelPadGeo, this.matInterior);
    heelPad.position.set(0.40, 0.198, 0.32);
    interiorGroup.add(heelPad);

    const passMatGeo = new THREE.BoxGeometry(0.44, 0.01, 0.54);
    const passMat = new THREE.Mesh(passMatGeo, this.matRubberMat);
    passMat.position.set(-0.40, 0.19, 0.30);
    interiorGroup.add(passMat);

    // 0C. DRIVER PEDAL CLUSTER & DEAD PEDAL (Hanging Pedals in Driver Footwell)
    const pedalHangerGeo = new THREE.BoxGeometry(0.34, 0.03, 0.06);
    const pedalHanger = new THREE.Mesh(pedalHangerGeo, this.matBumper);
    pedalHanger.position.set(0.38, 0.64, 0.48);
    interiorGroup.add(pedalHanger);

    // Accelerator (Gas) Pedal at X = 0.52
    const gasArmGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.28, 6);
    const gasArm = new THREE.Mesh(gasArmGeo, this.matPedalArm);
    gasArm.position.set(0.52, 0.46, 0.57);
    gasArm.rotation.x = -0.50;
    interiorGroup.add(gasArm);

    const gasPadGeo = new THREE.BoxGeometry(0.042, 0.10, 0.015);
    const gasPad = new THREE.Mesh(gasPadGeo, this.matPedalPad);
    gasPad.position.set(0.52, 0.30, 0.62);
    gasPad.rotation.x = -0.45;
    interiorGroup.add(gasPad);

    // Brake Pedal at X = 0.40
    const brakeArmGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6);
    const brakeArm = new THREE.Mesh(brakeArmGeo, this.matPedalArm);
    brakeArm.position.set(0.40, 0.46, 0.53);
    brakeArm.rotation.x = -0.45;
    interiorGroup.add(brakeArm);

    const brakePadGeo = new THREE.BoxGeometry(0.065, 0.06, 0.02);
    const brakePad = new THREE.Mesh(brakePadGeo, this.matPedalPad);
    brakePad.position.set(0.40, 0.32, 0.56);
    brakePad.rotation.x = -0.42;
    interiorGroup.add(brakePad);

    // Clutch Pedal at X = 0.28
    const clutchArmGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.32, 6);
    const clutchArm = new THREE.Mesh(clutchArmGeo, this.matPedalArm);
    clutchArm.position.set(0.28, 0.46, 0.53);
    clutchArm.rotation.x = -0.45;
    interiorGroup.add(clutchArm);

    const clutchPadGeo = new THREE.BoxGeometry(0.055, 0.058, 0.02);
    const clutchPad = new THREE.Mesh(clutchPadGeo, this.matPedalPad);
    clutchPad.position.set(0.28, 0.32, 0.56);
    clutchPad.rotation.x = -0.42;
    interiorGroup.add(clutchPad);

    // Driver Left Footrest / Dead Pedal at X = 0.18
    const deadPedalGeo = new THREE.BoxGeometry(0.07, 0.03, 0.16);
    const deadPedal = new THREE.Mesh(deadPedalGeo, this.matPedalPad);
    deadPedal.position.set(0.18, 0.24, 0.62);
    deadPedal.rotation.x = -0.65;
    interiorGroup.add(deadPedal);

    // 0D. RECESSED REAR FOOTWELLS (Legroom between front seats and rear bench)
    [-0.40, 0.40].forEach((rx) => {
      // Rear sunken floorbed
      const rearFloorGeo = new THREE.BoxGeometry(0.48, 0.02, 0.54);
      const rearFloor = new THREE.Mesh(rearFloorGeo, this.matCarpet);
      rearFloor.position.set(rx, 0.18, -0.40);
      interiorGroup.add(rearFloor);

      // Rear all-weather rubber floor mat
      const rearMatGeo = new THREE.BoxGeometry(0.42, 0.01, 0.42);
      const rearMat = new THREE.Mesh(rearMatGeo, this.matRubberMat);
      rearMat.position.set(rx, 0.19, -0.41);
      interiorGroup.add(rearMat);
    });

    // Rear Seat Base Riser Bulkhead (carpeted vertical bulkhead supporting rear cushion at Z = -0.63)
    const rearRiserGeo = new THREE.BoxGeometry(1.46, 0.26, 0.04);
    const rearRiser = new THREE.Mesh(rearRiserGeo, this.matCarpet);
    rearRiser.position.set(0, 0.31, -0.63);
    interiorGroup.add(rearRiser);

    // 1. Dashboard Base & Driver Binnacle (Real-world human scale placement)
    const dashBaseGeo = new THREE.BoxGeometry(1.52, 0.26, 0.44);
    const dashBase = new THREE.Mesh(dashBaseGeo, this.matInterior);
    dashBase.position.set(0, 0.80, 0.52);
    interiorGroup.add(dashBase);

    // Driver Instrument Binnacle Cowl
    const binnacleCowlGeo = new THREE.BoxGeometry(0.44, 0.16, 0.26);
    const binnacleCowl = new THREE.Mesh(binnacleCowlGeo, this.matInterior);
    binnacleCowl.position.set(0.38, 0.96, 0.46);
    interiorGroup.add(binnacleCowl);

    // 2. LIVE IN-CAR WORKING DASHBOARD CLUSTER
    // Placed directly inside the binnacle cowl facing the driver
    const clusterDisplayGeo = new THREE.PlaneGeometry(0.38, 0.15);
    const clusterDisplay = new THREE.Mesh(clusterDisplayGeo, this.matDashDisplay);
    clusterDisplay.position.set(0.38, 0.95, 0.38);
    clusterDisplay.rotation.x = -0.26; // Angled back towards driver eye level
    interiorGroup.add(clusterDisplay);

    // 3. Center HVAC Vents, Cassette Stereo & 4WD Switch
    const hvacGeo = new THREE.BoxGeometry(0.24, 0.08, 0.02);
    const hvac = new THREE.Mesh(hvacGeo, this.matBumper);
    hvac.position.set(0, 0.85, 0.32);
    interiorGroup.add(hvac);

    const radioGeo = new THREE.BoxGeometry(0.22, 0.07, 0.02);
    const radio = new THREE.Mesh(radioGeo, this.matBumper);
    radio.position.set(0, 0.74, 0.33);
    interiorGroup.add(radio);

    // 4. Steering Column & 2-Spoke Wheel with Subaru Horn Badge
    const colGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.30, 8);
    const col = new THREE.Mesh(colGeo, this.matInterior);
    col.position.set(0.38, 0.84, 0.30);
    col.rotation.x = Math.PI / 4.2;
    interiorGroup.add(col);

    // Steering wheel group (rotates with steering input)
    const steerGroup = new THREE.Group();
    steerGroup.position.set(0.38, 0.94, 0.19);
    steerGroup.rotation.x = Math.PI / 4.2;

    const rimGeo = new THREE.TorusGeometry(0.18, 0.022, 8, 24);
    const rim = new THREE.Mesh(rimGeo, this.matInterior);
    steerGroup.add(rim);

    // 2 Horizontal Spokes
    const spokeGeo = new THREE.BoxGeometry(0.32, 0.03, 0.015);
    const spoke = new THREE.Mesh(spokeGeo, this.matInterior);
    spoke.position.set(0, -0.02, 0);
    steerGroup.add(spoke);

    // Center Horn Pad with Subaru Medallion
    const padGeo = new THREE.BoxGeometry(0.09, 0.08, 0.03);
    const pad = new THREE.Mesh(padGeo, this.matInterior);
    steerGroup.add(pad);

    const badgeGeo = new THREE.CircleGeometry(0.022, 16);
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0x1d3c78, roughness: 0.3 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0, 0.016);
    steerGroup.add(badge);

    interiorGroup.add(steerGroup);
    this.interiorSteeringWheel = steerGroup as unknown as THREE.Mesh;

    // Turn signal stalk on left of column
    const stalkGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6);
    const stalk = new THREE.Mesh(stalkGeo, this.matBumper);
    stalk.position.set(0.30, 0.88, 0.28);
    stalk.rotation.z = Math.PI / 3;
    interiorGroup.add(stalk);

    // 5. Sculpted Ergonomic Front Bucket Seats with Under-Seat Foot Channel
    // Placed to give authentic human scale front legroom and generous rear passenger legroom
    const createBucketSeat = (xPos: number) => {
      const seatG = new THREE.Group();

      // Steel Floor Mounting Runners (elevating cushion above floor, leaving center open for feet)
      [-0.16, 0.16].forEach((rx) => {
        const railGeo = new THREE.BoxGeometry(0.03, 0.18, 0.44);
        const rail = new THREE.Mesh(railGeo, this.matPedalArm);
        rail.position.set(rx, 0.28, 0.02);
        seatG.add(rail);
      });

      // Front seat adjustment lever handle
      const barGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.28, 6);
      const bar = new THREE.Mesh(barGeo, this.matChrome);
      bar.position.set(0, 0.22, 0.22);
      bar.rotation.z = Math.PI / 2;
      seatG.add(bar);

      // Seat cushion with side bolster wings (length 0.48m, centered at Z = 0.02)
      const cushionCenterGeo = new THREE.BoxGeometry(0.36, 0.12, 0.48);
      const cushionCenter = new THREE.Mesh(cushionCenterGeo, this.matSeatCenter);
      cushionCenter.position.set(0, 0.44, 0.02);
      seatG.add(cushionCenter);

      [-0.20, 0.20].forEach((bx) => {
        const bolsterGeo = new THREE.BoxGeometry(0.08, 0.15, 0.48);
        const bolster = new THREE.Mesh(bolsterGeo, this.matSeatBolster);
        bolster.position.set(bx, 0.46, 0.02);
        seatG.add(bolster);
      });

      // Seat back with lateral support wings (centered at Z = -0.21, reclining backward)
      const backCenterGeo = new THREE.BoxGeometry(0.36, 0.56, 0.10);
      const backCenter = new THREE.Mesh(backCenterGeo, this.matSeatCenter);
      backCenter.position.set(0, 0.74, -0.21);
      backCenter.rotation.x = -0.12;
      seatG.add(backCenter);

      [-0.20, 0.20].forEach((bx) => {
        const backBolsterGeo = new THREE.BoxGeometry(0.08, 0.56, 0.14);
        const backBolster = new THREE.Mesh(backBolsterGeo, this.matSeatBolster);
        backBolster.position.set(bx, 0.74, -0.20);
        backBolster.rotation.x = -0.12;
        seatG.add(backBolster);
      });

      // Adjustable Headrest on chrome posts
      [-0.06, 0.06].forEach((px) => {
        const postGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.08, 6);
        const post = new THREE.Mesh(postGeo, this.matChrome);
        post.position.set(px, 1.04, -0.25);
        seatG.add(post);
      });

      const headGeo = new THREE.BoxGeometry(0.24, 0.13, 0.09);
      const head = new THREE.Mesh(headGeo, this.matSeatBolster);
      head.position.set(0, 1.10, -0.26);
      seatG.add(head);

      seatG.position.x = xPos;
      return seatG;
    };

    interiorGroup.add(createBucketSeat(0.38));  // Driver Seat
    interiorGroup.add(createBucketSeat(-0.38)); // Passenger Seat

    // 6. Rear Bench Seat & Spacious Rear Legroom
    // Real-life human scale: Positioned back at Z = -0.88 with 42cm of open floor legroom
    // between the back of the front seats (Z = -0.21) and the rear cushion (Z = -0.63)
    const rearBenchGeo = new THREE.BoxGeometry(1.46, 0.16, 0.50);
    const rearBench = new THREE.Mesh(rearBenchGeo, this.matSeatCenter);
    rearBench.position.set(0, 0.46, -0.88);
    interiorGroup.add(rearBench);

    const rearBackGeo = new THREE.BoxGeometry(1.46, 0.52, 0.14);
    const rearBack = new THREE.Mesh(rearBackGeo, this.matSeatBolster);
    rearBack.position.set(0, 0.76, -1.18);
    rearBack.rotation.x = -0.12;
    interiorGroup.add(rearBack);

    // Rear Parcel Shelf / Bulkhead Deck behind rear seats
    const shelfGeo = new THREE.BoxGeometry(1.46, 0.04, 0.22);
    const shelf = new THREE.Mesh(shelfGeo, this.matInterior);
    shelf.position.set(0, 0.83, -1.27);
    interiorGroup.add(shelf);

    // 7. Center Console & Shifter
    const consoleGeo = new THREE.BoxGeometry(0.20, 0.18, 0.65);
    const consoleMesh = new THREE.Mesh(consoleGeo, this.matInterior);
    consoleMesh.position.set(0, 0.45, 0.04);
    interiorGroup.add(consoleMesh);

    // Gear shift boot and knob
    const bootGeo = new THREE.ConeGeometry(0.04, 0.08, 8);
    const boot = new THREE.Mesh(bootGeo, this.matBumper);
    boot.position.set(0, 0.56, 0.14);
    interiorGroup.add(boot);

    const knobGeo = new THREE.SphereGeometry(0.024, 12, 12);
    const knob = new THREE.Mesh(knobGeo, this.matInterior);
    knob.position.set(0, 0.62, 0.14);
    interiorGroup.add(knob);

    this.group.add(interiorGroup);
  }

  private buildWheels() {
    const wheelRadius = 0.31;
    const wheelWidth = 0.20;

    // Real-world 97.2-inch (2.47m) wheelbase:
    // Front axle at Z = +1.24m, Rear axle at Z = -1.23m
    const wheelPositions = [
      { name: 'FL', x: 0.78, y: wheelRadius, z: 1.24, steerable: true, isLeft: true },
      { name: 'FR', x: -0.78, y: wheelRadius, z: 1.24, steerable: true, isLeft: false },
      { name: 'RL', x: 0.78, y: wheelRadius, z: -1.23, steerable: false, isLeft: true },
      { name: 'RR', x: -0.78, y: wheelRadius, z: -1.23, steerable: false, isLeft: false }
    ];

    wheelPositions.forEach((cfg) => {
      const steerGroup = new THREE.Group();
      steerGroup.position.set(cfg.x, cfg.y, cfg.z);

      const spinGroup = new THREE.Group();

      // Rubber Tire
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
      const tireMat = new THREE.MeshStandardMaterial({
        color: this.colors.tireRubber,
        roughness: 0.95
      });
      const tireMesh = new THREE.Mesh(tireGeo, tireMat);
      tireMesh.rotation.z = Math.PI / 2;
      tireMesh.castShadow = true;
      spinGroup.add(tireMesh);
      this.wheelMeshes.push(tireMesh);

      // Alloy Turbine Hubcap Face
      const faceGeo = new THREE.CircleGeometry(wheelRadius * 0.88, 24);
      const faceMat = new THREE.MeshStandardMaterial({
        map: this.textures.wheel,
        roughness: 0.3,
        metalness: 0.65
      });
      const faceMesh = new THREE.Mesh(faceGeo, faceMat);
      faceMesh.position.x = (wheelWidth / 2 + 0.003) * (cfg.isLeft ? 1 : -1);
      faceMesh.rotation.y = cfg.isLeft ? Math.PI / 2 : -Math.PI / 2;
      spinGroup.add(faceMesh);

      // Brake Rotor & Caliper
      const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 14);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.8,
        roughness: 0.3
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.z = Math.PI / 2;
      disc.position.x = -0.04 * (cfg.isLeft ? 1 : -1);
      spinGroup.add(disc);

      steerGroup.add(spinGroup);
      this.group.add(steerGroup);

      this.wheelSpinNodes.push(spinGroup);
      if (cfg.steerable) {
        this.wheelSteerNodes.push(steerGroup);
      }
    });
  }

  private buildExteriorDetails() {
    // 1. Front Grille & Headlight Facia Block
    const faciaGeo = new THREE.PlaneGeometry(1.66, 0.28);
    const faciaMat = new THREE.MeshStandardMaterial({
      map: this.textures.frontGrille,
      roughness: 0.4
    });
    const faciaMesh = new THREE.Mesh(faciaGeo, faciaMat);
    faciaMesh.position.set(0, 0.66, 2.12);
    this.group.add(faciaMesh);

    // Front Corner Indicators (Amber Turn Signals on bumper corners)
    const frontIndGeo = new THREE.BoxGeometry(0.10, 0.15, 0.04);
    const leftFrontInd = new THREE.Mesh(frontIndGeo, this.matLeftBlinker);
    leftFrontInd.position.set(0.74, 0.66, 2.13);
    this.group.add(leftFrontInd);

    const rightFrontInd = new THREE.Mesh(frontIndGeo, this.matRightBlinker);
    rightFrontInd.position.set(-0.74, 0.66, 2.13);
    this.group.add(rightFrontInd);

    // Front offset License Plate
    const plateGeo = new THREE.BoxGeometry(0.28, 0.14, 0.02);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.set(-0.42, 0.36, 2.37);
    this.group.add(plateMesh);

    // 2. DISCRETE 3D TAILLIGHT CLUSTERS
    // RULE: Blinkers ALWAYS go on the outside edge of the car. Brake lights ALWAYS in the center.
    // Car Left Cluster (Driver side): centered at X = +0.58, Y = 0.66, Z = -2.135
    // Car Right Cluster (Passenger side): centered at X = -0.58, Y = 0.66, Z = -2.135
    const buildTailCluster = (isLeft: boolean) => {
      const clusterG = new THREE.Group();
      const posX = isLeft ? 0.58 : -0.58;
      clusterG.position.set(posX, 0.66, -2.135);

      // Black Bezel Casing Surround
      const bezelGeo = new THREE.BoxGeometry(0.38, 0.18, 0.03);
      const bezel = new THREE.Mesh(bezelGeo, this.matBumper);
      bezel.position.set(0, 0, 0);
      clusterG.add(bezel);

      // Lens segment dimensions:
      // Mounted onto the rear face of the bezel, protruding towards -Z
      const segH = 0.15;
      const segD = 0.025;
      const lensZ = -0.02; // Protrudes backward toward the viewer (more negative Z)

      // OUTSIDE SEGMENT: Amber Turn Signal / Blinker
      // On Left (+X): outside is local +X (+0.12). In world: 0.58 + 0.12 = +0.70 (outer left edge)
      // On Right (-X): outside is local -X (-0.12). In world: -0.58 - 0.12 = -0.70 (outer right edge)
      const amberX = isLeft ? 0.12 : -0.12;
      const amberGeo = new THREE.BoxGeometry(0.10, segH, segD);
      const amberMesh = new THREE.Mesh(amberGeo, isLeft ? this.matLeftBlinker : this.matRightBlinker);
      amberMesh.position.set(amberX, 0, lensZ);
      clusterG.add(amberMesh);

      // MIDDLE SEGMENT: White / Clear Reverse Light
      const revX = isLeft ? 0.025 : -0.025;
      const revGeo = new THREE.BoxGeometry(0.07, segH, segD);
      const revMesh = new THREE.Mesh(revGeo, this.matReverseLight);
      revMesh.position.set(revX, 0, lensZ);
      clusterG.add(revMesh);

      // INSIDE / CENTER SEGMENT: Ruby Red Dual Brake & Tail Light (towards vehicle center X=0)
      // On Left (+X): inside is local -X (-0.095). In world: 0.58 - 0.095 = +0.485 (towards center)
      // On Right (-X): inside is local +X (+0.095). In world: -0.58 + 0.095 = -0.485 (towards center)
      const brakeX = isLeft ? -0.095 : 0.095;
      const brakeGeo = new THREE.BoxGeometry(0.15, segH, segD);
      const brakeMesh = new THREE.Mesh(brakeGeo, this.matBrakeLight);
      brakeMesh.position.set(brakeX, 0, lensZ);
      clusterG.add(brakeMesh);

      return clusterG;
    };

    this.group.add(buildTailCluster(true));  // Left Taillight (Amber on Left Outside, Red on Inside)
    this.group.add(buildTailCluster(false)); // Right Taillight (Amber on Right Outside, Red on Inside)

    // Center Tailgate Garnish & Rear License Plate (between clusters from X = -0.38 to +0.38)
    const rearCenterGarnishGeo = new THREE.BoxGeometry(0.74, 0.18, 0.025);
    const rearCenterGarnish = new THREE.Mesh(rearCenterGarnishGeo, this.matBumper);
    rearCenterGarnish.position.set(0, 0.66, -2.135);
    this.group.add(rearCenterGarnish);

    const rearPlateGeo = new THREE.BoxGeometry(0.30, 0.14, 0.015);
    const rearPlateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const rearPlate = new THREE.Mesh(rearPlateGeo, rearPlateMat);
    rearPlate.position.set(0, 0.64, -2.152);
    this.group.add(rearPlate);

    const badgeGeo = new THREE.BoxGeometry(0.46, 0.025, 0.012);
    const badgeMesh = new THREE.Mesh(badgeGeo, this.matChrome);
    badgeMesh.position.set(0, 0.725, -2.152);
    this.group.add(badgeMesh);

    // Rear Brake Light PointLight (illuminates bumper and ground when braking)
    this.rearBrakeLight = new THREE.PointLight(0xff1111, 0, 4, 1.5);
    this.rearBrakeLight.position.set(0, 0.66, -2.25);
    this.group.add(this.rearBrakeLight);

    // Functional Headlight Spots
    [-0.50, 0.50].forEach((x) => {
      const spot = new THREE.SpotLight(0xfff7ed, 0, 35, Math.PI / 5, 0.4, 1.2);
      spot.position.set(x, 0.66, 2.2);
      spot.target.position.set(x, 0.2, 10);
      this.group.add(spot);
      this.group.add(spot.target);
      this.headlightSpots.push(spot);
    });

    // Stainless Exhaust Pipe
    const pipeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.2
    });
    const exhaust = new THREE.Mesh(pipeGeo, pipeMat);
    exhaust.position.set(-0.54, 0.24, -2.16);
    exhaust.rotation.x = Math.PI / 2;
    this.group.add(exhaust);

    // Front Bumper with Aerodynamic Wrap-Around Corners & Lower Lip
    const fBumperGeo = new THREE.BoxGeometry(1.72, 0.18, 0.32);
    const fBumper = new THREE.Mesh(fBumperGeo, this.matBumper);
    fBumper.position.set(0, 0.44, 2.22);
    fBumper.castShadow = true;
    this.group.add(fBumper);

    const fChinGeo = new THREE.BoxGeometry(1.64, 0.08, 0.22);
    const fChin = new THREE.Mesh(fChinGeo, this.matBumper);
    fChin.position.set(0, 0.32, 2.18);
    this.group.add(fChin);

    // Rear Bumper
    const rBumperGeo = new THREE.BoxGeometry(1.72, 0.18, 0.28);
    const rBumper = new THREE.Mesh(rBumperGeo, this.matBumper);
    rBumper.position.set(0, 0.46, -2.22);
    rBumper.castShadow = true;
    this.group.add(rBumper);

    // Aerodynamic flared wheel arches
    [-1, 1].forEach((side) => {
      [1.24, -1.23].forEach((axleZ) => {
        const archGeo = new THREE.BoxGeometry(0.04, 0.05, 0.74);
        const arch = new THREE.Mesh(archGeo, this.matBody);
        arch.position.set(0.85 * side, 0.64, axleZ);
        this.group.add(arch);
      });
    });
  }

  public setSteering(angleRad: number) {
    this.steeringAngle = THREE.MathUtils.clamp(angleRad, -0.62, 0.62);
    this.wheelSteerNodes.forEach((node) => {
      node.rotation.y = this.steeringAngle;
    });
    if (this.interiorSteeringWheel) {
      this.interiorSteeringWheel.rotation.z = -this.steeringAngle * 2.5;
    }
  }

  public rollWheels(distanceTraveled: number) {
    const wheelRadius = 0.31;
    const deltaAngle = distanceTraveled / wheelRadius;
    this.wheelRotation += deltaAngle;
    this.wheelSpinNodes.forEach((node) => {
      node.rotation.x = this.wheelRotation;
    });
  }

  public setWheelSpeed(radPerSec: number) {
    this.wheelSpinSpeed = radPerSec;
  }

  public toggleDoor(doorName: keyof CarDoorState): boolean {
    const d = this.doors[doorName];
    if (d) {
      d.target = d.target === 0 ? d.max : 0;
      return d.target !== 0;
    }
    return false;
  }

  public setDoorProgress(doorName: keyof CarDoorState, progress01: number) {
    const d = this.doors[doorName];
    if (d) {
      d.target = d.max * THREE.MathUtils.clamp(progress01, 0, 1);
    }
  }

  public setHeadlights(state?: boolean) {
    this.headlightsOn = state !== undefined ? state : !this.headlightsOn;
    this.headlightSpots.forEach((s) => {
      s.intensity = this.headlightsOn ? 3.5 : 0;
    });
  }

  public setBrakeLights(state: boolean) {
    this.brakeLightsOn = state;
    if (state) {
      this.matBrakeLight.emissive.setHex(0xff0000);
      this.matBrakeLight.emissiveIntensity = 2.8;
      if (this.rearBrakeLight) this.rearBrakeLight.intensity = 2.0;
    } else {
      this.matBrakeLight.emissive.setHex(0x380505);
      this.matBrakeLight.emissiveIntensity = 0.4;
      if (this.rearBrakeLight) this.rearBrakeLight.intensity = 0;
    }
  }

  // Update live in-car working dashboard and taillight indicators
  public updateDashboard(telemetry: TelemetryData, headlightsOn: boolean, steerInput: number, dt: number) {
    this.dashboardManager.render(telemetry, headlightsOn, steerInput);

    // Blinker logic for outside taillight indicators
    this.blinkTimer += dt;
    if (this.blinkTimer > 0.32) {
      this.blinkState = !this.blinkState;
      this.blinkTimer = 0;
    }

    const isLeftSignaling = steerInput < -0.15;
    const isRightSignaling = steerInput > 0.15;

    // Left outer amber blinker
    if (isLeftSignaling && this.blinkState) {
      this.matLeftBlinker.emissive.setHex(0xf59e0b);
      this.matLeftBlinker.emissiveIntensity = 2.2;
    } else {
      this.matLeftBlinker.emissive.setHex(0x000000);
      this.matLeftBlinker.emissiveIntensity = 0;
    }

    // Right outer amber blinker
    if (isRightSignaling && this.blinkState) {
      this.matRightBlinker.emissive.setHex(0xf59e0b);
      this.matRightBlinker.emissiveIntensity = 2.2;
    } else {
      this.matRightBlinker.emissive.setHex(0x000000);
      this.matRightBlinker.emissiveIntensity = 0;
    }
  }

  public update(deltaTime: number) {
    // Wheel spin when moving
    if (Math.abs(this.wheelSpinSpeed) > 0.001) {
      this.wheelRotation += this.wheelSpinSpeed * deltaTime;
      this.wheelSpinNodes.forEach((node) => {
        node.rotation.x = this.wheelRotation;
      });
    }

    // Door animation interpolation
    for (const key of Object.keys(this.doors) as (keyof CarDoorState)[]) {
      const d = this.doors[key];
      if (d.pivot) {
        d.current = THREE.MathUtils.lerp(d.current, d.target, Math.min(deltaTime * 8, 1));
        if (key === 'hood' || key === 'trunk') {
          d.pivot.rotation.x = d.current;
        } else {
          d.pivot.rotation.y = d.current;
        }
      }
    }
  }
}
