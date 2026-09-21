import { Vec3 } from "../core/Vec3";
import { clamp, damp } from "../core/MathUtils";
import type { InputFrame, Side } from "../core/types";
import type { PlayerState, PaddleState } from "../physics/State";
import { PaddleCollider } from "../physics/PaddleCollider";

export interface PlayerIntent {
  move: Vec3;
  paddleOffset: Vec3;
  paddleNormal: Vec3;
  swing: number;
  spin: Vec3;
  serve: boolean;
}

export class PlayerController {
  private intent: PlayerIntent = {
    move: new Vec3(),
    paddleOffset: new Vec3(),
    paddleNormal: new Vec3(0, 0, -1),
    swing: 0,
    spin: new Vec3(),
    serve: false
  };
  private readonly targetPaddle = new Vec3();
  private readonly targetNormal = new Vec3();

  constructor(
    readonly side: Side,
    private readonly player: PlayerState,
    private readonly paddle: PaddleState,
    private readonly collider: PaddleCollider
  ) {}

  setInput(input: InputFrame): void {
    const direction = this.side === "home" ? 1 : -1;
    this.intent.move.set(input.moveX, 0, input.moveY * direction);
    this.intent.paddleOffset.set(input.paddleX, input.paddleY, input.paddleZ * direction);
    this.intent.paddleNormal.set(0.2 * input.spinY, 0, direction > 0 ? -1 : 1).normalize();
    this.intent.swing = clamp(input.swing, 0, 1);
    this.intent.spin.set(input.spinX, input.spinY, input.spinZ);
    this.intent.serve = input.serve;
  }

  update(dt: number): void {
    this.player.previousPosition.copy(this.player.position);
    const desiredVelocity = this.intent.move.clone().clampMagnitude(1).multiplyScalar(this.player.maxSpeed);
    this.player.velocity.lerp(desiredVelocity, 1 - Math.exp(-12 * dt));
    this.player.position.addScaled(this.player.velocity, dt);
    this.player.position.x = clamp(this.player.position.x, -1.2, 1.2);
    this.player.position.z = this.side === "home"
      ? clamp(this.player.position.z, 0.85, 2.12)
      : clamp(this.player.position.z, -2.12, -0.85);
    this.player.energy = clamp(this.player.energy - this.intent.swing * dt * 0.45 + dt * 0.12, 0.15, 1);
    this.targetPaddle.copy(this.player.position).add(new Vec3(
      this.intent.paddleOffset.x,
      1.0 + this.intent.paddleOffset.y,
      this.side === "home" ? -0.32 + this.intent.paddleOffset.z : 0.32 + this.intent.paddleOffset.z
    ));
    this.targetNormal.copy(this.intent.paddleNormal);
    this.collider.placeForInput(this.paddle, this.targetPaddle, this.targetNormal, dt, 8 + this.player.energy * 2);
    this.paddle.swingVelocity.lerp(this.intent.move.clone().multiplyScalar(2 + this.intent.swing * 6), 1 - Math.exp(-18 * dt));
  }

  wantsToServe(): boolean {
    return this.intent.serve;
  }

  wantsToSwing(): boolean {
    return this.intent.swing > 0.15;
  }

  desiredSpin(): Vec3 {
    return this.intent.spin.clone().multiplyScalar(180);
  }
}