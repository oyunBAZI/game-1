import { Vec3 } from "../core/Vec3";
import type { Side } from "../core/types";
import { clamp, moveTowards } from "../core/MathUtils";
import type { LocomotionState } from "./AnimationState";

export interface FootworkPlan {
  locomotion: LocomotionState;
  target: Vec3;
  urgency: number;
  balance: number;
  leadFoot: Vec3;
  trailFoot: Vec3;
}

export class FootworkPlanner {
  private readonly target = new Vec3();
  private lastPlan: FootworkPlan;

  constructor(private readonly side: Side) {
    this.lastPlan = {
      locomotion: "ready",
      target: new Vec3(0, 0, side === "home" ? 1.5 : -1.5),
      urgency: 0,
      balance: 1,
      leadFoot: new Vec3(0.12, 0, 0.12),
      trailFoot: new Vec3(-0.12, 0, -0.12)
    };
  }

  plan(playerPosition: Vec3, ballPosition: Vec3, ballVelocity: Vec3, dt: number): FootworkPlan {
    const sideSign = this.side === "home" ? 1 : -1;
    const movingTowardPlayer = sideSign * ballVelocity.z > 0;
    const interceptionZ = sideSign * 0.92;
    this.target.set(
      clamp(ballPosition.x + ballVelocity.x * 0.18, -1.15, 1.15),
      0,
      sideSign * clamp(Math.abs(interceptionZ + ballVelocity.z * 0.08), 0.92, 1.95)
    );
    const distance = playerPosition.distanceTo(this.target);
    const urgency = clamp(distance * 0.7 + (movingTowardPlayer ? 0.4 : 0), 0, 1);
    let locomotion: LocomotionState = "ready";
    if (distance > 1.15) locomotion = "cross-step";
    else if (distance > 0.35) locomotion = "shuffle";
    else if (urgency > 0.6) locomotion = "step";
    else if (!movingTowardPlayer) locomotion = "recover";
    const desired = moveTowards(playerPosition, this.target, Math.max(0, dt) * (1.2 + urgency * 2.8));
    const balance = clamp(1 - distance * 0.45, 0, 1);
    this.lastPlan = {
      locomotion,
      target: desired,
      urgency,
      balance,
      leadFoot: new Vec3(0.12 + urgency * 0.08, 0, 0.12),
      trailFoot: new Vec3(-0.12 - urgency * 0.05, 0, -0.12)
    };
    return { ...this.lastPlan, target: desired.clone(), leadFoot: this.lastPlan.leadFoot.clone(), trailFoot: this.lastPlan.trailFoot.clone() };
  }

  current(): FootworkPlan {
    return { ...this.lastPlan, target: this.lastPlan.target.clone(), leadFoot: this.lastPlan.leadFoot.clone(), trailFoot: this.lastPlan.trailFoot.clone() };
  }
}