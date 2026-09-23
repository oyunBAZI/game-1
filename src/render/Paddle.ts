import * as THREE from "three";
import { PADDLE } from "../physics/constants";
import type { PaddleState } from "../physics/State";
import type { MaterialPalette } from "./ProceduralMaterials";

/** An elliptical laminated blade, separate rubber sheets and a tapered grip. */
export class PaddleVisual {
  readonly group = new THREE.Group();
  private readonly side: "home" | "away";

  constructor(side: "home" | "away", materials: MaterialPalette) {
    this.side = side;
    this.group.name = "paddle-" + side;
    const blade = new THREE.Shape();
    blade.absellipse(0, 0, PADDLE.faceWidth / 2, PADDLE.faceHeight / 2, 0, Math.PI * 2, false, 0);
    const wood = new THREE.ExtrudeGeometry(blade, {
      depth: PADDLE.faceThickness, bevelEnabled: true, bevelSize: 0.002,
      bevelThickness: 0.001, bevelSegments: 2, curveSegments: 40
    });
    wood.translate(0, 0, -PADDLE.faceThickness / 2);
    const core = new THREE.Mesh(wood, materials.wood);
    core.castShadow = true;
    this.group.add(core);
    const rubber = new THREE.CircleGeometry(1, 48);
    for (const [z, material] of [
      [PADDLE.faceThickness / 2 + 0.002, materials.rubberRed],
      [-PADDLE.faceThickness / 2 - 0.002, materials.rubberBlack]
    ] as const) {
      const sheet = new THREE.Mesh(rubber, material);
      sheet.scale.set(PADDLE.faceWidth / 2 - 0.003, PADDLE.faceHeight / 2 - 0.003, 1);
      sheet.position.z = z;
      sheet.rotation.y = z < 0 ? Math.PI : 0;
      sheet.castShadow = true;
      this.group.add(sheet);
    }
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.011, PADDLE.handleLength + 0.025, 12),
      materials.wood
    );
    handle.position.y = -PADDLE.faceHeight / 2 - PADDLE.handleLength / 2 + 0.009;
    handle.castShadow = true;
    this.group.add(handle);
    for (const y of [-0.087, -0.125]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0166, 0.0166, 0.005, 12), materials.metal);
      band.position.y = y;
      this.group.add(band);
    }
  }

  sync(state: PaddleState, alpha: number): void {
    const position = state.previousPosition.clone().lerp(state.position, alpha);
    this.group.position.set(position.x, position.y, position.z);
    const normal = state.previousNormal.clone().lerp(state.normal, alpha).normalize();
    const target = new THREE.Vector3(normal.x, normal.y, normal.z);
    this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, this.side === "home" ? -1 : 1), target);
  }

  setVisible(value: boolean): void {
    this.group.visible = value;
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
    });
  }
}
