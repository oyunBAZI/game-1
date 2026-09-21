import * as THREE from "three";
import { Quat } from "../core/Quat";
import { Vec3 } from "../core/Vec3";
import { BALL } from "../physics/constants";
import type { BallState } from "../physics/State";
import type { MaterialPalette } from "./ProceduralMaterials";

export class BallVisual {
  readonly mesh: THREE.Mesh;
  readonly group = new THREE.Group();
  private readonly trail: THREE.Line;
  private readonly trailPositions: THREE.Vector3[] = [];
  private readonly ballQuaternion = new Quat();

  constructor(materials: MaterialPalette) {
    const geometry = new THREE.SphereGeometry(BALL.radius, 24, 16);
    this.mesh = new THREE.Mesh(geometry, materials.ball);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.name = "ball-visual";
    this.group.add(this.mesh);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({ color: 0xd5fbf4, transparent: true, opacity: 0.22 })
    );
    this.trail.visible = false;
    this.group.add(this.trail);
  }

  sync(state: BallState, alpha: number, showTrail = false): void {
    const interpolated = Vec3.from(state.previousPosition).lerp(state.position, alpha);
    this.group.position.set(interpolated.x, interpolated.y, interpolated.z);
    const spinAxis = state.angularVelocity.clone();
    const angle = spinAxis.length() * 0.004;
    if (angle > 0.0001) {
      spinAxis.normalize();
      this.ballQuaternion.copy(Quat.fromAxisAngle(spinAxis, angle));
      const quaternion = new THREE.Quaternion(
        this.ballQuaternion.x,
        this.ballQuaternion.y,
        this.ballQuaternion.z,
        this.ballQuaternion.w
      );
      this.mesh.quaternion.multiply(quaternion);
    }
    this.trail.visible = showTrail;
    if (showTrail) {
      this.trailPositions.push(new THREE.Vector3(interpolated.x, interpolated.y, interpolated.z));
      if (this.trailPositions.length > 12) this.trailPositions.shift();
      const geometry = this.trail.geometry;
      geometry.setFromPoints(this.trailPositions);
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}