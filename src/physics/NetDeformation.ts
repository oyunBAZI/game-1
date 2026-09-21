import { Vec3 } from "../core/Vec3";
import { TABLE } from "./constants";

export interface NetDeformationConfig {
  columns: number;
  rows: number;
  stiffness: number;
  damping: number;
  neighborStrength: number;
}

export interface NetNodeState {
  index: number;
  row: number;
  column: number;
  rest: Vec3;
  position: Vec3;
  velocity: Vec3;
  impulse: Vec3;
}

export class NetDeformation {
  readonly config: NetDeformationConfig;
  readonly nodes: NetNodeState[] = [];
  private readonly width = TABLE.width + 0.08;
  private readonly height = TABLE.netHeight;

  constructor(config: Partial<NetDeformationConfig> = {}) {
    this.config = {
      columns: config.columns ?? 17,
      rows: config.rows ?? 7,
      stiffness: config.stiffness ?? 190,
      damping: config.damping ?? 12,
      neighborStrength: config.neighborStrength ?? 34
    };
    this.createNodes();
  }

  applyImpulse(position: Vec3, impulse: Vec3, radius = 0.24): void {
    for (const node of this.nodes) {
      const distance = node.position.distanceTo(position);
      if (distance > radius) continue;
      const weight = 1 - distance / radius;
      node.impulse.addScaled(impulse, weight);
    }
  }

  step(dt: number): void {
    const nextVelocities = this.nodes.map((node) => node.velocity.clone());
    for (const node of this.nodes) {
      const spring = node.rest.clone().sub(node.position).multiplyScalar(this.config.stiffness);
      const damping = node.velocity.clone().multiplyScalar(-this.config.damping);
      const neighbor = this.neighborForce(node);
      const total = spring.add(damping).add(neighbor).add(node.impulse);
      nextVelocities[node.index].addScaled(total, dt);
      node.impulse.set(0, 0, 0);
    }
    for (const node of this.nodes) {
      node.velocity.copy(nextVelocities[node.index]);
      node.velocity.clampMagnitude(7);
      node.position.addScaled(node.velocity, dt);
      node.position.x = Math.max(-this.width / 2, Math.min(this.width / 2, node.position.x));
      node.position.y = Math.max(TABLE.top, Math.min(TABLE.top + this.height, node.position.y));
      node.position.z *= 0.96;
    }
  }

  flatten(amount = 1): void {
    for (const node of this.nodes) {
      node.position.lerp(node.rest, Math.max(0, Math.min(1, amount)));
      node.velocity.multiplyScalar(1 - amount);
    }
  }

  positions(): Vec3[] {
    return this.nodes.map((node) => node.position.clone());
  }

  reset(): void {
    for (const node of this.nodes) {
      node.position.copy(node.rest);
      node.velocity.set(0, 0, 0);
      node.impulse.set(0, 0, 0);
    }
  }

  private createNodes(): void {
    for (let row = 0; row < this.config.rows; row += 1) {
      for (let column = 0; column < this.config.columns; column += 1) {
        const rest = new Vec3(
          -this.width / 2 + (this.width * column) / (this.config.columns - 1),
          TABLE.top + (this.height * row) / (this.config.rows - 1),
          0
        );
        this.nodes.push({
          index: this.nodes.length,
          row,
          column,
          rest: rest.clone(),
          position: rest.clone(),
          velocity: new Vec3(),
          impulse: new Vec3()
        });
      }
    }
  }

  private neighborForce(node: NetNodeState): Vec3 {
    const force = new Vec3();
    for (const candidate of this.nodes) {
      if (candidate === node) continue;
      const rowDistance = Math.abs(candidate.row - node.row);
      const columnDistance = Math.abs(candidate.column - node.column);
      if (rowDistance + columnDistance !== 1) continue;
      force.add(candidate.position.clone().sub(node.position).multiplyScalar(this.config.neighborStrength));
    }
    return force;
  }
}