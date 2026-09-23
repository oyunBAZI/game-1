import { Vec3 } from "../core/Vec3";
import type { CollisionContact } from "../core/types";
import { BALL, TABLE } from "./constants";
import type { BallState } from "./State";

interface NetNode {
  position: Vec3;
  velocity: Vec3;
  rest: Vec3;
}

export interface NetSnapshot {
  positions: number[];
  velocities: number[];
}

export class NetCollider {
  readonly centerZ = 0;
  readonly bottomY = TABLE.top;
  readonly topY = TABLE.top + TABLE.netHeight;
  readonly width = TABLE.width + 0.08;
  private readonly nodes: NetNode[] = [];
  private readonly columns = 13;
  private readonly rows = 5;
  private readonly accelerations = new Float64Array(this.columns * this.rows);

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
    const travel = ball.position.z - ball.previousPosition.z;
    // Use the same displaced membrane shown by TableVisual. Checking only z=0
    // made a visibly bowed net collide at its undeformed rest position.
    if (Math.abs(travel) < 1e-8) return rigid;
    const reach = ball.radius + TABLE.netThickness * 0.5 + 0.075;
    if (Math.min(ball.position.z, ball.previousPosition.z) > reach ||
        Math.max(ball.position.z, ball.previousPosition.z) < -reach ||
        Math.min(ball.position.y, ball.previousPosition.y) > this.topY + ball.radius ||
        Math.max(ball.position.y, ball.previousPosition.y) < this.bottomY - ball.radius ||
        Math.min(ball.position.x, ball.previousPosition.x) > this.width / 2 + ball.radius ||
        Math.max(ball.position.x, ball.previousPosition.x) < -this.width / 2 - ball.radius) return rigid;
    const sign = travel > 0 ? -1 : 1;
    const center = new Vec3();
    const signedDistance = (fraction: number): number => {
      center.copy(ball.previousPosition).lerp(ball.position, fraction);
      return sign * (center.z - this.displacementAt(center.x, center.y) -
        sign * (TABLE.netThickness * 0.5 + ball.radius));
    };
    let previous = signedDistance(0);
    if (previous <= 0) return rigid;
    let fraction = -1;
    for (let sample = 1; sample <= 8; sample += 1) {
      const next = sample / 8;
      const distance = signedDistance(next);
      if (distance <= 0 && distance < previous) {
        let low = (sample - 1) / 8;
        let high = next;
        for (let iteration = 0; iteration < 18; iteration += 1) {
          const middle = (low + high) * 0.5;
          if (signedDistance(middle) > 0) low = middle;
          else high = middle;
        }
        fraction = high;
        break;
      }
      previous = distance;
    }
    if (fraction < 0) return rigid;
    center.copy(ball.previousPosition).lerp(ball.position, fraction);
    if (Math.abs(center.x) > this.width / 2 + ball.radius ||
        center.y < this.bottomY - ball.radius || center.y > this.topY + ball.radius - 0.006) return rigid;
    if (rigid && rigid.timeOfImpact <= fraction) return rigid;
    const dx = (this.displacementAt(center.x + 0.006, center.y) -
      this.displacementAt(center.x - 0.006, center.y)) / 0.012;
    const dy = (this.displacementAt(center.x, center.y + 0.004) -
      this.displacementAt(center.x, center.y - 0.004)) / 0.008;
    const normal = new Vec3(-dx * sign, -dy * sign, sign).normalize();
    return {
      kind: "net",
      timeOfImpact: fraction,
      point: center.clone().subScaled(normal, ball.radius).toJSON(),
      normal: normal.toJSON(),
      penetration: 0,
      relativeSpeed: Math.max(0, -ball.velocity.dot(normal)),
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
        if (targetRow === this.rows - 1 || targetColumn === 0 || targetColumn === this.columns - 1) continue;
        const node = this.nodes[targetRow * this.columns + targetColumn];
        const distance = Math.sqrt(rowOffset * rowOffset + columnOffset * columnOffset);
        node.velocity.z = Math.max(-2.5, Math.min(2.5,
          node.velocity.z + impulse.z * 45 / (1 + distance * 2)));
      }
    }
  }

  step(dt: number): void {
    // Read every neighbor before advancing any node so a wave travels through
    // the weave symmetrically. Posts and tape remain fixed as real anchors.
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const index = row * this.columns + column;
        if (row === this.rows - 1 || column === 0 || column === this.columns - 1) {
          this.accelerations[index] = 0;
          continue;
        }
        const node = this.nodes[index];
        const neighbors = this.nodes[index - 1].position.z + this.nodes[index + 1].position.z +
          (row > 0 ? this.nodes[index - this.columns].position.z : node.rest.z) +
          this.nodes[index + this.columns].position.z;
        this.accelerations[index] = (node.rest.z - node.position.z) * 170 +
          (neighbors - 4 * node.position.z) * 95 - node.velocity.z * 12;
      }
    }
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      node.velocity.z += this.accelerations[index] * dt;
      node.position.z = Math.max(-0.075, Math.min(0.075,
        node.position.z + node.velocity.z * dt));
    }
  }

  /** Bilinear interpolation in the same 13 x 5 grid used by the rendered net. */
  private displacementAt(x: number, y: number): number {
    return this.interpolate(x, y, "position");
  }

  private interpolate(x: number, y: number, field: "position" | "velocity"): number {
    const u = Math.max(0, Math.min(this.columns - 1, (x / this.width + 0.5) * (this.columns - 1)));
    const v = Math.max(0, Math.min(this.rows - 1, (y - this.bottomY) /
      TABLE.netHeight * (this.rows - 1)));
    const column = Math.min(this.columns - 2, Math.floor(u));
    const row = Math.min(this.rows - 2, Math.floor(v));
    const a = u - column;
    const b = v - row;
    const base = row * this.columns + column;
    const lower = this.nodes[base][field].z * (1 - a) + this.nodes[base + 1][field].z * a;
    const upper = this.nodes[base + this.columns][field].z * (1 - a) +
      this.nodes[base + this.columns + 1][field].z * a;
    return lower * (1 - b) + upper * b;
  }

  positions(): Vec3[] {
    return this.nodes.map((node) => node.position.clone());
  }

  velocityAt(x: number, y: number): Vec3 {
    return new Vec3(0, 0, this.interpolate(x, y, "velocity"));
  }

  snapshot(): NetSnapshot {
    return {
      positions: this.nodes.map((node) => node.position.z),
      velocities: this.nodes.map((node) => node.velocity.z)
    };
  }

  restore(snapshot?: NetSnapshot): void {
    if (!snapshot || snapshot.positions.length !== this.nodes.length ||
        snapshot.velocities.length !== this.nodes.length ||
        !snapshot.positions.every(Number.isFinite) || !snapshot.velocities.every(Number.isFinite)) {
      this.reset();
      return;
    }
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const anchored = index % this.columns === 0 || index % this.columns === this.columns - 1 ||
        index >= (this.rows - 1) * this.columns;
      node.position.z = anchored ? 0 : Math.max(-0.075, Math.min(0.075, snapshot.positions[index]));
      node.velocity.z = anchored ? 0 : Math.max(-2.5, Math.min(2.5, snapshot.velocities[index]));
    }
  }

  reset(): void {
    for (const node of this.nodes) {
      node.position.copy(node.rest);
      node.velocity.set(0, 0, 0);
    }
  }
}
