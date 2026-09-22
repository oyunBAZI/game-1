import { clamp } from "../core/MathUtils";
import { Vec3 } from "../core/Vec3";
import type { PhysicsTuning } from "./constants";
import { Aerodynamics } from "./Aerodynamics";
import type { BallState, WorldState } from "./State";

export class BallIntegrator {
  private readonly acceleration = new Vec3();
  private readonly angularAcceleration = new Vec3();
  private readonly aerodynamics: Aerodynamics;

  constructor(private readonly tuning: PhysicsTuning) {
    this.aerodynamics = new Aerodynamics(tuning);
  }

  integrate(ball: BallState, dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError("Invalid integration step");
    if (dt === 0) return;
    // Explicit midpoint: sample velocity-dependent drag and lift halfway through
    // flight, avoiding the first-order position drift of semi-implicit Euler.
    const startVelocity = ball.velocity.clone();
    const startSpin = ball.angularVelocity.clone();
    const externalForce = ball.force.clone();
    const inertia = (2 / 3) * ball.mass * ball.radius * ball.radius;
    this.acceleration.copy(this.aerodynamics.forces(ball).total).add(externalForce).divideScalar(ball.mass);
    this.angularAcceleration.copy(ball.torque).divideScalar(inertia);
    ball.velocity.addScaled(this.acceleration, dt * 0.5);
    ball.angularVelocity.multiplyScalar(Math.exp(-this.tuning.angularDrag * dt * 0.5))
      .addScaled(this.angularAcceleration, dt * 0.5);
    const midpointVelocity = ball.velocity.clone();
    this.acceleration.copy(this.aerodynamics.forces(ball).total).add(externalForce).divideScalar(ball.mass);
    ball.position.addScaled(midpointVelocity, dt);
    ball.velocity.copy(startVelocity).addScaled(this.acceleration, dt).clampMagnitude(this.tuning.maxBallSpeed);
    ball.angularVelocity.copy(startSpin).multiplyScalar(Math.exp(-this.tuning.angularDrag * dt))
      .addScaled(this.angularAcceleration, dt).clampMagnitude(this.tuning.maxSpinRate);
    // Forces belong to this segment only. Continuous collision can integrate
    // several segments in one fixed step after a rebound.
    ball.force.set(0, 0, 0);
    ball.torque.set(0, 0, 0);
    ball.position.y = Math.max(-1, Math.min(5, ball.position.y));
    ball.velocity.finite();
    ball.angularVelocity.finite();
  }

  integratePlayers(world: WorldState, dt: number): void {
    for (const player of [world.players.home, world.players.away]) {
      const desired = player.velocity.clone().clampMagnitude(player.maxSpeed);
      player.position.addScaled(desired, dt);
      player.position.x = clamp(player.position.x, -1.25, 1.25);
      player.position.z = player.side === "home"
        ? clamp(player.position.z, 0.82, 2.1)
        : clamp(player.position.z, -2.1, -0.82);
      player.energy = clamp(player.energy + dt * 0.07, 0, 1);
    }
  }

  estimateEnergy(ball: BallState): number {
    return 0.5 * ball.mass * ball.velocity.lengthSq() + 0.5 * ((2 / 3) * ball.mass * ball.radius ** 2) * ball.angularVelocity.lengthSq();
  }
}
