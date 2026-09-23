import * as THREE from "three";
import { TABLE } from "../physics/constants";
import type { MaterialPalette } from "./ProceduralMaterials";

export class ArenaVisual {
  readonly group = new THREE.Group();
  private readonly signageTexture: THREE.CanvasTexture;
  private readonly scoreCanvas: HTMLCanvasElement;
  private readonly scoreTexture: THREE.CanvasTexture;
  private displayedScore = "";

  constructor(materials: MaterialPalette) {
    this.group.name = "arena-visual";
    this.addFloor(materials);
    this.addWalls(materials);
    this.addArchitecture(materials);
    this.addCourtMarkers(materials);
    this.addCeilingRig(materials);
    this.signageTexture = this.createSignage();
    this.addBarriers(materials);
    this.addStands(materials);
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

  private addFloor(materials: MaterialPalette): void {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    const playingFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 8.6), materials.floor.clone());
    (playingFloor.material as THREE.MeshStandardMaterial).color.setHex(0xd1e6e6);
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
  }

  private addWalls(materials: MaterialPalette): void {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), materials.wall);
    back.position.set(0, 2.5, -5.8);
    back.receiveShadow = true;
    this.group.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 5), materials.wall);
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
    const accent = new THREE.MeshStandardMaterial({ color: 0x37a7a9, emissive: 0x136368, emissiveIntensity: 0.7 });
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
    const canvas = document.createElement("canvas");
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
    const signMaterial = new THREE.MeshBasicMaterial({ map: this.signageTexture, side: THREE.DoubleSide });
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
      this.group.add(tier);
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
    this.group.add(seats, torsos, heads);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.035, 0.04), materials.metal);
    rail.position.set(0, 1.01, -5.47);
    this.group.add(rail);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.04, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x49b8b8 })
    );
    glow.position.set(0, 0.86, -5.58);
    this.group.add(glow);
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
    this.signageTexture.dispose();
    this.scoreTexture.dispose();
  }
}
