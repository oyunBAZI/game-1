import { Vec3 } from "../core/Vec3";
import type { ShotKind } from "../core/types";

export interface ShotRecipe {
  id: string;
  label: string;
  kind: ShotKind;
  approach: "neutral" | "open" | "closed";
  contactHeight: number;
  desiredSpeed: number;
  desiredSpin: Vec3;
  racketAngle: Vec3;
  placementBias: Vec3;
  staminaCost: number;
  difficulty: number;
}

export const SHOT_LIBRARY: ShotRecipe[] = [
  {
    id: "serve-short-backspin",
    label: "Short Backspin Serve",
    kind: "serve",
    approach: "open",
    contactHeight: 1.25,
    desiredSpeed: 7,
    desiredSpin: new Vec3(-75, 12, 42),
    racketAngle: new Vec3(-0.1, 0.2, 0.05),
    placementBias: new Vec3(0, 0, -0.2),
    staminaCost: 0.05,
    difficulty: 0.38
  },
  {
    id: "serve-pendulum",
    label: "Pendulum Serve",
    kind: "serve",
    approach: "open",
    contactHeight: 1.18,
    desiredSpeed: 8,
    desiredSpin: new Vec3(100, 145, 18),
    racketAngle: new Vec3(-0.2, 0.45, -0.15),
    placementBias: new Vec3(0.15, 0, -0.28),
    staminaCost: 0.07,
    difficulty: 0.54
  },
  {
    id: "forehand-drive",
    label: "Forehand Drive",
    kind: "drive",
    approach: "neutral",
    contactHeight: 0.98,
    desiredSpeed: 18,
    desiredSpin: new Vec3(92, 12, -8),
    racketAngle: new Vec3(0.12, 0.06, 0),
    placementBias: new Vec3(0.2, 0, -0.5),
    staminaCost: 0.11,
    difficulty: 0.34
  },
  {
    id: "forehand-loop",
    label: "Forehand Loop",
    kind: "loop",
    approach: "closed",
    contactHeight: 0.88,
    desiredSpeed: 21,
    desiredSpin: new Vec3(178, 22, -14),
    racketAngle: new Vec3(0.32, 0.08, -0.04),
    placementBias: new Vec3(-0.25, 0, -0.62),
    staminaCost: 0.2,
    difficulty: 0.62
  },
  {
    id: "backhand-loop",
    label: "Backhand Loop",
    kind: "loop",
    approach: "closed",
    contactHeight: 0.9,
    desiredSpeed: 18,
    desiredSpin: new Vec3(148, -18, -8),
    racketAngle: new Vec3(0.27, -0.18, 0.03),
    placementBias: new Vec3(0.3, 0, -0.42),
    staminaCost: 0.17,
    difficulty: 0.58
  },
  {
    id: "backhand-push",
    label: "Backhand Push",
    kind: "push",
    approach: "open",
    contactHeight: 0.82,
    desiredSpeed: 8,
    desiredSpin: new Vec3(-82, -15, 52),
    racketAngle: new Vec3(-0.32, -0.12, 0.02),
    placementBias: new Vec3(-0.14, 0, -0.2),
    staminaCost: 0.06,
    difficulty: 0.26
  },
  {
    id: "forehand-smash",
    label: "Forehand Smash",
    kind: "smash",
    approach: "closed",
    contactHeight: 1.4,
    desiredSpeed: 31,
    desiredSpin: new Vec3(68, 6, -5),
    racketAngle: new Vec3(0.5, 0.04, -0.02),
    placementBias: new Vec3(0, 0, -0.8),
    staminaCost: 0.32,
    difficulty: 0.74
  },
  {
    id: "defensive-chop",
    label: "Defensive Chop",
    kind: "chop",
    approach: "open",
    contactHeight: 0.72,
    desiredSpeed: 11,
    desiredSpin: new Vec3(-196, -30, 88),
    racketAngle: new Vec3(-0.5, -0.05, 0.08),
    placementBias: new Vec3(0.28, 0, -0.78),
    staminaCost: 0.19,
    difficulty: 0.58
  },
  {
    id: "high-lob",
    label: "High Lob",
    kind: "lob",
    approach: "open",
    contactHeight: 1.5,
    desiredSpeed: 13,
    desiredSpin: new Vec3(80, 0, 0),
    racketAngle: new Vec3(0.6, 0, 0),
    placementBias: new Vec3(0.15, 0, -0.9),
    staminaCost: 0.16,
    difficulty: 0.4
  }
];

export function getShot(id: string): ShotRecipe {
  const recipe = SHOT_LIBRARY.find((shot) => shot.id === id) ?? SHOT_LIBRARY[0];
  return {
    ...recipe,
    desiredSpin: recipe.desiredSpin.clone(),
    racketAngle: recipe.racketAngle.clone(),
    placementBias: recipe.placementBias.clone()
  };
}

export function shotsForKind(kind: ShotKind): ShotRecipe[] {
  return SHOT_LIBRARY.filter((shot) => shot.kind === kind).map((shot) => getShot(shot.id));
}