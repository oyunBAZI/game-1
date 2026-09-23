export interface ArenaProfile {
  id: string;
  label: string;
  description: string;
  floorColor: number;
  wallColor: number;
  accentColor: number;
  lightColor: number;
  lightIntensity: number;
  fogNear: number;
  fogFar: number;
  crowd: "none" | "quiet" | "full";
  music: "none" | "ambient" | "arena";
}

export const ARENA_CATALOG: ArenaProfile[] = [
  {
    id: "training-lab",
    label: "Training Lab",
    description: "A quiet, readable court for calibration and drills.",
    floorColor: 0x536b70,
    wallColor: 0x273841,
    accentColor: 0x54d6c7,
    lightColor: 0xd9ffff,
    lightIntensity: 3.6,
    fogNear: 6,
    fogFar: 22,
    crowd: "none",
    music: "ambient"
  },
  {
    id: "club-hall",
    label: "Club Hall",
    description: "A warm community venue with layered practical lighting.",
    floorColor: 0x746352,
    wallColor: 0x3a302d,
    accentColor: 0xf6c96b,
    lightColor: 0xffefd4,
    lightIntensity: 3.1,
    fogNear: 7,
    fogFar: 24,
    crowd: "quiet",
    music: "ambient"
  },
  {
    id: "national-arena",
    label: "National Arena",
    description: "A broadcast-ready competition floor with cinematic contrast.",
    floorColor: 0x3d5060,
    wallColor: 0x15242f,
    accentColor: 0x5cc9cc,
    lightColor: 0xe9f6f4,
    lightIntensity: 3.9,
    fogNear: 8,
    fogFar: 28,
    crowd: "full",
    music: "arena"
  },
  {
    id: "night-court",
    label: "Night Court",
    description: "A dark, high-contrast environment for dramatic replays.",
    floorColor: 0x293c50,
    wallColor: 0x0b1321,
    accentColor: 0x7fa9ff,
    lightColor: 0xc9d7ff,
    lightIntensity: 2.7,
    fogNear: 5,
    fogFar: 18,
    crowd: "none",
    music: "ambient"
  }
];

export function getArena(id: string): ArenaProfile {
  return ARENA_CATALOG.find((arena) => arena.id === id) ?? ARENA_CATALOG[0];
}
