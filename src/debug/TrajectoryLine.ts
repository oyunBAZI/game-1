import * as THREE from "three";
import { Vec3 } from "../core/Vec3";

export class TrajectoryLine {
  readonly line: THREE.Line;
  private readonly points: THREE.Vector3[] = [];
  private readonly geometry: THREE.BufferGeometry;

  constructor(color = 0x54d6c7) {
    this.geometry = new THREE.BufferGeometry();
    this.line = new THREE.Line(
      this.geometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    this.line.visible = false;
  }

  update(points: readonly Vec3[]): void {
    this.points.length = 0;
    for (const point of points) this.points.push(new THREE.Vector3(point.x, point.y, point.z));
    this.geometry.setFromPoints(this.points);
  }

  setVisible(visible: boolean): void {
    this.line.visible = visible;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
  }
}