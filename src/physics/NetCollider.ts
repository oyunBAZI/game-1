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
    if (Math.abs(ball.velocity.z) < 1e-8) return null;
    const sign = ball.velocity.z > 0 ? -1 : 1;
    const contactZ = sign * (TABLE.netThickness * 0.5 + ball.radius);
    const travel = ball.position.z - ball.previousPosition.z;
    const fraction = (contactZ - ball.previousPosition.z) / travel;
    if (fraction < 0 || fraction > 1) return null;
    const center = ball.previousPosition.clone().lerp(ball.position, fraction);
    if (Math.abs(center.x) > this.width / 2 + ball.radius ||
        center.y < this.bottomY - ball.radius || center.y > this.topY + ball.radius) return null;
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
