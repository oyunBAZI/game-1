import { Random } from "../core/Random";
import { Vec3 } from "../core/Vec3";
import { clamp, damp } from "../core/MathUtils";
import type { DifficultyProfile, Side } from "../core/types";
import { BallPredictor, type LandingPrediction } from "../physics/Predictor";
import type { PhysicsTuning } from "../physics/constants";
import type { BallState, PaddleState, PlayerState } from "../physics/State";
import { TABLE } from "../physics/constants";

export interface AIAction {
  move: Vec3;
  paddleTarget: Vec3;
  paddleNormal: Vec3;
  swing: number;
  spin: Vec3;
  confidence: number;
}

export class AIBrain {
  private readonly random: Random;
  private readonly predictor: BallPredictor;
  private prediction: LandingPrediction | null = null;
  private reactionTimer = 0;
  private target = new Vec3();
  private readonly homeBias = new Vec3();
  private lastAction: AIAction;

  constructor(
    private readonly side: Side,
    private readonly profile: DifficultyProfile,
    tuning: PhysicsTuning,
    private readonly seed = 911
  ) {
    this.random = new Random(seed + (side === "home" ? 1 : 2));
    this.predictor = new BallPredictor(tuning);
    this.lastAction = {
      move: new Vec3(),
      paddleTarget: new Vec3(0, 1, side === "home" ? 0.65 : -0.65),
      paddleNormal: new Vec3(0, 0, side === "home" ? -1 : 1),
      swing: 0,
      spin: new Vec3(),
      confidence: 0
    };
  }

  update(dt: number, ball: BallState, player: PlayerState, paddle: PaddleState, receivedBounce = false): AIAction {
    this.reactionTimer -= dt;
    if (this.reactionTimer > 0) return this.lastAction;
    this.reactionTimer = this.profile.reactionSeconds * this.random.range(0.82, 1.18);
    const movingTowardAI = this.side === "home" ? ball.velocity.z > 0 : ball.velocity.z < 0;
    if (!movingTowardAI && ball.position.y < 0.9) {
      this.lastAction = this.recover(player, paddle, dt);
      return this.lastAction;
    }
    this.prediction = this.predictor.predict(ball, 1.8, 1 / 120);
    const confidence = clamp(this.profile.predictionConfidence - this.profile.placementError * this.random.next(), 0, 1);
    const sign = this.side === "away" ? -1 : 1;
    let bouncedOnOurHalf = receivedBounce;
    const playable: LandingPrediction["points"] = [];
    for (const point of this.prediction.points) {
      if (point.bounced && point.position.z * sign > 0) {
        if (bouncedOnOurHalf) break;
        bouncedOnOurHalf = true;
      }
      if (bouncedOnOurHalf && point.velocity.z * sign > 0 &&
          point.position.y > TABLE.top + 0.02 && point.position.y < 1.5 &&
          point.position.z * sign > 0.25) playable.push(point);
    }
    const intercept = playable.find((point) => point.position.z * sign >= 0.75) ?? playable.at(-1);
    const predicted = intercept?.position ?? this.prediction.position;
    const lateralError = this.random.signed() * this.profile.placementError;
    this.target.set(
      clamp(predicted.x + lateralError, -1.1, 1.1),
      clamp(predicted.y + this.random.signed() * this.profile.placementError * 0.4, 0.62, 1.7),
      clamp(predicted.z, this.side === "away" ? -1.72 : 0.34, this.side === "away" ? -0.34 : 1.72)
    );
    const move = this.target.clone().sub(player.position).setY(0).clampMagnitude(1);
    const reachable = this.target.distanceTo(paddle.position) < 1.15 + confidence * 0.35;
    const swing = reachable && Boolean(intercept) && movingTowardAI && ball.position.y > 0.5
      ? clamp(0.25 + this.profile.aggression * 0.8 + ball.speed() / 70, 0, 1)
      : 0;
    const normal = new Vec3(
      clamp(-ball.velocity.x * 0.015, -0.45, 0.45),
      clamp(0.2 + ball.angularVelocity.x * 0.0008, -0.4, 0.5),
      this.side === "home" ? -1 : 1
    ).normalize();
    const spin = new Vec3(
      clamp(this.profile.spinRead * 120 + ball.angularVelocity.x * 0.3, -500, 500),
      clamp(ball.angularVelocity.y * 0.22, -300, 300),
      clamp(ball.angularVelocity.z * 0.18, -220, 220)
    );
    this.lastAction = {
      move,
      paddleTarget: this.target.clone(),
      paddleNormal: normal,
      swing,
      spin,
      confidence
    };
    return this.lastAction;
  }

  private recover(player: PlayerState, paddle: PaddleState, dt: number): AIAction {
    const target = new Vec3(this.homeBias.x, 1.0, this.side === "home" ? 1.15 : -1.15);
    const move = target.clone().sub(player.position).setY(0).clampMagnitude(1);
    const paddleTarget = target.clone().setY(1.0);
    const normal = new Vec3(0, 0, this.side === "home" ? -1 : 1);
    this.lastAction = {
      move,
      paddleTarget,
      paddleNormal: normal,
      swing: 0,
      spin: new Vec3(),
      confidence: 0.25
    };
    return this.lastAction;
  }

  reset(): void {
    this.random.setSeed(this.seed + (this.side === "home" ? 1 : 2));
    this.reactionTimer = 0;
    this.prediction = null;
    this.target.set(0, 1, this.side === "home" ? 1.15 : -1.15);
    this.lastAction.swing = 0;
    this.lastAction.move.set(0, 0, 0);
  }

  predictionPoints(): Vec3[] {
    return this.prediction?.points.map((point) => point.position.clone()) ?? [];
  }
}
