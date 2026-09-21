import * as THREE from "three";
import { TABLE } from "../physics/constants";
import type { MaterialPalette } from "./ProceduralMaterials";

export class ArenaVisual {
  readonly group = new THREE.Group();

  constructor(materials: MaterialPalette) {
    this.group.name = "arena-visual";
    this.addFloor(materials);
    this.addWalls(materials);
    this.addCourtMarkers(materials);
    this.addCeilingRig(materials);
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
}