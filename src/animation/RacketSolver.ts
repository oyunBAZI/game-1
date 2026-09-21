import { Vec3 } from "../core/Vec3";
import type { Side } from "../core/types";
import type { AnimationPose } from "./AnimationState";

export interface RacketSolveInput {
  hand: Vec3;
  target: Vec3;
  velocity: Vec3;
  spin: Vec3;
  side: Side;
  intensity: number;
}

export interface RacketSolveResult {
  position: Vec3;
  normal: Vec3;
  reach: number;
  shoulderLoad: number;
  wristLoad: number;
}

export class RacketSolver {
  solve(input: RacketSolveInput): RacketSolveResult {
    const direction = input.target.clone().sub(input.hand);
    const reach = direction.length();
    const normal = new Vec3(0, 0, input.side === "home" ? -1 : 1);
    if (direction.length() > 0.001) {
      normal.addScaled(direction.clone().normalize(), 0.18 * input.intensity).normalize();
    }
    const shoulderLoad = Math.min(1, reach / 1.2);
    const wristLoad = Math.min(1, input.spin.length() / 350 + input.velocity.length() / 30);
    return {
      position: input.hand.clone().addScaled(direction, 0.88),
      normal,
      reach,
      shoulderLoad,
      wristLoad
    };
  }

  applyToPose(pose: AnimationPose, result: RacketSolveResult, side: Side): AnimationPose {
    const output = { ...pose };
    output.shoulderYaw = Math.atan2(result.position.x, Math.max(0.1, Math.abs(result.position.z)));
    output.elbowBend = Math.min(1.4, 0.25 + result.reach * 0.42);
    output.wristYaw = Math.atan2(result.normal.x, Math.max(0.1, Math.abs(result.normal.z)));
    output.racketPitch = Math.atan2(result.normal.y, Math.max(0.1, Math.abs(result.normal.z)));
    output.racketRoll = side === "home" ? result.normal.x * 0.4 : -result.normal.x * 0.4;
    output.torsoLean = result.shoulderLoad * 0.12;
    return output;
  }
}