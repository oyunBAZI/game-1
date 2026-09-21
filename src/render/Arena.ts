import * as THREE from "three";
import { TABLE } from "../physics/constants";
import type { MaterialPalette } from "./ProceduralMaterials";

export class ArenaVisual {
  readonly group = new THREE.Group();
  private readonly signageTexture: THREE.CanvasTexture;
  private readonly scoreboardTexture: THREE.CanvasTexture;
  private readonly scoreboardContext: CanvasRenderingContext2D | null;
  private displayedScore = "";

  constructor(materials: MaterialPalette) {
    this.group.name = "arena-visual";
    this.addFloor(materials);
    this.addWalls(materials);
    this.addCourtMarkers(materials);
    const scoreCanvas = document.createElement("canvas");
    scoreCanvas.width = 1024;
    scoreCanvas.height = 320;
    this.scoreboardContext = scoreCanvas.getContext("2d");
    this.scoreboardTexture = new THREE.CanvasTexture(scoreCanvas);
    this.scoreboardTexture.colorSpace = THREE.SRGBColorSpace;
    this.updateScore(0, 0, "READY");
    this.addCeilingRig(materials);
    this.signageTexture = this.createSignage();
    this.addBarriers(materials);
    this.addStands(materials);
  }

  private addFloor(materials: MaterialPalette): void {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    const underlay = new THREE.Mesh(
      new THREE.PlaneGeometry(13.8, 17.8),
      new THREE.MeshStandardMaterial({ color: 0x223b43, roughness: 0.78, metalness: 0.05 })
    );
    underlay.rotation.x = -Math.PI / 2;
    underlay.position.y = -0.006;
    this.group.add(underlay);
    // The blue competition mat sits on top of the concrete arena floor.
    const mat = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 9.1),
      new THREE.MeshStandardMaterial({
        color: 0x12556e, roughness: 0.8, metalness: 0.02,
        bumpMap: materials.floor.bumpMap, bumpScale: 0.001
      })
    );
    mat.rotation.x = -Math.PI / 2;
    mat.position.y = 0.003;
    mat.receiveShadow = true;
    this.group.add(mat);
    const trim = new THREE.Mesh(
      new THREE.PlaneGeometry(7.62, 9.22),
      new THREE.MeshBasicMaterial({ color: 0x63a9b1, side: THREE.DoubleSide })
    );
    trim.rotation.x = -Math.PI / 2;
    trim.position.y = 0.001;
    this.group.add(trim);
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

  private addCourtMarkers(materials: MaterialPalette): void {
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x7cb6bd, transparent: true, opacity: 0.5 });
    for (const z of [-4.25, -2.7, 2.7, 4.25]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.001, 0.016), lineMaterial);
      line.position.set(0, 0.005, z);
      this.group.add(line);
    }
    for (const x of [-3.55, 3.55]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.001, 8.5), lineMaterial);
      line.position.set(x, 0.005, 0);
      this.group.add(line);
    }
    const centerMark = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.765, 64), lineMaterial);
    centerMark.rotation.x = -Math.PI / 2;
    centerMark.position.y = 0.006;
    this.group.add(centerMark);
  }

  private addCeilingRig(materials: MaterialPalette): void {
    for (const x of [-3.2, 0, 3.2]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.025, 0.34),
        new THREE.MeshBasicMaterial({ color: 0xd3f7f2, transparent: true, opacity: 0.78 })
      );
      light.position.set(x, 4.8, 0);
      this.group.add(light);
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
    scoreboard.position.set(0, 2.98, -5.55);
    this.group.add(scoreboard);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.68, 0.77),
      new THREE.MeshBasicMaterial({ map: this.scoreboardTexture, toneMapped: false })
    );
    screen.position.set(0, 2.98, -5.45);
    this.group.add(screen);
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
    for (const z of [-3.1, 3.1]) {
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
    const tier = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.28, 1.7), materials.tableEdge);
    tier.position.set(0, 0.16, -4.65);
    tier.receiveShadow = true;
    this.group.add(tier);
    const seat = new THREE.BoxGeometry(0.32, 0.36, 0.27);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x32606b, roughness: 0.76 });
    const seats = new THREE.InstancedMesh(seat, seatMaterial, 64);
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 32; col += 1) {
        dummy.position.set((col - 15.5) * 0.33, 0.43 + row * 0.28, -4.1 - row * 0.66);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        seats.setMatrixAt(index++, dummy.matrix);
      }
    }
    seats.receiveShadow = true;
    this.group.add(seats);
    const heads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.105, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x9b9b9b, roughness: 0.95 }), 44
    );
    const spectators = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.13, 0.18, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.92 }), 44
    );
    const colors = [0x244b5c, 0x6d635c, 0x364251, 0x2d676c, 0x604c48];
    for (let i = 0; i < 44; i += 1) {
      const col = i % 22;
      const row = Math.floor(i / 22);
      dummy.position.set((col - 10.5) * 0.47, 0.94 + row * 0.28, -4.1 - row * 0.66);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      heads.setColorAt(i, new THREE.Color(i % 4 === 0 ? 0x715341 : 0xb4896a));
      dummy.position.y -= 0.25;
      dummy.scale.set(1, 0.88, 0.9);
      dummy.updateMatrix();
      spectators.setMatrixAt(i, dummy.matrix);
      spectators.setColorAt(i, new THREE.Color(colors[(i * 17 + row) % colors.length]));
    }
    this.group.add(heads, spectators);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.04, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x49b8b8 })
    );
    glow.position.set(0, 0.86, -5.58);
    this.group.add(glow);
  }

  dispose(): void {
    this.signageTexture.dispose();
    this.scoreboardTexture.dispose();
  }

  updateScore(home: number, away: number, phase: string): void {
    const key = `${home}:${away}:${phase}`;
    if (key === this.displayedScore) return;
    this.displayedScore = key;
    const ctx = this.scoreboardContext;
    if (!ctx) return;
    ctx.fillStyle = "#071b27";
    ctx.fillRect(0, 0, 1024, 320);
    ctx.fillStyle = "#36b9b5";
    ctx.fillRect(0, 0, 1024, 11);
    ctx.fillStyle = "#92c5c5";
    ctx.textAlign = "center";
    ctx.font = "600 32px Arial, sans-serif";
    ctx.fillText(`COURT 01   /   ${phase.toUpperCase()}`, 512, 57);
    ctx.font = "bold 38px Arial, sans-serif";
    ctx.fillText("HOME", 260, 116);
    ctx.fillText("AWAY", 764, 116);
    ctx.fillStyle = "#f2f9f6";
    ctx.font = "bold 158px Arial, sans-serif";
    ctx.fillText(String(home).padStart(2, "0"), 260, 266);
    ctx.fillText(String(away).padStart(2, "0"), 764, 266);
    ctx.fillStyle = "#39aaa9";
    ctx.fillRect(510, 91, 4, 184);
    this.scoreboardTexture.needsUpdate = true;
  }
}
