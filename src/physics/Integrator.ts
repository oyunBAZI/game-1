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
    this.aerodynamics.apply(ball, dt);
    this.acceleration.copy(ball.force).divideScalar(ball.mass);
    ball.velocity.addScaled(this.acceleration, dt);
    ball.velocity.clampMagnitude(this.tuning.maxBallSpeed);
    ball.position.addScaled(ball.velocity, dt);
    this.angularAcceleration.copy(ball.torque).divideScalar(0.00000072);
    ball.angularVelocity.addScaled(this.angularAcceleration, dt);
    ball.angularVelocity.clampMagnitude(this.tuning.maxSpinRate);
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
    return 0.5 * ball.mass * ball.velocity.lengthSq() + 0.5 * 0.00000036 * ball.angularVelocity.lengthSq();
  }
}
