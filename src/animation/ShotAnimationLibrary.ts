import type { ShotKind } from "../core/types";
import type { AnimationPose, StrokeState } from "./AnimationState";

export interface StrokeClip {
  state: StrokeState;
  duration: number;
  windup: number;
  contact: number;
  followThrough: number;
  basePose: Partial<AnimationPose>;
  amplitude: Partial<AnimationPose>;
}

export const STROKE_CLIPS: StrokeClip[] = [
  { state: "serve", duration: 0.82, windup: 0.26, contact: 0.42, followThrough: 0.72, basePose: { hipHeight: -0.06, torsoYaw: 0.18 }, amplitude: { shoulderYaw: 0.9, wristYaw: 0.7, racketPitch: 0.3 } },
  { state: "drive", duration: 0.52, windup: 0.18, contact: 0.37, followThrough: 0.72, basePose: { hipHeight: -0.05 }, amplitude: { torsoYaw: 0.36, shoulderYaw: 0.74, wristYaw: 0.32, racketPitch: 0.08 } },
  { state: "loop", duration: 0.76, windup: 0.2, contact: 0.44, followThrough: 0.78, basePose: { hipHeight: -0.14, torsoLean: -0.1 }, amplitude: { torsoYaw: 0.52, shoulderYaw: 0.92, elbowBend: 0.25, racketPitch: 0.4 } },
  { state: "smash", duration: 0.63, windup: 0.2, contact: 0.36, followThrough: 0.75, basePose: { hipHeight: -0.08, torsoLean: 0.12 }, amplitude: { torsoYaw: 0.62, shoulderYaw: 1.15, wristYaw: 0.45, racketPitch: 0.58 } },
  { state: "push", duration: 0.42, windup: 0.12, contact: 0.35, followThrough: 0.64, basePose: { hipHeight: -0.04 }, amplitude: { shoulderYaw: 0.28, wristYaw: 0.6, racketPitch: -0.35 } },
  { state: "chop", duration: 0.68, windup: 0.22, contact: 0.44, followThrough: 0.78, basePose: { hipHeight: -0.14, torsoLean: 0.08 }, amplitude: { torsoYaw: 0.46, shoulderYaw: 0.72, wristYaw: -0.55, racketPitch: -0.48 } },
  { state: "block", duration: 0.32, windup: 0.06, contact: 0.32, followThrough: 0.62, basePose: { hipHeight: -0.02 }, amplitude: { shoulderYaw: 0.18, wristYaw: 0.14, racketPitch: 0.05 } },
  { state: "lob", duration: 0.9, windup: 0.28, contact: 0.44, followThrough: 0.82, basePose: { hipHeight: -0.05 }, amplitude: { torsoYaw: 0.38, shoulderYaw: 0.76, racketPitch: 0.76 } }
];

export function clipFor(kind: ShotKind): StrokeClip {
  const state = kind === "unknown" ? "drive" : kind as StrokeState;
  return STROKE_CLIPS.find((clip) => clip.state === state) ?? STROKE_CLIPS[1];
}