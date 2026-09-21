import type { DifficultyProfile } from "../core/types";

export const DIFFICULTY_CATALOG: DifficultyProfile[] = [
  {
    id: "beginner",
    label: "Beginner",
    reactionSeconds: 0.34,
    movementSpeed: 2.2,
    predictionConfidence: 0.45,
    placementError: 0.34,
    spinRead: 0.25,
    aggression: 0.25,
    recovery: 0.6
  },
  {
    id: "recreational",
    label: "Recreational",
    reactionSeconds: 0.29,
    movementSpeed: 2.55,
    predictionConfidence: 0.54,
    placementError: 0.27,
    spinRead: 0.35,
    aggression: 0.36,
    recovery: 0.66
  },
  {
    id: "club",
    label: "Club",
    reactionSeconds: 0.23,
    movementSpeed: 3,
    predictionConfidence: 0.67,
    placementError: 0.18,
    spinRead: 0.5,
    aggression: 0.48,
    recovery: 0.75
  },
  {
    id: "advanced",
    label: "Advanced",
    reactionSeconds: 0.17,
    movementSpeed: 3.45,
    predictionConfidence: 0.78,
    placementError: 0.12,
    spinRead: 0.68,
    aggression: 0.6,
    recovery: 0.84
  },
  {
    id: "elite",
    label: "Elite",
    reactionSeconds: 0.12,
    movementSpeed: 3.8,
    predictionConfidence: 0.9,
    placementError: 0.08,
    spinRead: 0.82,
    aggression: 0.72,
    recovery: 0.92
  },
  {
    id: "robot",
    label: "Robot Lab",
    reactionSeconds: 0.06,
    movementSpeed: 4.4,
    predictionConfidence: 0.99,
    placementError: 0.03,
    spinRead: 0.98,
    aggression: 0.88,
    recovery: 1
  }
];

export function difficulty(id: string): DifficultyProfile {
  return DIFFICULTY_CATALOG.find((profile) => profile.id === id) ?? DIFFICULTY_CATALOG[2];
}