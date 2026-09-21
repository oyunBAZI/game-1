import type { ShotKind } from "../core/types";

export type LocomotionState = "idle" | "ready" | "step" | "shuffle" | "cross-step" | "recover";
export type StrokeState = "none" | "serve" | "drive" | "loop" | "smash" | "push" | "chop" | "block" | "lob";

export interface AnimationPose {
  hipHeight: number;
  torsoYaw: number;
  torsoLean: number;
  shoulderYaw: number;
  elbowBend: number;
  wristYaw: number;
  racketYaw: number;
  racketPitch: number;
  racketRoll: number;
  leadFootX: number;
  leadFootZ: number;
  trailFootX: number;
  trailFootZ: number;
}

export interface AnimationSnapshot {
  locomotion: LocomotionState;
  stroke: StrokeState;
  normalizedTime: number;
  blendWeight: number;
  pose: AnimationPose;
}

export const DEFAULT_POSE: AnimationPose = {
  hipHeight: 0,
  torsoYaw: 0,
  torsoLean: 0,
  shoulderYaw: 0,
  elbowBend: 0.4,
  wristYaw: 0,
  racketYaw: 0,
  racketPitch: 0,
  racketRoll: 0,
  leadFootX: 0.12,
  leadFootZ: 0.12,
  trailFootX: -0.12,
  trailFootZ: -0.12
};

export function strokeForShot(kind: ShotKind): StrokeState {
  if (kind === "serve") return "serve";
  if (kind === "drive") return "drive";
  if (kind === "loop") return "loop";
  if (kind === "smash") return "smash";
  if (kind === "push") return "push";
  if (kind === "chop") return "chop";
  if (kind === "block") return "block";
  if (kind === "lob") return "lob";
  return "none";
}

export function clonePose(pose: AnimationPose): AnimationPose {
  return { ...pose };
}