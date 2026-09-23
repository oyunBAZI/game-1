import * as THREE from "three";
import { TABLE } from "../physics/constants";
import type { MaterialPalette } from "./ProceduralMaterials";
import type { ArenaProfile } from "../content/ArenaCatalog";
import { createArenaSurface, type FloorFinish } from "./ArenaSurfaces";
import { ArenaDressing } from "./ArenaDressing";
import { ArenaAtmosphere } from "./ArenaAtmosphere";

export class ArenaVisual {
  readonly group = new THREE.Group();
  readonly dressing = new ArenaDressing();
  readonly atmosphere = new ArenaAtmosphere();
  private readonly signageTexture: THREE.CanvasTexture;
  private readonly signageCanvas: HTMLCanvasElement;
  private readonly scoreCanvas: HTMLCanvasElement;
  private readonly scoreTexture: THREE.CanvasTexture;
  private readonly courtFloor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly mainFloor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly wallMaterial: THREE.MeshStandardMaterial;
  private readonly ledMaterial = new THREE.MeshStandardMaterial({ color: 0x37a7a9, emissive: 0x136368, emissiveIntensity: 0.7 });
  private readonly crowd = new THREE.Group();
  private readonly sideStands = new THREE.Group();
  private readonly animatedSpectators: Array<{ mesh: THREE.InstancedMesh; base: Float32Array }> = [];
  private cheerTime = 0;
  private cheerWasActive = false;
  private baseLedIntensity = 0.52;
  private readonly floorFinishes = new Map<FloorFinish, [THREE.CanvasTexture, THREE.CanvasTexture]>();
  private readonly courtGraphics = new THREE.Group();
  private readonly trainingProps = new THREE.Group();
  private readonly clubProps = new THREE.Group();
  private readonly nightProps = new THREE.Group();
  private readonly signMaterial: THREE.MeshBasicMaterial;
  private displayedScore = "";

  constructor(materials: MaterialPalette) {
    this.group.name = "arena-visual";
    [this.mainFloor, this.courtFloor] = this.addFloor(materials);
    this.group.add(this.atmosphere.group);
    this.wallMaterial = materials.wall.clone();
    this.addWalls();
    this.addArchitecture(materials);
    this.group.add(this.dressing.group);
    this.addCourtMarkers(materials);
    this.addCeilingRig(materials);
    this.signageCanvas = document.createElement("canvas");
    this.signageTexture = this.createSignage();
    this.signMaterial = new THREE.MeshBasicMaterial({ map: this.signageTexture, side: THREE.DoubleSide });
    this.addBarriers(materials);
    this.addStands(materials);
    this.addSpectatorDetails(this.crowd);
    this.addSpectatorDetails(this.sideStands);
    this.addProductionDetails(materials);
    this.addVenueProps(materials);
    this.group.add(this.crowd, this.sideStands, this.courtGraphics, this.trainingProps, this.clubProps, this.nightProps);
    this.scoreCanvas = document.createElement("canvas");
    this.scoreCanvas.width = 1024;
    this.scoreCanvas.height = 256;
    this.scoreTexture = new THREE.CanvasTexture(this.scoreCanvas);
    this.scoreTexture.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(2.67, 0.77),
      new THREE.MeshBasicMaterial({ map: this.scoreTexture, toneMapped: false })
    );
    display.name = "arena-score-display";
    display.position.set(0, 3.5, -5.457);
    this.group.add(display);
    this.updateScore(0, 0, 0, 0);
  }

  private addFloor(materials: MaterialPalette): [THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>, THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>] {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), materials.floor.clone());
    floor.name = "arena-floor";
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    const playingFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 8.6), materials.floor.clone());
    playingFloor.name = "court-floor";
    playingFloor.rotation.x = -Math.PI / 2;
    playingFloor.position.y = 0.003;
    playingFloor.receiveShadow = true;
    this.group.add(playingFloor);
    const trim = new THREE.MeshStandardMaterial({ color: 0x85a7aa, metalness: 0.56, roughness: 0.44 });
    for (const x of [-3.91, 3.91]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 8.66), trim);
      strip.position.set(x, 0.007, 0);
      this.group.add(strip);
    }
    for (const z of [-4.31, 4.31]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(7.84, 0.008, 0.022), trim);
      strip.position.set(0, 0.007, z);
      this.group.add(strip);
    }
    return [floor, playingFloor];
  }

  private addWalls(): void {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), this.wallMaterial);
    back.position.set(0, 2.5, -5.8);
    back.receiveShadow = true;
    this.group.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 5), this.wallMaterial);
    left.rotation.y = Math.PI / 2;
    left.position.set(-7, 2.5, 0);
    this.group.add(left);
    const right = left.clone();
    right.position.x = 7;
    right.rotation.y = -Math.PI / 2;
    this.group.add(right);
  }

  private addArchitecture(materials: MaterialPalette): void {
    const charcoal = new THREE.MeshStandardMaterial({ color: 0x152933, metalness: 0.46, roughness: 0.54 });
    const copper = new THREE.MeshStandardMaterial({ color: 0x8b8070, metalness: 0.64, roughness: 0.41 });
    const accent = this.ledMaterial;
    // Ribbed walls, recessed spectator gallery and continuous arena fascia.
    for (const x of [-6.6, -4.4, -2.2, 0, 2.2, 4.4, 6.6]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.085, 4.65, 0.15), charcoal);
      rib.position.set(x, 2.42, -5.71);
      this.group.add(rib);
      const inset = new THREE.Mesh(new THREE.BoxGeometry(0.018, 2.1, 0.16), copper);
      inset.position.set(x + 0.061, 2.8, -5.61);
      this.group.add(inset);
    }
    for (const y of [1.45, 4.32]) {
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(13.7, 0.12, 0.19), charcoal);
      fascia.position.set(0, y, -5.61);
      this.group.add(fascia);
      const light = new THREE.Mesh(new THREE.BoxGeometry(13.35, 0.012, 0.012), accent);
      light.position.set(0, y + 0.067, -5.5);
      this.group.add(light);
    }
    for (const x of [-6.88, 6.88]) {
      for (const z of [-5.25, -3, -0.75, 1.5, 3.75]) {
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.13, 4.8, 0.14), charcoal);
        upright.position.set(x, 2.45, z);
        this.group.add(upright);
        const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.045), accent);
        sconce.position.set(x + (x < 0 ? 0.085 : -0.085), 3.16, z);
        this.group.add(sconce);
      }
    }
    for (const z of [-3.9, -1.95, 0, 1.95, 3.9]) {
      const truss = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.075, 0.075), materials.metal);
      truss.position.set(0, 5.02, z);
      this.group.add(truss);
      for (const x of [-5, 5]) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.23, 0.28), charcoal);
        bracket.position.set(x, 4.88, z);
        this.group.add(bracket);
      }
    }
  }

  private addCourtMarkers(materials: MaterialPalette): void {
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0x8aa8ab, transparent: true, opacity: 0.46, roughness: 0.8 });
    for (const z of [-4.2, -2.7, 2.7, 4.2]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.004, 0.018), lineMaterial);
      line.position.set(0, 0.004, z);
      this.group.add(line);
    }
    for (const x of [-3.8, 3.8]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 10.5), lineMaterial);
      line.position.set(x, 0.005, 0);
      this.group.add(line);
    }
  }

  private addCeilingRig(materials: MaterialPalette): void {
    for (const x of [-3.2, 0, 3.2]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.035, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xe9fff5, emissive: 0xccefe8, emissiveIntensity: 1.4 })
      );
      light.position.set(x, 4.8, 0);
      this.group.add(light);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.09, 0.41), materials.metal);
      housing.position.set(x, 4.87, 0);
      this.group.add(housing);
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.8, 6),
        materials.metal
      );
      cable.position.set(x, 5.2, 0);
      this.group.add(cable);
    }
    const scoreboard = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.9, 0.16),
      materials.tableEdge
    );
    scoreboard.position.set(0, 3.5, -5.55);
    this.group.add(scoreboard);
  }

  private createSignage(): THREE.CanvasTexture {
    const canvas = this.signageCanvas;
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#112c38";
      ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = "#1b9da8";
      ctx.fillRect(0, 0, 1024, 12);
      ctx.fillRect(0, 244, 1024, 12);
      ctx.fillStyle = "#e6f0e9";
      ctx.font = "bold 86px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TABLE  /  TENNIS", 512, 120);
      ctx.fillStyle = "#80b9bb";
      ctx.font = "bold 33px Arial, sans-serif";
      ctx.fillText("PRO CIRCUIT     •     COURT 01", 512, 190);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  private addBarriers(materials: MaterialPalette): void {
    const signMaterial = this.signMaterial;
    // Leave the home baseline open to the competitive camera. A barrier here
    // filled the foreground and obscured the racket and lower table.
    for (const z of [-3.1]) {
      for (const x of [-2.4, 0, 2.4]) {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.68, 0.07), materials.tableEdge);
        barrier.position.set(x, 0.36, z);
        barrier.castShadow = true;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.28, 0.57), signMaterial);
        sign.position.set(x, 0.36, z + (z < 0 ? 0.04 : -0.04));
        this.group.add(barrier, sign);
      }
    }
    for (const x of [-3.55, 3.55]) {
      for (const z of [-1.9, 0, 1.9]) {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.68, 1.87), materials.tableEdge);
        barrier.position.set(x, 0.36, z);
        barrier.castShadow = true;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.57), signMaterial);
        sign.rotation.y = Math.PI / 2;
        sign.position.set(x + (x < 0 ? 0.04 : -0.04), 0.36, z);
        this.group.add(barrier, sign);
      }
    }
  }

  private addStands(materials: MaterialPalette): void {
    const columns = 32;
    const rows = 4;
    const seat = new THREE.BoxGeometry(0.27, 0.18, 0.24);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x51747a, roughness: 0.82 });
    const seats = new THREE.InstancedMesh(seat, seatMaterial, columns * rows);
    const torsos = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.085, 0.12, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }),
      columns * rows
    );
    const heads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.063, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xbda58d, roughness: 0.95 }),
      columns * rows
    );
    torsos.name = "rear-spectator-torsos";
    heads.name = "rear-spectator-heads";
    const dummy = new THREE.Object3D();
    let index = 0;
    const shirtColors = [0x233a43, 0x537077, 0x87938f, 0x30606a, 0x3f4a51, 0x725c50];
    const skinColors = [0xcaa681, 0x8b5b46, 0xd6b798, 0xa57a61, 0x665049];
    for (let row = 0; row < rows; row += 1) {
      const z = -3.85 - row * 0.49;
      const height = 0.13 + row * 0.24;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(11, 0.22, 0.52), materials.tableEdge);
      tier.position.set(0, height, z);
      tier.receiveShadow = true;
      this.crowd.add(tier);
      for (let col = 0; col < columns; col += 1) {
        const x = (col - (columns - 1) / 2) * 0.34;
        dummy.position.set(x, height + 0.18, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        seats.setMatrixAt(index++, dummy.matrix);
        seats.setColorAt(index - 1, new THREE.Color((row + col) % 5 === 0 ? 0x315861 : 0x53737a));
        // Empty seats break up the silhouette of the crowd. Reuse the same
        // instanced geometry, collapsing unoccupied instances out of view.
        const occupied = (col * 17 + row * 11) % 7 !== 0;
        dummy.scale.setScalar(occupied ? 1 : 0.001);
        dummy.position.set(x, height + 0.46, z - 0.02);
        dummy.updateMatrix();
        torsos.setMatrixAt(index - 1, dummy.matrix);
        torsos.setColorAt(index - 1, new THREE.Color(shirtColors[(col * 3 + row * 5) % shirtColors.length]));
        dummy.position.y += 0.19;
        dummy.updateMatrix();
        heads.setMatrixAt(index - 1, dummy.matrix);
        heads.setColorAt(index - 1, new THREE.Color(skinColors[(col * 7 + row * 3) % skinColors.length]));
      }
    }
    seats.receiveShadow = true;
    this.crowd.add(seats, torsos, heads);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.035, 0.04), materials.metal);
    rail.position.set(0, 1.01, -5.47);
    this.crowd.add(rail);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.04, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x49b8b8 })
    );
    glow.position.set(0, 0.86, -5.58);
    this.crowd.add(glow);
    this.addSideStands(materials);
  }

  /** A gallery on each sideline gives the broadcast view depth and a proper
   * competition-hall silhouette. Seats and spectators share three instanced
   * draw calls instead of a mesh per person. */
  private addSideStands(materials: MaterialPalette): void {
    this.sideStands.name = "arena-side-stands";
    const rows = 4;
    const columns = 23;
    const count = rows * columns * 2;
    const seatGeometry = new THREE.BoxGeometry(0.26, 0.17, 0.24);
    const seats = new THREE.InstancedMesh(seatGeometry,
      new THREE.MeshStandardMaterial({ color: 0x6a8386, roughness: 0.82 }), count);
    const torsos = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.081, 0.12, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), count);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.061, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xbda58d, roughness: 0.91 }), count);
    torsos.name = "side-spectator-torsos";
    heads.name = "side-spectator-heads";
    const dummy = new THREE.Object3D();
    const fabric = [0x20333d, 0x738080, 0x916b61, 0x475c68, 0x38585b];
    const skin = [0xd3ab85, 0x93684d, 0xe2c19c, 0x64473e];
    let index = 0;
    for (const sign of [-1, 1]) {
      for (let row = 0; row < rows; row += 1) {
        const x = sign * (4.18 + row * 0.47);
        const height = 0.19 + row * 0.24;
        const tier = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.23, 8), materials.tableEdge);
        tier.position.set(x, height, -0.1);
        tier.receiveShadow = true;
        this.sideStands.add(tier);
        for (let column = 0; column < columns; column += 1) {
          const z = -3.68 + column * 0.33;
          const vacant = (column * 19 + row * 13 + sign * 7) % 8 === 0 || column === 11;
          dummy.position.set(x, height + 0.18, z);
          dummy.rotation.set(0, sign * Math.PI / 2, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          seats.setMatrixAt(index, dummy.matrix);
          seats.setColorAt(index, new THREE.Color((column + row) % 6 === 0 ? 0x395d66 : 0x638184));
          dummy.scale.setScalar(vacant ? 0.001 : 1);
          dummy.position.y = height + 0.46;
          dummy.updateMatrix();
          torsos.setMatrixAt(index, dummy.matrix);
          torsos.setColorAt(index, new THREE.Color(fabric[(column * 3 + row * 7) % fabric.length]));
          dummy.position.y += 0.19;
          dummy.updateMatrix();
          heads.setMatrixAt(index, dummy.matrix);
          heads.setColorAt(index, new THREE.Color(skin[(column * 5 + row * 3) % skin.length]));
          index += 1;
        }
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 8), materials.metal);
      rail.position.set(sign * 3.92, 1.04, -0.1);
      this.sideStands.add(rail);
      for (const z of [-3.8, -1.85, 0.1, 2.05, 3.85]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.9, 6), materials.metal);
        post.position.set(sign * 3.92, 0.56, z);
        this.sideStands.add(post);
      }
    }
    seats.receiveShadow = true;
    seats.instanceMatrix.needsUpdate = true;
    torsos.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    this.sideStands.add(seats, torsos, heads);
  }

  /** Costume silhouette details reuse two instanced draws per gallery. The
   * exposed arms and varied hair make people read as spectators at game
   * distance without a separate draw call or texture for every seat. */
  private addSpectatorDetails(stand: THREE.Group): void {
    const prefix = stand === this.crowd ? "rear" : "side";
    const torsos = stand.getObjectByName(`${prefix}-spectator-torsos`) as THREE.InstancedMesh;
    const heads = stand.getObjectByName(`${prefix}-spectator-heads`) as THREE.InstancedMesh;
    const arms = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.025, 0.135, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 }), torsos.count * 2);
    arms.name = `${prefix}-spectator-arms`;
    const hair = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.064, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.53),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 }), heads.count);
    hair.name = `${prefix}-spectator-hair`;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const hairColors = [0x242426, 0x3d2c26, 0x72503b, 0x9b8263, 0x292c36];
    for (let index = 0; index < torsos.count; index += 1) {
      torsos.getMatrixAt(index, matrix);
      matrix.decompose(position, rotation, scale);
      const occupied = scale.x > 0.1;
      torsos.getColorAt(index, color);
      for (let arm = 0; arm < 2; arm += 1) {
        const side = arm === 0 ? -1 : 1;
        dummy.position.copy(position).add(new THREE.Vector3(side * 0.106, 0.005, 0).applyQuaternion(rotation));
        dummy.quaternion.copy(rotation).multiply(new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1), side * 0.22));
        dummy.scale.setScalar(occupied ? 1 : 0.001);
        dummy.updateMatrix();
        arms.setMatrixAt(index * 2 + arm, dummy.matrix);
        arms.setColorAt(index * 2 + arm, color);
      }
      heads.getMatrixAt(index, matrix);
      matrix.decompose(position, rotation, scale);
      dummy.position.copy(position).add(new THREE.Vector3(0, 0.026, 0));
      dummy.quaternion.copy(rotation);
      dummy.scale.setScalar(occupied ? 1 : 0.001);
      dummy.updateMatrix();
      hair.setMatrixAt(index, dummy.matrix);
      hair.setColorAt(index, new THREE.Color(hairColors[(index * 11 + (prefix === "side" ? 3 : 0)) % hairColors.length]));
    }
    arms.instanceMatrix.needsUpdate = hair.instanceMatrix.needsUpdate = true;
    stand.add(arms, hair);
    for (const mesh of [torsos, heads, arms, hair]) {
      this.animatedSpectators.push({ mesh, base: new Float32Array(mesh.instanceMatrix.array) });
    }
  }

  celebrate(): void {
    this.cheerTime = 1.2;
    this.cheerWasActive = true;
  }

  update(dt: number, reducedMotion = false): void {
    if (!this.cheerWasActive) return;
    this.cheerTime = Math.max(0, this.cheerTime - Math.max(0, dt));
    const energy = reducedMotion ? 0 : this.cheerTime / 1.2;
    const pulse = Math.sin((1.2 - this.cheerTime) * 26) * energy;
    this.ledMaterial.emissiveIntensity = this.baseLedIntensity + Math.max(0, pulse) * 0.62;
    for (const { mesh, base } of this.animatedSpectators) {
      const positions = mesh.instanceMatrix.array;
      for (let index = 0; index < mesh.count; index += 1) {
        const offset = index * 16 + 13;
        positions[offset] = base[offset] + (base[index * 16 + 5] > 0.1
          ? Math.max(0, Math.sin((1.2 - this.cheerTime) * 17 + index * 1.7)) * energy * 0.055 : 0);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.cheerTime === 0) this.cheerWasActive = false;
  }

  /** Production equipment and architectural detail stay away from the playable
   * volume. Shared materials and repeated shapes keep draw cost predictable. */
  private addProductionDetails(materials: MaterialPalette): void {
    const acoustic = new THREE.MeshStandardMaterial({ color: 0x26323b, roughness: 0.94 });
    const felt = new THREE.MeshStandardMaterial({ color: 0x101b23, roughness: 0.96 });
    for (const x of [-5.05, -3.8, 3.8, 5.05]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.65, 0.09), acoustic);
      panel.position.set(x, 2.6, -5.66);
      this.group.add(panel);
      for (let index = 0; index < 7; index += 1) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.016, 1.45, 0.01), felt);
        slit.position.set(x - 0.39 + index * 0.13, 2.6, -5.6);
        this.group.add(slit);
      }
    }

    // Repeated broadcast boards read as printed tournament fixtures, while
    // the broad unmarked center keeps the 40 mm ball legible.
    for (const x of [-2.55, 2.55]) {
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.31), this.signMaterial);
      mat.rotation.x = -Math.PI / 2;
      mat.rotation.z = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      mat.position.set(x, 0.012, 0);
      this.courtGraphics.add(mat);
      const safetyStrip = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.003, 5.4), this.ledMaterial);
      safetyStrip.position.set(x > 0 ? 3.63 : -3.63, 0.008, 0);
      this.courtGraphics.add(safetyStrip);
    }

    const camera = new THREE.Group();
    camera.name = "broadcast-camera";
    camera.position.set(-4.35, 0, 1.35);
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1b252c, roughness: 0.38, metalness: 0.68 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x182a36, roughness: 0.13, metalness: 0.25, clearcoat: 0.95 });
    for (let index = 0; index < 3; index += 1) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 1.08, 8), darkMetal);
      foot.position.set(Math.cos(index * Math.PI * 2 / 3) * 0.17, 0.55, Math.sin(index * Math.PI * 2 / 3) * 0.17);
      foot.rotation.z = Math.cos(index * Math.PI * 2 / 3) * 0.22;
      foot.rotation.x = Math.sin(index * Math.PI * 2 / 3) * 0.22;
      camera.add(foot);
    }
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 12), materials.metal);
    mount.position.y = 1.18;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.2, 0.28), darkMetal);
    body.position.set(0, 1.45, 0);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.18, 24), darkMetal);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 1.46, 0.21);
    const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.057, 24), glass);
    lensGlass.position.set(0, 1.46, 0.31);
    camera.add(mount, body, lens, lensGlass);
    camera.rotation.y = 1.15;
    this.group.add(camera);
  }

  private addVenueProps(materials: MaterialPalette): void {
    const labGlass = new THREE.MeshPhysicalMaterial({
      color: 0x637e84, metalness: 0.24, roughness: 0.26, clearcoat: 0.8, clearcoatRoughness: 0.2
    });
    for (const x of [-4.7, 4.7]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.55, 0.09), materials.tableEdge);
      frame.position.set(x, 3.05, -5.56);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 1.38), labGlass);
      pane.position.set(x, 3.05, -5.50);
      this.trainingProps.add(frame, pane);
      for (const y of [2.72, 3.13, 3.54]) {
        const graph = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.009, 0.009), this.ledMaterial);
        graph.position.set(x, y, -5.487);
        this.trainingProps.add(graph);
      }
    }

    const woodSlat = new THREE.BoxGeometry(0.13, 2.36, 0.12);
    const slats = new THREE.InstancedMesh(woodSlat, materials.wood, 40);
    const slat = new THREE.Object3D();
    for (let index = 0; index < 40; index += 1) {
      slat.position.set(-6.5 + index * 0.335, 2.88, -5.55);
      slat.updateMatrix();
      slats.setMatrixAt(index, slat.matrix);
    }
    slats.instanceMatrix.needsUpdate = true;
    this.clubProps.add(slats);
    for (const x of [-4.65, 4.65]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.77, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xffdeb0, emissive: 0xe6a754, emissiveIntensity: 0.7 }));
      lamp.position.set(x, 3.3, -5.41);
      this.clubProps.add(lamp);
    }

    for (const x of [-4.55, 4.55]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.095, 3.65, 0.11), this.ledMaterial);
      pillar.position.set(x, 2.18, -5.43);
      this.nightProps.add(pillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.095, 0.11), this.ledMaterial);
    lintel.position.set(0, 4.04, -5.43);
    this.nightProps.add(lintel);

    const cart = new THREE.Group();
    cart.name = "training-ball-cart";
    cart.position.set(3.4, 0, -2.6);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.42), materials.metal);
    basket.position.y = 0.78;
    cart.add(basket);
    for (const x of [-0.22, 0.22]) {
      for (const z of [-0.16, 0.16]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 12), materials.rubberBlack);
        wheel.position.set(x, 0.045, z);
        wheel.rotation.z = Math.PI / 2;
        cart.add(wheel);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.55, 0.018), materials.metal);
        leg.position.set(x, 0.37, z);
        cart.add(leg);
      }
    }
    const balls = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.019, 10, 8), materials.ball, 28
    );
    const instance = new THREE.Object3D();
    for (let index = 0; index < 28; index += 1) {
      instance.position.set(-0.21 + (index % 7) * 0.07, 0.985 + Math.floor(index / 14) * 0.028,
        -0.12 + (Math.floor(index / 7) % 2) * 0.09);
      instance.updateMatrix();
      balls.setMatrixAt(index, instance.matrix);
    }
    cart.add(balls);
    this.trainingProps.add(cart);

    const bench = new THREE.Group();
    bench.name = "club-bench";
    bench.position.set(3.9, 0, -1.2);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.09, 0.36), materials.wood);
    seat.position.y = 0.44;
    seat.castShadow = true;
    bench.add(seat);
    for (const x of [-0.65, 0.65]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.25), materials.metal);
      leg.position.set(x, 0.22, 0);
      bench.add(leg);
    }
    this.clubProps.add(bench);
    const otherBench = bench.clone();
    otherBench.position.set(-3.9, 0, -1.2);
    this.clubProps.add(otherBench);

    for (const x of [-3.58, 3.58]) {
      for (const z of [-2.6, 0, 2.6]) {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.13, 2.1, 0.13), materials.tableEdge);
        pylon.position.set(x, 1.05, z);
        const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.016, 1.92, 0.065), this.ledMaterial);
        emitter.position.set(x + (x < 0 ? 0.073 : -0.073), 1.08, z);
        this.nightProps.add(pylon, emitter);
      }
    }
  }

  setProfile(profile: ArenaProfile): void {
    this.dressing.setProfile(profile);
    this.atmosphere.setProfile(profile);
    const floor = new THREE.Color(profile.floorColor);
    this.mainFloor.material.color.copy(floor);
    this.courtFloor.material.color.copy(floor).lerp(new THREE.Color(0x749ca6), 0.18);
    const finish = profile.id as FloorFinish;
    let surfaces = this.floorFinishes.get(finish);
    if (!surfaces) {
      const main = createArenaSurface(finish);
      const playing = main.clone();
      main.repeat.set(10, 13);
      playing.repeat.set(6, 7);
      main.needsUpdate = playing.needsUpdate = true;
      surfaces = [main, playing];
      this.floorFinishes.set(finish, surfaces);
    }
    this.mainFloor.material.map = surfaces[0];
    this.courtFloor.material.map = surfaces[1];
    this.mainFloor.material.roughness = profile.id === "club-hall" ? 0.69 : 0.83;
    this.courtFloor.material.roughness = profile.id === "night-court" ? 0.74 : 0.64;
    this.mainFloor.material.needsUpdate = this.courtFloor.material.needsUpdate = true;
    this.wallMaterial.color.setHex(profile.wallColor);
    this.ledMaterial.color.setHex(profile.accentColor);
    this.ledMaterial.emissive.setHex(profile.accentColor);
    this.baseLedIntensity = profile.id === "night-court" ? 1.3 : 0.52;
    this.ledMaterial.emissiveIntensity = this.baseLedIntensity;
    this.crowd.visible = profile.crowd !== "none";
    this.sideStands.visible = profile.crowd === "full";
    this.courtGraphics.visible = profile.id !== "training-lab";
    this.trainingProps.visible = profile.id === "training-lab";
    this.clubProps.visible = profile.id === "club-hall";
    this.nightProps.visible = profile.id === "night-court";
    const ctx = this.signageCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#101c25";
      ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = `#${profile.accentColor.toString(16).padStart(6, "0")}`;
      ctx.fillRect(0, 0, 1024, 12);
      ctx.fillRect(0, 244, 1024, 12);
      ctx.fillStyle = "#f2f1e8";
      ctx.font = "bold 79px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TABLE  /  TENNIS", 512, 114);
      ctx.font = "bold 33px Arial, sans-serif";
      ctx.fillText(`${profile.label.toUpperCase()}     •     COURT 01`, 512, 188);
      this.signageTexture.needsUpdate = true;
    }
  }

  updateScore(home: number, away: number, homeGames: number, awayGames: number): void {
    const score = `${home}:${away}:${homeGames}:${awayGames}`;
    if (score === this.displayedScore) return;
    this.displayedScore = score;
    const ctx = this.scoreCanvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#08171d";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = "#36b2b0";
    ctx.fillRect(0, 0, 1024, 8);
    ctx.fillStyle = "#91adae";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOME", 170, 57);
    ctx.fillText("SETS", 512, 57);
    ctx.fillText("AWAY", 854, 57);
    ctx.fillStyle = "#f3f1df";
    ctx.font = "bold 138px monospace";
    ctx.fillText(String(home).padStart(2, "0"), 175, 202);
    ctx.fillText(String(away).padStart(2, "0"), 849, 202);
    ctx.font = "bold 75px monospace";
    ctx.fillStyle = "#4fd1c5";
    ctx.fillText(`${homeGames}  :  ${awayGames}`, 512, 181);
    this.scoreTexture.needsUpdate = true;
  }

  dispose(): void {
    this.dressing.dispose();
    this.atmosphere.dispose();
    this.signageTexture.dispose();
    this.scoreTexture.dispose();
    for (const surfaces of this.floorFinishes.values()) surfaces.forEach((surface) => surface.dispose());
    this.floorFinishes.clear();
  }
}
