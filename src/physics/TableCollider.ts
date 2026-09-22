import { Vec3 } from "../core/Vec3";
import type { CollisionContact } from "../core/types";
import { BALL, TABLE } from "./constants";
import type { BallState } from "./State";

export interface TableCollision {
  contact: CollisionContact;
  normal: Vec3;
  surface: "top" | "edge" | "side";
}

/** Analytical sphere sweeps against six faces, twelve edges and eight corners.
 * Closest-point validation rejects the false corners of an expanded AABB.
 */
export class TableCollider {
  readonly topY = TABLE.top;
  readonly left = -TABLE.width / 2;
  readonly right = TABLE.width / 2;
  readonly near = -TABLE.length / 2;
  readonly far = TABLE.length / 2;

  detect(ball: BallState): TableCollision | null {
    const lo = [this.left, TABLE.top - TABLE.thickness, this.near];
    const hi = [this.right, TABLE.top, this.far];
    const start = [ball.previousPosition.x, ball.previousPosition.y, ball.previousPosition.z];
    const end = [ball.position.x, ball.position.y, ball.position.z];
    const delta = end.map((v, i) => v - start[i]);
    const radius = ball.radius;
    if (lo.some((v, i) => Math.max(start[i], end[i]) < v - radius ||
      Math.min(start[i], end[i]) > hi[i] + radius)) return null;
    let earliest: TableCollision | null = null;
    let earliestTime = Infinity;
    const accept = (time: number): void => {
      if (time < -1e-8 || time > 1 || time >= earliestTime) return;
      time = Math.max(0, time);
      const center = start.map((v, i) => v + delta[i] * time);
      const point = center.map((v, i) => Math.max(lo[i], Math.min(hi[i], v)));
      const normal = new Vec3(center[0] - point[0], center[1] - point[1], center[2] - point[2]);
      if (Math.abs(normal.length() - radius) > 1e-6) return;
      normal.normalize();
      if (normal.x * delta[0] + normal.y * delta[1] + normal.z * delta[2] >= -1e-10) return;
      const surface = normal.y > 0.999999 ? "top" : normal.y > 1e-6 ? "edge" : "side";
      earliestTime = time;
      earliest = { surface, normal, contact: {
        kind: surface === "top" ? "table" : "edge", timeOfImpact: time,
        point: { x: point[0], y: point[1], z: point[2] }, normal: normal.toJSON(),
        penetration: 0, relativeSpeed: ball.velocity.length(), surfaceId: `table-${surface}`
      } };
    };
    for (let axis = 0; axis < 3; axis += 1) {
      if (Math.abs(delta[axis]) < 1e-12) continue;
      for (const sign of [-1, 1]) {
        const plane = (sign < 0 ? lo[axis] : hi[axis]) + sign * radius;
        accept((plane - start[axis]) / delta[axis]);
      }
    }
    const sphereRoot = (axes: number[], origin: number[]): void => {
      let a = 0, b = 0, c = -radius * radius;
      for (const axis of axes) {
        const offset = start[axis] - origin[axis];
        a += delta[axis] ** 2; b += 2 * offset * delta[axis]; c += offset ** 2;
      }
      const discriminant = b * b - 4 * a * c;
      if (a > 1e-16 && discriminant >= 0) accept((-b - Math.sqrt(discriminant)) / (2 * a));
    };
    for (let axis = 0; axis < 3; axis += 1) {
      const other = [0, 1, 2].filter((value) => value !== axis);
      for (const a of [lo[other[0]], hi[other[0]]]) for (const b of [lo[other[1]], hi[other[1]]]) {
        const origin = [0, 0, 0]; origin[other[0]] = a; origin[other[1]] = b;
        sphereRoot(other, origin);
      }
    }
    for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) {
      sphereRoot([0, 1, 2], [x, y, z]);
    }
    return earliest;
  }

  isOverTop(x: number, z: number): boolean {
    return x >= this.left && x <= this.right && z >= this.near && z <= this.far;
  }
  sideForZ(z: number): "home" | "away" { return z >= 0 ? "home" : "away"; }
  detectEdge(ball: BallState): TableCollision | null {
    const hit = this.detect(ball);
    return hit?.surface === "edge" ? hit : null;
  }
  isOnPlayingSurface(position: Vec3): boolean {
    return this.isOverTop(position.x, position.z) && position.y >= this.topY - BALL.radius * 1.5;
  }
}
