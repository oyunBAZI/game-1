import { Vec3 } from "../core/Vec3";
import type { CollisionContact } from "../core/types";
import { BALL, TABLE } from "./constants";
import type { BallState } from "./State";

interface NetNode {
  position: Vec3;
  velocity: Vec3;
  rest: Vec3;
}

export class NetCollider {
  readonly centerZ = 0;
  readonly bottomY = TABLE.top;
  readonly topY = TABLE.top + TABLE.netHeight;
  readonly width = TABLE.width + 0.08;
  private readonly nodes: NetNode[] = [];
  private readonly columns = 13;
  private readonly rows = 5;

  constructor() {
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const x = -this.width / 2 + (this.width * column) / (this.columns - 1);
        const y = this.bottomY + (TABLE.netHeight * row) / (this.rows - 1);
        const rest = new Vec3(x, y, this.centerZ);
        this.nodes.push({ position: rest.clone(), velocity: new Vec3(), rest });
      }
    }
  }

  detect(ball: BallState): CollisionContact | null {
    const cord = this.detectCord(ball);
    const leftPost = this.detectPost(ball, -this.width / 2);
    const rightPost = this.detectPost(ball, this.width / 2);
    const rigid = [cord, leftPost, rightPost].filter((hit): hit is CollisionContact => hit !== null)
      .sort((a, b) => a.timeOfImpact - b.timeOfImpact)[0] ?? null;
    // A ball can fall vertically onto the tape even without crossing the net.
    if (Math.abs(ball.velocity.z) < 1e-8) return rigid;
    const sign = ball.velocity.z > 0 ? -1 : 1;
    const contactZ = sign * (TABLE.netThickness * 0.5 + ball.radius);
    const travel = ball.position.z - ball.previousPosition.z;
    const fraction = (contactZ - ball.previousPosition.z) / travel;
    if (fraction < 0 || fraction > 1) return rigid;
    const center = ball.previousPosition.clone().lerp(ball.position, fraction);
    if (Math.abs(center.x) > this.width / 2 + ball.radius ||
        center.y < this.bottomY - ball.radius || center.y > this.topY + ball.radius - 0.006) return rigid;
    if (rigid && rigid.timeOfImpact < fraction) return rigid;
    const normal = new Vec3(0, 0, sign);
    return {
      kind: "net",
      timeOfImpact: fraction,
      point: center.clone().subScaled(normal, ball.radius).toJSON(),
      normal: normal.toJSON(),
      penetration: 0,
      relativeSpeed: ball.velocity.length(),
      surfaceId: "net-mesh"
    };
  }

  /** Swept sphere against the post's round body and capped ends. Its distance
   * to a finite line segment is convex along the flight chord, so a minimum
   * search followed by bisection catches fast glancing strikes. */
  private detectPost(ball: BallState, x: number): CollisionContact | null {
    const start = ball.previousPosition;
    const end = ball.position;
    const radius = ball.radius + 0.016;
    if (Math.min(start.x, end.x) > x + radius || Math.max(start.x, end.x) < x - radius ||
        Math.min(start.z, end.z) > radius || Math.max(start.z, end.z) < -radius ||
        Math.min(start.y, end.y) > this.topY + 0.08 + radius ||
        Math.max(start.y, end.y) < this.bottomY - radius) return null;
    const center = new Vec3();
    const closest = new Vec3();
    const distanceSq = (t: number): number => {
      center.copy(start).lerp(end, t);
      closest.set(x, Math.max(this.bottomY, Math.min(this.topY + 0.08, center.y)), 0);
      return center.distanceToSquared(closest);
    };
    if (distanceSq(0) <= radius * radius) return null;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 20; i += 1) {
      const third = (high - low) / 3;
      if (distanceSq(low + third) < distanceSq(high - third)) high -= third;
      else low += third;
    }
    const minimum = (low + high) / 2;
    if (distanceSq(minimum) > radius * radius) return null;
    low = 0;
    high = minimum;
    for (let i = 0; i < 24; i += 1) {
      const middle = (low + high) / 2;
      if (distanceSq(middle) <= radius * radius) high = middle;
      else low = middle;
    }
    const fraction = high;
    distanceSq(fraction);
    const normal = center.clone().sub(closest).normalize();
    if (end.clone().sub(start).dot(normal) >= 0) return null;
    return {
      kind: "net",
      timeOfImpact: fraction,
      point: center.subScaled(normal, ball.radius).toJSON(),
      normal: normal.toJSON(),
      penetration: 0,
      relativeSpeed: -ball.velocity.dot(normal),
      surfaceId: x < 0 ? "net-post-left" : "net-post-right"
    };
  }

  /** The top tape acts like a narrow cylinder. A grazing ball can skim over
   * it instead of receiving the full face-on reflection of the woven net. */
  private detectCord(ball: BallState): CollisionContact | null {
    const start = ball.previousPosition;
    const end = ball.position;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const y = start.y - this.topY;
    const radius = ball.radius + 0.006;
    const a = dy * dy + dz * dz;
    const b = 2 * (y * dy + start.z * dz);
    const c = y * y + start.z * start.z - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (a < 1e-12 || c <= 0 || discriminant < 0) return null;
    const fraction = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (fraction < 0 || fraction > 1) return null;
    const center = start.clone().lerp(end, fraction);
    if (Math.abs(center.x) > this.width / 2 + ball.radius || center.y < this.topY - 0.006) return null;
    const normal = new Vec3(0, center.y - this.topY, center.z).normalize();
    if (ball.velocity.dot(normal) >= 0) return null;
    return {
      kind: "net",
      timeOfImpact: fraction,
      point: center.subScaled(normal, ball.radius).toJSON(),
      normal: normal.toJSON(),
      penetration: 0,
      relativeSpeed: ball.velocity.length(),
      surfaceId: "net-cord"
    };
  }

  applyImpulse(point: Vec3, impulse: Vec3): void {
    const normalizedX = (point.x + this.width / 2) / this.width;
    const normalizedY = (point.y - this.bottomY) / TABLE.netHeight;
    const column = Math.round(normalizedX * (this.columns - 1));
    const row = Math.round(normalizedY * (this.rows - 1));
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const targetRow = Math.max(0, Math.min(this.rows - 1, row + rowOffset));
        const targetColumn = Math.max(0, Math.min(this.columns - 1, column + columnOffset));
        const node = this.nodes[targetRow * this.columns + targetColumn];
        const distance = Math.sqrt(rowOffset * rowOffset + columnOffset * columnOffset);
        // A lightweight visual membrane responds more visibly than its ball impulse.
        node.velocity.addScaled(impulse, 45 / (1 + distance * 2));
      }
    }
  }

  step(dt: number): void {
    for (const node of this.nodes) {
      const spring = node.rest.clone().sub(node.position).multiplyScalar(160);
      const damping = node.velocity.clone().multiplyScalar(-11);
      node.velocity.addScaled(spring.add(damping), dt);
      node.position.addScaled(node.velocity, dt);
      node.position.x = Math.max(-this.width / 2, Math.min(this.width / 2, node.position.x));
      node.position.y = Math.max(this.bottomY, Math.min(this.topY, node.position.y));
    }
  }

  positions(): Vec3[] {
    return this.nodes.map((node) => node.position.clone());
  }

  reset(): void {
    for (const node of this.nodes) {
      node.position.copy(node.rest);
      node.velocity.set(0, 0, 0);
    }
  }
}
