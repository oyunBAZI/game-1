import { Vec3 } from "../core/Vec3";
import type { CollisionContact } from "../core/types";
import { TABLE } from "./constants";
import type { BallState } from "./State";

export interface TableCollision {
  contact: CollisionContact;
  normal: Vec3;
  surface: "top" | "edge" | "side";
}

/** Continuous sphere versus the finite tabletop, including its rounded contact
 * envelope at the edges. An expanded box alone gives false corner contacts. */
export class TableCollider {
  readonly topY = TABLE.top;
  readonly left = -TABLE.width / 2;
  readonly right = TABLE.width / 2;
  readonly near = -TABLE.length / 2;
  readonly far = TABLE.length / 2;
  private readonly bottom = TABLE.top - TABLE.thickness;

  detect(ball: BallState): TableCollision | null {
    const start = ball.previousPosition;
    const end = ball.position;
    const radius = ball.radius;
    const radiusSq = radius * radius;
    // Slab intersection against the expanded bounds rejects most flight steps.
    let entry = 0;
    let exit = 1;
    for (const [a, b, low, high] of [
      [start.x, end.x, this.left - radius, this.right + radius],
      [start.y, end.y, this.bottom - radius, this.topY + radius],
      [start.z, end.z, this.near - radius, this.far + radius]
    ]) {
      const delta = b - a;
      if (Math.abs(delta) < 1e-12) {
        if (a < low || a > high) return null;
      } else {
        const first = (low - a) / delta;
        const second = (high - a) / delta;
        entry = Math.max(entry, Math.min(first, second));
        exit = Math.min(exit, Math.max(first, second));
        if (entry > exit) return null;
      }
    }

    const distanceSq = (t: number): number => {
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      const z = start.z + (end.z - start.z) * t;
      const dx = x - Math.max(this.left, Math.min(this.right, x));
      const dy = y - Math.max(this.bottom, Math.min(this.topY, y));
      const dz = z - Math.max(this.near, Math.min(this.far, z));
      return dx * dx + dy * dy + dz * dz;
    };

    // Distance to a convex box along a segment is convex. Find its minimum,
    // then the first crossing of the true sphere/box contact envelope.
    let low = entry;
    let high = exit;
    for (let i = 0; i < 22; i += 1) {
      const third = (high - low) / 3;
      if (distanceSq(low + third) < distanceSq(high - third)) high -= third;
      else low += third;
    }
    const minimum = (low + high) / 2;
    if (distanceSq(minimum) > radiusSq + 1e-10) return null;
    low = entry;
    high = minimum;
    for (let i = 0; i < 25; i += 1) {
      const middle = (low + high) / 2;
      if (distanceSq(middle) <= radiusSq) high = middle;
      else low = middle;
    }
    const time = distanceSq(entry) <= radiusSq ? entry : high;
    const center = start.clone().lerp(end, time);
    const point = new Vec3(
      Math.max(this.left, Math.min(this.right, center.x)),
      Math.max(this.bottom, Math.min(this.topY, center.y)),
      Math.max(this.near, Math.min(this.far, center.z))
    );
    const normal = center.clone().sub(point);
    if (normal.lengthSq() < 1e-12) return null;
    normal.normalize();
    if (end.clone().sub(start).dot(normal) >= -1e-9) return null;

    const surface: TableCollision["surface"] = normal.y > 0.94 ? "top" :
      normal.y > 0.08 && point.y > this.topY - 0.003 ? "edge" : "side";
    return {
      contact: {
        kind: surface === "top" ? "table" : "edge",
        timeOfImpact: time,
        point: point.toJSON(),
        normal: normal.toJSON(),
        penetration: Math.max(0, radius - Math.sqrt(distanceSq(time))),
        relativeSpeed: -ball.velocity.dot(normal),
        surfaceId: `table-${surface}`
      },
      normal,
      surface
    };
  }

  isOverTop(x: number, z: number): boolean {
    return x >= this.left && x <= this.right && z >= this.near && z <= this.far;
  }

  sideForZ(z: number): "home" | "away" {
    return z >= 0 ? "home" : "away";
  }

  isOnPlayingSurface(position: Vec3): boolean {
    return this.isOverTop(position.x, position.z) && position.y >= this.topY - 0.03;
  }
}
