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
    floorColor: 0x1b2c35,
    wallColor: 0x101d27,
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
    floorColor: 0x374233,
    wallColor: 0x29291f,
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
    floorColor: 0x171c2b,
    wallColor: 0x0b1020,
    accentColor: 0xff5f8c,
    lightColor: 0xe9e4ff,
    lightIntensity: 4.2,
    fogNear: 8,
    fogFar: 28,
    crowd: "full",
    music: "arena"
  },
  {
    id: "night-court",
    label: "Night Court",
    description: "A dark, high-contrast environment for dramatic replays.",
    floorColor: 0x101c2a,
    wallColor: 0x05070c,
    accentColor: 0x7c9cff,
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