import { Random } from "../core/Random";
import { Vec3 } from "../core/Vec3";
import { clamp, damp } from "../core/MathUtils";
import type { DifficultyProfile, Side } from "../core/types";
import { BallPredictor, type LandingPrediction } from "../physics/Predictor";
import type { PhysicsTuning } from "../physics/constants";
import type { BallState, PaddleState, PlayerState } from "../physics/State";
import { BALL, TABLE } from "../physics/constants";
import type { NetCollider } from "../physics/NetCollider";

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
  private readonly initialSeed: number;
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
    seed = 911
  ) {
    this.initialSeed = seed + (side === "home" ? 1 : 2);
    this.random = new Random(this.initialSeed);
    this.predictor = new BallPredictor(tuning);
    this.lastAction = this.neutralAction();
  }

  reset(): void {
    this.random.setSeed(this.initialSeed);
    this.prediction = null;
    this.reactionTimer = 0;
    this.target.set(0, 0, 0);
    this.lastAction = this.neutralAction();
  }

  private neutralAction(): AIAction {
    return {
      move: new Vec3(),
      paddleTarget: new Vec3(0, 1, this.side === "home" ? 0.65 : -0.65),
      paddleNormal: new Vec3(0, 0, this.side === "home" ? -1 : 1),
      swing: 0,
      spin: new Vec3(),
      confidence: 0
    };
  }

  /** Park behind the baseline without forecasting a ball that is not in play. */
  prepare(player: PlayerState): AIAction {
    this.prediction = null;
    this.reactionTimer = 0;
    this.lastAction = this.recover(player);
    return this.lastAction;
  }

  update(dt: number, ball: BallState, player: PlayerState, paddle: PaddleState, net?: NetCollider): AIAction {
    this.reactionTimer -= dt;
    if (this.reactionTimer > 0) return this.lastAction;
    this.reactionTimer = this.profile.reactionSeconds * this.random.range(0.82, 1.18);
    const movingTowardAI = this.side === "home" ? ball.velocity.z > 0 : ball.velocity.z < 0;
    if (!movingTowardAI && ball.position.y < 0.9) {
      this.lastAction = this.recover(player);
      return this.lastAction;
    }
    this.prediction = this.predictor.predict(ball, 1.8, 1 / 120, net);
    const confidence = clamp(this.profile.predictionConfidence - this.profile.placementError * this.random.next(), 0, 1);
    const sign = this.side === "away" ? -1 : 1;
    // Forecasts start at the current ball state. If the ball has already
    // bounced on this half, the forecast cannot contain that past contact;
    // looking only for a future bounce aims at the illegal *second* bounce.
    let bouncedOnOurHalf = ball.lastContact === "table" && ball.position.z * sign > 0;
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
    const intercept = playable.find((point) => point.position.z * sign >= 0.85) ?? playable.at(-1);
    const predicted = intercept?.position ?? this.prediction.position;
    // The profile's placement error is measured in metres of *shot target*
    // variation. Applying the full amount to the 155 mm racket face made a
    // club player miss even routine, well predicted serves. Keep a smaller
    // interception error; reaction time and foot speed remain the main limit.
    const lateralError = this.random.signed() * this.profile.placementError * 0.22;
    this.target.set(
      clamp(predicted.x + lateralError, -1.1, 1.1),
      // Prepare the face above the tabletop at the forecast interception.
      clamp(predicted.y + this.random.signed() * this.profile.placementError * 0.4,
        TABLE.top + BALL.radius + 0.045, 1.7),
      clamp(predicted.z + sign * 0.035,
        this.side === "away" ? -1.72 : 0.82, this.side === "away" ? -0.82 : 1.72)
    );
    // Keep the athlete's body behind the table while the racket reaches in.
    const playerTarget = new Vec3(this.target.x, 0,
      sign * clamp(Math.abs(this.target.z) + 0.48, TABLE.length / 2 + 0.13, 2.05));
    const move = playerTarget.sub(player.position).setY(0).clampMagnitude(1);
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

  private recover(player: PlayerState): AIAction {
    const target = new Vec3(this.homeBias.x, 0, this.side === "home" ? 1.65 : -1.65);
    const move = target.clone().sub(player.position).setY(0).clampMagnitude(1);
    const paddleTarget = new Vec3(target.x, 1.0, this.side === "home" ? 1.05 : -1.05);
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

  predictionPoints(): Vec3[] {
    return this.prediction?.points.map((point) => point.position.clone()) ?? [];
  }
}
