import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { PhysicsTuning } from "./constants";
import { BALL } from "./constants";
import type { BallState } from "./State";

export interface AerodynamicSample {
  drag: Vec3;
  magnus: Vec3;
  gravity: Vec3;
  total: Vec3;
  speed: number;
  spinRate: number;
  reynoldsApproximation: number;
}

export class Aerodynamics {
  private readonly dragDirection = new Vec3();
  private readonly magnus = new Vec3();
  private readonly gravity = new Vec3();
  private readonly total = new Vec3();

  constructor(private readonly tuning: PhysicsTuning) {}

  forces(ball: BallState): AerodynamicSample {
    const speed = ball.velocity.length();
    const spinRate = ball.angularVelocity.length();
    const drag = this.dragForce(ball.velocity, speed);
    const magnus = this.magnusForce(ball.velocity, ball.angularVelocity);
    this.gravity.set(0, this.tuning.gravity * ball.mass, 0);
    this.total.copy(drag).add(magnus).add(this.gravity);
    return {
      drag: drag.clone(),
      magnus: magnus.clone(),
      gravity: this.gravity.clone(),
      total: this.total.clone(),
      speed,
      spinRate,
      reynoldsApproximation: speed * BALL.diameter * this.tuning.airDensity / 0.0000181
    };
  }

  apply(ball: BallState, dt: number): AerodynamicSample {
    const sample = this.forces(ball);
    ball.addForce(sample.total);
    const angularDamping = Math.exp(-this.tuning.angularDrag * dt);
    ball.angularVelocity.multiplyScalar(angularDamping);
    return sample;
  }

  dragForce(velocity: Vec3, speed = velocity.length()): Vec3 {
    if (speed < 1e-7) return new Vec3();
    const magnitude =
      0.5 *
      this.tuning.airDensity *
      this.tuning.dragCoefficient *
      BALL.area *
      speed *
      speed;
    this.dragDirection.copy(velocity).normalize().negate();
    return this.dragDirection.multiplyScalar(magnitude);
  }

  magnusForce(velocity: Vec3, angularVelocity: Vec3): Vec3 {
    const speed = velocity.length();
    const spin = angularVelocity.length();
    if (speed < 1e-7 || spin < 1e-7) return new Vec3();
    this.magnus.crossVectors(angularVelocity, velocity);
    if (this.magnus.lengthSq() < 1e-12) return new Vec3();
    // Lift is bounded by dynamic pressure, like drag. Scaling omega x v
    // directly created accelerations larger than gravity for ordinary serves.
    const liftCoefficient = clamp(this.tuning.magnusCoefficient * spin * 8, 0, 0.6);
    const force = 0.5 * this.tuning.airDensity * BALL.area * speed * speed * liftCoefficient;
    return this.magnus.normalize().multiplyScalar(force);
  }

  estimateFlightTime(start: Vec3, velocity: Vec3, targetY: number, maxTime = 4): number {
    const gravity = this.tuning.gravity;
    const a = 0.5 * gravity;
    const b = velocity.y;
    const c = start.y - targetY;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return maxTime;
    const roots = [
      (-b + Math.sqrt(discriminant)) / (2 * a),
      (-b - Math.sqrt(discriminant)) / (2 * a)
    ].filter((root) => root >= 0);
    return Math.min(maxTime, ...(roots.length ? roots : [maxTime]));
  }
}
