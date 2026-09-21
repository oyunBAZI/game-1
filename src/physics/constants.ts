import type { RubberProfile, TableProfile } from "../core/types";

export const TABLE = {
  length: 2.74,
  width: 1.525,
  top: 0.76,
  thickness: 0.028,
  netHeight: 0.1525,
  netThickness: 0.012,
  serviceLineOffset: 0.02,
  centerLineWidth: 0.003,
  sideMargin: 0.03,
  endMargin: 0.03
} as const;

export const BALL = {
  radius: 0.02,
  diameter: 0.04,
  mass: 0.0027,
  area: Math.PI * 0.02 * 0.02,
  inertia: (2 / 3) * 0.0027 * 0.02 * 0.02
} as const;

export const PADDLE = {
  faceWidth: 0.155,
  faceHeight: 0.165,
  faceThickness: 0.012,
  handleLength: 0.1,
  handleRadius: 0.014,
  collisionPadding: 0.012
} as const;

export const DEFAULT_WORLD = {
  floor: 0,
  ceiling: 5,
  playableMinX: -1.7,
  playableMaxX: 1.7,
  playableMinZ: -2.2,
  playableMaxZ: 2.2
} as const;

export interface PhysicsTuning {
  gravity: number;
  airDensity: number;
  dragCoefficient: number;
  magnusCoefficient: number;
  angularDrag: number;
  table: TableProfile;
  rubber: RubberProfile;
  netRestitution: number;
  floorRestitution: number;
  outSpeedThreshold: number;
  maxBallSpeed: number;
  maxSpinRate: number;
}

export const DEFAULT_TUNING: PhysicsTuning = {
  gravity: -9.81,
  airDensity: 1.225,
  dragCoefficient: 0.47,
  magnusCoefficient: 0.00022,
  angularDrag: 0.018,
  table: {
    id: "competition-blue",
    label: "Competition Blue",
    restitution: 0.89,
    friction: 0.23,
    edgeRestitution: 0.62,
    clothRoughness: 0.32
  },
  rubber: {
    id: "balanced",
    label: "Balanced",
    color: "red",
    restitution: 0.82,
    friction: 0.9,
    spinTransfer: 0.95,
    dwellTime: 0.004,
    hardness: 47
  },
  netRestitution: 0.22,
  floorRestitution: 0.18,
  outSpeedThreshold: 0.15,
  maxBallSpeed: 55,
  maxSpinRate: 1200
};

export function mergeTuning(partial: Partial<PhysicsTuning>): PhysicsTuning {
  return {
    ...DEFAULT_TUNING,
    ...partial,
    table: { ...DEFAULT_TUNING.table, ...partial.table },
    rubber: { ...DEFAULT_TUNING.rubber, ...partial.rubber }
  };
}