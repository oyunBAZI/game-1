import { damp } from "../core/MathUtils";
import { Vec3 } from "../core/Vec3";
import type { Side, ShotKind } from "../core/types";
import { DEFAULT_POSE, type AnimationPose, type AnimationSnapshot, strokeForShot } from "./AnimationState";
import { clipFor } from "./ShotAnimationLibrary";
import { FootworkPlanner } from "./FootworkPlanner";
import { RacketSolver } from "./RacketSolver";

export class PlayerPoseController {
  readonly side: Side;
  readonly footwork: FootworkPlanner;
  readonly racket: RacketSolver;
  private pose: AnimationPose = { ...DEFAULT_POSE };
  private previousPose: AnimationPose = { ...DEFAULT_POSE };
  private stroke: AnimationSnapshot["stroke"] = "none";
  private strokeTime = 1;
  private strokeWeight = 0;
  private targetPosition = new Vec3();
  private lastSnapshot: AnimationSnapshot;

  constructor(side: Side) {
    this.side = side;
    this.footwork = new FootworkPlanner(side);
    this.racket = new RacketSolver();
    this.lastSnapshot = {
      locomotion: "ready",
      stroke: "none",
      normalizedTime: 1,
      blendWeight: 0,
      pose: { ...DEFAULT_POSE }
    };
  }

  triggerShot(kind: ShotKind): void {
    this.stroke = strokeForShot(kind);
    this.strokeTime = 0;
    this.strokeWeight = 1;
  }

  update(dt: number, playerPosition: Vec3, ballPosition: Vec3, ballVelocity: Vec3, paddlePosition: Vec3, paddleVelocity: Vec3, spin: Vec3): AnimationSnapshot {
    this.previousPose = { ...this.pose };
    const footwork = this.footwork.plan(playerPosition, ballPosition, ballVelocity, dt);
    this.targetPosition.copy(footwork.target);
    this.strokeTime += dt;
    const clip = clipFor(this.stroke);
    const normalizedTime = Math.min(1, this.strokeTime / clip.duration);
    this.strokeWeight = damp(this.strokeWeight, normalizedTime >= 1 ? 0 : 1, 14, dt);
    const phase = normalizedTime < clip.contact
      ? normalizedTime / Math.max(0.001, clip.contact)
      : (normalizedTime - clip.contact) / Math.max(0.001, 1 - clip.contact);
    const wave = normalizedTime < clip.contact ? Math.sin(phase * Math.PI * 0.5) : Math.cos(phase * Math.PI * 0.5);
    const base = { ...DEFAULT_POSE, ...clip.basePose };
    this.pose = { ...base };
    for (const key of Object.keys(clip.amplitude) as Array<keyof AnimationPose>) {
      const amount = clip.amplitude[key] as number | undefined;
      if (amount !== undefined) this.pose[key] = (base[key] as number) + amount * wave * this.strokeWeight;
    }
    const solve = this.racket.solve({
      hand: new Vec3(playerPosition.x + 0.25, playerPosition.y + 1.18, playerPosition.z - (this.side === "home" ? 0.26 : -0.26)),
      target: paddlePosition,
      velocity: paddleVelocity,
      spin,
      side: this.side,
      intensity: this.strokeWeight
    });
    this.pose = this.racket.applyToPose(this.pose, solve, this.side);
    this.pose.hipHeight += (footwork.balance - 1) * 0.08;
    this.pose.leadFootX = footwork.leadFoot.x;
    this.pose.leadFootZ = footwork.leadFoot.z;
    this.pose.trailFootX = footwork.trailFoot.x;
    this.pose.trailFootZ = footwork.trailFoot.z;
    this.lastSnapshot = {
      locomotion: footwork.locomotion,
      stroke: this.stroke,
      normalizedTime,
      blendWeight: this.strokeWeight,
      pose: { ...this.pose }
    };
    return this.snapshot(1);
  }

  snapshot(alpha = 1): AnimationSnapshot {
    const pose: AnimationPose = { ...this.previousPose };
    for (const key of Object.keys(pose) as Array<keyof AnimationPose>) {
      pose[key] = (this.previousPose[key] as number) + ((this.pose[key] as number) - (this.previousPose[key] as number)) * alpha;
    }
    return { ...this.lastSnapshot, pose };
  }
}