import * as THREE from "three";
import type { PaddleState } from "../physics/State";
import type { MaterialPalette } from "./ProceduralMaterials";

export class PaddleVisual {
  readonly group = new THREE.Group();
  private readonly face: THREE.Mesh;
  private readonly handle: THREE.Mesh;
  private readonly edge: THREE.Mesh;
  private readonly side: "home" | "away";

  constructor(side: "home" | "away", materials: MaterialPalette) {
    this.side = side;
    this.group.name = "paddle-" + side;
    this.face = new THREE.Mesh(
      new THREE.BoxGeometry(0.155, 0.165, 0.012, 2, 2, 2),
      side === "home" ? materials.rubberRed : materials.rubberBlack
    );
    this.face.castShadow = true;
    this.edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.18, 0.016),
      materials.wood
    );
    this.edge.castShadow = true;
    this.handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.017, 0.1, 12),
      materials.wood
    );
    this.handle.rotation.z = Math.PI / 2;
    this.handle.position.x = 0.12;
    this.handle.castShadow = true;
    this.group.add(this.edge, this.face, this.handle);
  }

  sync(state: PaddleState, alpha: number): void {
    const position = state.previousPosition.clone().lerp(state.position, alpha);
    this.group.position.set(position.x, position.y, position.z);
    const normal = state.normal.clone().normalize();
    const target = new THREE.Vector3(normal.x, normal.y, normal.z);
    this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, this.side === "home" ? -1 : 1), target);
    const speed = state.swingVelocity.length();
    this.group.rotation.z += speed * 0.0004;
  }

  setVisible(value: boolean): void {
    this.group.visible = value;
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
      else mesh.material?.dispose();
    });
  }
}