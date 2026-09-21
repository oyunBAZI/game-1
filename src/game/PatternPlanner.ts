import { Vec3 } from "../core/Vec3";
import type { Side, ShotKind } from "../core/types";
import { PlacementModel } from "./PlacementModel";

export interface PatternStep {
  id: string;
  shot: ShotKind;
  target: Vec3;
  purpose: "build" | "move" | "finish" | "reset";
  risk: number;
}

export interface PatternPlan {
  name: string;
  steps: PatternStep[];
  index: number;
}

export class PatternPlanner {
  private readonly placement = new PlacementModel();
  private planState: PatternPlan = { name: "neutral", steps: [], index: 0 };

  create(side: Side, pattern: "three-ball" | "serve-plus-one" | "wide-body" | "random"): PatternPlan {
    const sign = side === "home" ? -1 : 1;
    const steps: PatternStep[] = [];
    if (pattern === "three-ball") {
      steps.push(
        { id: "one", shot: "serve", target: this.placement.targetForPattern(side, "short"), purpose: "build", risk: 0.28 },
        { id: "two", shot: "loop", target: this.placement.targetForPattern(side, "crosscourt"), purpose: "move", risk: 0.48 },
        { id: "three", shot: "smash", target: this.placement.targetForPattern(side, "downline"), purpose: "finish", risk: 0.7 }
      );
    } else if (pattern === "serve-plus-one") {
      steps.push(
        { id: "serve", shot: "serve", target: this.placement.targetForPattern(side, "short"), purpose: "build", risk: 0.25 },
        { id: "attack", shot: "loop", target: this.placement.targetForPattern(side, "body"), purpose: "finish", risk: 0.52 }
      );
    } else if (pattern === "wide-body") {
      steps.push(
        { id: "wide", shot: "drive", target: this.placement.targetForPattern(side, "crosscourt"), purpose: "move", risk: 0.44 },
        { id: "body", shot: "drive", target: this.placement.targetForPattern(side, "body"), purpose: "move", risk: 0.38 },
        { id: "line", shot: "loop", target: this.placement.targetForPattern(side, "downline"), purpose: "finish", risk: 0.62 }
      );
    } else {
      const options: Array<"crosscourt" | "downline" | "body" | "short" | "deep"> = ["crosscourt", "downline", "body", "short", "deep"];
      for (let index = 0; index < 5; index += 1) {
        const choice = options[index % options.length];
        steps.push({
          id: "random-" + index,
          shot: index === 0 ? "serve" : index === 4 ? "smash" : "drive",
          target: this.placement.targetForPattern(side, choice),
          purpose: index === 4 ? "finish" : index === 0 ? "build" : "move",
          risk: 0.25 + index * 0.1
        });
      }
    }
    this.planState = { name: pattern, steps, index: 0 };
    void sign;
    return this.clonePlan();
  }

  current(): PatternStep | null {
    return this.planState.steps[this.planState.index] ?? null;
  }

  advance(): PatternStep | null {
    if (this.planState.index < this.planState.steps.length - 1) this.planState.index += 1;
    return this.current();
  }

  reset(): void {
    this.planState.index = 0;
  }

  scorePosition(position: Vec3): number {
    const step = this.current();
    if (!step) return 0;
    const distance = position.distanceTo(step.target);
    return Math.max(0, 1 - distance / 0.9);
  }

  private clonePlan(): PatternPlan {
    return {
      name: this.planState.name,
      index: this.planState.index,
      steps: this.planState.steps.map((step) => ({ ...step, target: step.target.clone() }))
    };
  }
}