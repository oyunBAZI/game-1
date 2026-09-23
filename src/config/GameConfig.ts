import type { DifficultyProfile, GameMode, RubberProfile, TableProfile } from "../core/types";

export interface PhysicsConfig {
  fixedHz: number;
  maxFrameDelta: number;
  gravity: number;
  airDensity: number;
  ballRadius: number;
  ballMass: number;
  dragCoefficient: number;
  magnusCoefficient: number;
  angularDrag: number;
  table: TableProfile;
  rubbers: Record<string, RubberProfile>;
}

export interface GraphicsConfig {
  arenaId: string;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  toneMappingExposure: number;
  pixelRatioCap: number;
  showTrails: boolean;
  reducedMotion: boolean;
}

export interface ControlConfig {
  mouseSensitivity: number;
  gamepadDeadzone: number;
  invertY: boolean;
  assist: boolean;
  swingButton: string;
}

export interface GameConfig {
  mode: GameMode;
  physics: PhysicsConfig;
  graphics: GraphicsConfig;
  controls: ControlConfig;
  difficulty: DifficultyProfile;
}

export const TABLE_DEFAULT: TableProfile = {
  id: "competition-blue",
  label: "Competition Blue",
  restitution: 0.89,
  friction: 0.23,
  edgeRestitution: 0.62,
  clothRoughness: 0.32
};

export const RUBBER_DEFAULTS: Record<string, RubberProfile> = {
  balanced: {
    id: "balanced",
    label: "Balanced",
    color: "red",
    restitution: 0.82,
    friction: 0.9,
    spinTransfer: 0.95,
    dwellTime: 0.004,
    hardness: 47
  },
  tacky: {
    id: "tacky",
    label: "Tacky Control",
    color: "black",
    restitution: 0.74,
    friction: 1.12,
    spinTransfer: 1.18,
    dwellTime: 0.006,
    hardness: 42
  },
  tensor: {
    id: "tensor",
    label: "Tensor Attack",
    color: "red",
    restitution: 0.91,
    friction: 0.84,
    spinTransfer: 1.06,
    dwellTime: 0.003,
    hardness: 50
  }
};

export const DIFFICULTIES: Record<string, DifficultyProfile> = {
  beginner: {
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
  club: {
    id: "club",
    label: "Club",
    reactionSeconds: 0.23,
    movementSpeed: 3.0,
    predictionConfidence: 0.67,
    placementError: 0.18,
    spinRead: 0.5,
    aggression: 0.48,
    recovery: 0.75
  },
  elite: {
    id: "elite",
    label: "Elite",
    reactionSeconds: 0.12,
    movementSpeed: 3.8,
    predictionConfidence: 0.9,
    placementError: 0.08,
    spinRead: 0.82,
    aggression: 0.72,
    recovery: 0.92
  }
};

export function createDefaultConfig(): GameConfig {
  return {
    mode: "practice",
    physics: {
      fixedHz: 240,
      maxFrameDelta: 0.1,
      gravity: -9.81,
      airDensity: 1.225,
      ballRadius: 0.02,
      ballMass: 0.0027,
      dragCoefficient: 0.47,
      magnusCoefficient: 0.00022,
      angularDrag: 0.018,
      table: TABLE_DEFAULT,
      rubbers: RUBBER_DEFAULTS
    },
    graphics: {
      arenaId: "national-arena",
      antialias: true,
      shadows: true,
      shadowMapSize: 2048,
      toneMappingExposure: 0.94,
      pixelRatioCap: 2,
      showTrails: false,
      reducedMotion: false
    },
    controls: {
      mouseSensitivity: 1,
      gamepadDeadzone: 0.12,
      invertY: false,
      assist: true,
      swingButton: "Space"
    },
    difficulty: DIFFICULTIES.club
  };
}
