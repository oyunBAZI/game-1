import * as THREE from "three";
import { TABLE } from "../physics/constants";
import type { MaterialPalette } from "./ProceduralMaterials";

export class ArenaVisual {
  readonly group = new THREE.Group();
  private readonly signageTexture: THREE.CanvasTexture;

  constructor(materials: MaterialPalette) {
    this.group.name = "arena-visual";
    this.addFloor(materials);
    this.addWalls(materials);
    this.addCourtMarkers(materials);
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
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x31545d, transparent: true, opacity: 0.52 });
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
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.04, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x49b8b8 })
    );
    glow.position.set(0, 0.86, -5.58);
    this.group.add(glow);
  }

  dispose(): void {
    this.signageTexture.dispose();
  }
}
