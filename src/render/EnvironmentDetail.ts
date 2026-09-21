import * as THREE from "three";
import type { MaterialPalette } from "./ProceduralMaterials";

export interface EnvironmentDetailOptions {
  banners: boolean;
  benches: boolean;
  plants: boolean;
  wallPanels: boolean;
}

export class EnvironmentDetail {
  readonly group = new THREE.Group();

  constructor(materials: MaterialPalette, options: Partial<EnvironmentDetailOptions> = {}) {
    const enabled = {
      banners: true,
      benches: true,
      plants: true,
      wallPanels: true,
      ...options
    };
    this.group.name = "environment-detail";
    if (enabled.banners) this.addBanners(materials);
    if (enabled.benches) this.addBenches(materials);
    if (enabled.plants) this.addPlants(materials);
    if (enabled.wallPanels) this.addWallPanels(materials);
  }

  private addBanners(materials: MaterialPalette): void {
    for (const [x, z, rotation] of [[-4.4, -4.9, 0], [4.4, -4.9, 0], [-5.5, 1.5, Math.PI / 2], [5.5, 1.5, -Math.PI / 2]] as Array<[number, number, number]>) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.6, 8), materials.metal);
      pole.position.set(x, 1.3, z);
      pole.rotation.z = rotation;
      this.group.add(pole);
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x183d46, roughness: 0.72, side: THREE.DoubleSide })
      );
      cloth.position.set(x + (rotation ? 0.1 : 0.38), 2.15, z);
      cloth.rotation.y = rotation;
      this.group.add(cloth);
    }
  }

  private addBenches(materials: MaterialPalette): void {
    for (const x of [-4.8, 4.8]) {
      const z = -1.8;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.42), materials.wood);
      bench.position.set(x, 0.65, z);
      bench.castShadow = true;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.55, 0.08), materials.metal);
      legs.position.set(x, 0.34, z);
      this.group.add(bench, legs);
    }
  }

  private addPlants(materials: MaterialPalette): void {
    for (const x of [-5.9, 5.9]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.35, 16), materials.wood);
      pot.position.set(x, 0.17, -4.9);
      const leaves = new THREE.Group();
      for (let index = 0; index < 7; index += 1) {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 6),
          new THREE.MeshStandardMaterial({ color: index % 2 ? 0x2d745b : 0x3b8b6d, roughness: 0.86 })
        );
        leaf.scale.set(0.7, 1.8, 0.65);
        leaf.position.set(Math.cos(index) * 0.2, 0.65 + (index % 3) * 0.12, Math.sin(index) * 0.2);
        leaves.add(leaf);
      }
      leaves.position.set(x, 0, -4.9);
      this.group.add(pot, leaves);
    }
  }

  private addWallPanels(materials: MaterialPalette): void {
    for (const x of [-2.2, 0, 2.2]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.05), materials.tableEdge);
      panel.position.set(x, 2.45, -5.72);
      const inset = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), materials.accent);
      inset.position.set(x, 2.45, -5.75);
      this.group.add(panel, inset);
    }
  }
}
