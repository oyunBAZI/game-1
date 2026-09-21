import type { RubberProfile } from "../core/types";

export interface BladeProfile {
  id: string;
  label: string;
  speed: number;
  control: number;
  vibration: number;
  weight: number;
  handle: "anatomic" | "flared" | "straight";
  rubbers: [string, string];
}

export const RUBBER_CATALOG: RubberProfile[] = [
  {
    id: "balanced",
    label: "Balanced",
    color: "red",
    restitution: 0.82,
    friction: 0.9,
    spinTransfer: 0.95,
    dwellTime: 0.004,
    hardness: 47
  },
  {
    id: "control-soft",
    label: "Control Soft",
    color: "black",
    restitution: 0.7,
    friction: 1.0,
    spinTransfer: 0.88,
    dwellTime: 0.007,
    hardness: 40
  },
  {
    id: "tacky-china",
    label: "Tacky China",
    color: "black",
    restitution: 0.74,
    friction: 1.17,
    spinTransfer: 1.22,
    dwellTime: 0.007,
    hardness: 41
  },
  {
    id: "tensor-47",
    label: "Tensor 47",
    color: "red",
    restitution: 0.91,
    friction: 0.86,
    spinTransfer: 1.08,
    dwellTime: 0.003,
    hardness: 47
  },
  {
    id: "short-pips",
    label: "Short Pips",
    color: "red",
    restitution: 0.84,
    friction: 0.54,
    spinTransfer: 0.58,
    dwellTime: 0.002,
    hardness: 54
  },
  {
    id: "anti-spin",
    label: "Anti-Spin",
    color: "black",
    restitution: 0.58,
    friction: 0.18,
    spinTransfer: 0.15,
    dwellTime: 0.009,
    hardness: 48
  }
];

export const BLADE_CATALOG: BladeProfile[] = [
  {
    id: "allround-classic",
    label: "Allround Classic",
    speed: 0.48,
    control: 0.9,
    vibration: 0.62,
    weight: 0.082,
    handle: "flared",
    rubbers: ["balanced", "balanced"]
  },
  {
    id: "offensive-seven",
    label: "Offensive Seven",
    speed: 0.75,
    control: 0.7,
    vibration: 0.44,
    weight: 0.088,
    handle: "anatomic",
    rubbers: ["tensor-47", "tensor-47"]
  },
  {
    id: "defensive-five",
    label: "Defensive Five",
    speed: 0.31,
    control: 0.98,
    vibration: 0.76,
    weight: 0.076,
    handle: "straight",
    rubbers: ["control-soft", "anti-spin"]
  },
  {
    id: "carbon-hybrid",
    label: "Carbon Hybrid",
    speed: 0.86,
    control: 0.62,
    vibration: 0.28,
    weight: 0.091,
    handle: "flared",
    rubbers: ["tensor-47", "tacky-china"]
  },
  {
    id: "pips-counter",
    label: "Pips Counter",
    speed: 0.59,
    control: 0.83,
    vibration: 0.5,
    weight: 0.084,
    handle: "straight",
    rubbers: ["short-pips", "balanced"]
  }
];

export function findRubber(id: string): RubberProfile {
  return RUBBER_CATALOG.find((rubber) => rubber.id === id) ?? RUBBER_CATALOG[0];
}

export function findBlade(id: string): BladeProfile {
  return BLADE_CATALOG.find((blade) => blade.id === id) ?? BLADE_CATALOG[0];
}

export function equipmentDescription(blade: BladeProfile): string {
  const left = findRubber(blade.rubbers[0]);
  const right = findRubber(blade.rubbers[1]);
  return blade.label + " · " + left.label + " / " + right.label + " · " + Math.round(blade.weight * 1000) + " g";
}