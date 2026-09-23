import { clamp } from "../core/MathUtils";
import { Vec3 } from "../core/Vec3";
import type { PhysicsTuning } from "./constants";
import { Aerodynamics } from "./Aerodynamics";
import { BALL } from "./constants";
import type { BallState, WorldState } from "./State";

export class BallIntegrator {
  private readonly angularAcceleration = new Vec3();
  private readonly startAcceleration = new Vec3();
  private readonly middleAcceleration = new Vec3();
  private readonly midpointVelocity = new Vec3();
  private readonly midpointSpin = new Vec3();
  private readonly aerodynamics: Aerodynamics;

  constructor(private readonly tuning: PhysicsTuning) {
    this.aerodynamics = new Aerodynamics(tuning);
  }

  integrate(ball: BallState, dt: number): void {
    // The ball is light enough that drag and Magnus lift change throughout a
    // flight segment. Sample them at the midpoint so both the live world and
    // its trajectory predictor converge as the fixed timestep is refined.
    // External force/torque is constant for this segment and consumed below.
    const externalAcceleration = 1 / ball.mass;
    const start = this.aerodynamics.accelerationFor(ball.velocity, ball.angularVelocity,
      ball.mass, this.startAcceleration).addScaled(ball.force, externalAcceleration);
    this.midpointVelocity.copy(ball.velocity).addScaled(start, dt * 0.5);
    this.midpointSpin.copy(ball.angularVelocity).multiplyScalar(Math.exp(-this.tuning.angularDrag * dt * 0.5));
    const middle = this.aerodynamics.accelerationFor(this.midpointVelocity, this.midpointSpin,
      ball.mass, this.middleAcceleration).addScaled(ball.force, externalAcceleration);
    ball.position.addScaled(this.midpointVelocity, dt);
    ball.velocity.addScaled(middle, dt).clampMagnitude(this.tuning.maxBallSpeed);
    this.angularAcceleration.copy(ball.torque).divideScalar(BALL.inertia);
    ball.angularVelocity.addScaled(this.angularAcceleration, dt);
    ball.angularVelocity.multiplyScalar(Math.exp(-this.tuning.angularDrag * dt));
    ball.angularVelocity.clampMagnitude(this.tuning.maxSpinRate);
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
    return 0.5 * ball.mass * ball.velocity.lengthSq() + 0.5 * BALL.inertia * ball.angularVelocity.lengthSq();
  }
}
