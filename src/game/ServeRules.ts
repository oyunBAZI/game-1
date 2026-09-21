import type { Side } from "../core/types";
import { TABLE } from "../physics/constants";

export interface ServeGeometry {
  server: Side;
  contact: { x: number; y: number; z: number };
  firstBounce: { x: number; z: number };
  secondBounce: { x: number; z: number };
  crossesNet: boolean;
  legal: boolean;
  errors: string[];
}

export class ServeRules {
  validate(geometry: ServeGeometry): ServeGeometry {
    const errors = [...geometry.errors];
    const ownHalfSign = geometry.server === "home" ? 1 : -1;
    const receiverSign = -ownHalfSign;
    if (geometry.contact.y < TABLE.top + 0.16) errors.push("toss-height");
    if (Math.sign(geometry.firstBounce.z) !== ownHalfSign) errors.push("first-bounce-side");
    if (Math.sign(geometry.secondBounce.z) !== receiverSign) errors.push("second-bounce-side");
    if (Math.abs(geometry.firstBounce.x) > TABLE.width / 2) errors.push("first-bounce-wide");
    if (Math.abs(geometry.secondBounce.x) > TABLE.width / 2) errors.push("second-bounce-wide");
    if (!geometry.crossesNet) errors.push("did-not-cross-net");
    return { ...geometry, legal: errors.length === 0, errors };
  }

  firstBounceTarget(server: Side, x: number, depth: number): { x: number; z: number } {
    const sign = server === "home" ? 1 : -1;
    return { x: Math.max(-TABLE.width / 2, Math.min(TABLE.width / 2, x)), z: sign * Math.max(0.08, Math.min(TABLE.length / 2 - 0.06, depth)) };
  }

  secondBounceTarget(server: Side, x: number, depth: number): { x: number; z: number } {
    const sign = server === "home" ? -1 : 1;
    return { x: Math.max(-TABLE.width / 2, Math.min(TABLE.width / 2, x)), z: sign * Math.max(0.08, Math.min(TABLE.length / 2 - 0.06, depth)) };
  }

  isLet(netContact: boolean, landedLegal: boolean): boolean {
    return netContact && landedLegal;
  }
}