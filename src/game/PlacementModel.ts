import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { Side, ShotKind } from "../core/types";

export interface PlacementRequest {
  side: Side;
  shot: ShotKind;
  target: Vec3;
  risk: number;
  depth: number;
  width: number;
  height: number;
}

export interface PlacementResult {
  target: Vec3;
  margin: number;
  risk: number;
  valid: boolean;
  zone: "short" | "middle" | "deep" | "wide" | "net";
}

export class PlacementModel {
  readonly tableWidth = 1.525;
  readonly tableLength = 2.74;

  evaluate(request: PlacementRequest): PlacementResult {
    const margin = this.marginToLines(request.target);
    const valid = margin >= 0.015;
    const zone = this.zone(request.target);
    const risk = clamp(request.risk + (0.08 - margin) * 3, 0, 1);
    return {
      target: request.target.clone(),
      margin,
      risk,
      valid,
      zone
    };
  }

  targetForPattern(side: Side, pattern: "crosscourt" | "downline" | "body" | "short" | "deep"): Vec3 {
    const sign = side === "home" ? -1 : 1;
    if (pattern === "crosscourt") return new Vec3(sign * 0.48, 0.76, sign * 1.03);
    if (pattern === "downline") return new Vec3(sign * -0.48, 0.76, sign * 1.03);
    if (pattern === "body") return new Vec3(0, 0.76, sign * 0.88);
    if (pattern === "short") return new Vec3(sign * 0.18, 0.76, sign * 0.24);
    return new Vec3(sign * 0.25, 0.76, sign * 1.18);
  }

  addUncertainty(target: Vec3, standardDeviation: number, random: () => number): Vec3 {
    const gaussian = () => {
      const u = Math.max(1e-6, random());
      const v = Math.max(1e-6, random());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
    };
    return new Vec3(
      target.x + gaussian() * standardDeviation,
      target.y,
      target.z + gaussian() * standardDeviation
    );
  }

  private marginToLines(target: Vec3): number {
    const halfWidth = this.tableWidth / 2;
    const halfLength = this.tableLength / 2;
    return Math.min(halfWidth - Math.abs(target.x), halfLength - Math.abs(target.z));
  }

  private zone(target: Vec3): PlacementResult["zone"] {
    if (Math.abs(target.z) < 0.42) return "short";
    if (Math.abs(target.x) > this.tableWidth * 0.42) return "wide";
    if (Math.abs(target.z) > this.tableLength * 0.38) return "deep";
    if (target.y < 0.78) return "net";
    return "middle";
  }
}