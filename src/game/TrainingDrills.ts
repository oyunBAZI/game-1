import { Vec3 } from "../core/Vec3";
import type { Side } from "../core/types";

export type DrillGoal = "land" | "speed" | "spin" | "placement" | "consistency";

export interface DrillDefinition {
  id: string;
  name: string;
  description: string;
  goal: DrillGoal;
  duration: number;
  targetSide: Side;
  target: Vec3;
  tolerance: number;
  minimumHits: number;
  scoring: {
    hit: number;
    miss: number;
    streak: number;
  };
}

export interface DrillProgress {
  elapsed: number;
  hits: number;
  misses: number;
  streak: number;
  bestStreak: number;
  score: number;
  complete: boolean;
  passed: boolean;
}

export const DRILLS: DrillDefinition[] = [
  {
    id: "deep-crosscourt",
    name: "Deep Cross-Court",
    description: "Land ten balls in the far diagonal quarter of the table.",
    goal: "placement",
    duration: 90,
    targetSide: "away",
    target: new Vec3(0.38, 0.76, -0.48),
    tolerance: 0.28,
    minimumHits: 10,
    scoring: { hit: 100, miss: -20, streak: 25 }
  },
  {
    id: "spin-control",
    name: "Spin Control",
    description: "Return balls while keeping the requested spin profile.",
    goal: "spin",
    duration: 75,
    targetSide: "away",
    target: new Vec3(0, 0.9, -0.35),
    tolerance: 0.4,
    minimumHits: 12,
    scoring: { hit: 90, miss: -15, streak: 20 }
  },
  {
    id: "rally-builder",
    name: "Rally Builder",
    description: "Build a controlled rally without missing the table.",
    goal: "consistency",
    duration: 120,
    targetSide: "away",
    target: new Vec3(0, 0.76, -0.2),
    tolerance: 0.7,
    minimumHits: 25,
    scoring: { hit: 60, miss: -30, streak: 15 }
  },
  {
    id: "speed-gate",
    name: "Speed Gate",
    description: "Reach a repeatable outgoing speed while maintaining legality.",
    goal: "speed",
    duration: 60,
    targetSide: "away",
    target: new Vec3(0, 0.8, -0.3),
    tolerance: 0.55,
    minimumHits: 8,
    scoring: { hit: 140, miss: -35, streak: 30 }
  }
];

export class DrillSession {
  readonly progress: DrillProgress = {
    elapsed: 0,
    hits: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
    score: 0,
    complete: false,
    passed: false
  };
  readonly drill: DrillDefinition;

  constructor(drillId: string) {
    const selected = DRILLS.find((drill) => drill.id === drillId) ?? DRILLS[0];
    this.drill = {
      ...selected,
      target: selected.target.clone(),
      scoring: { ...selected.scoring }
    };
  }

  update(dt: number): void {
    if (this.progress.complete) return;
    this.progress.elapsed += dt;
    if (this.progress.elapsed >= this.drill.duration) this.finish();
  }

  registerHit(position: Vec3, quality = 1): void {
    if (this.progress.complete) return;
    const distance = position.distanceTo(this.drill.target);
    if (distance <= this.drill.tolerance) {
      this.progress.hits += 1;
      this.progress.streak += 1;
      this.progress.bestStreak = Math.max(this.progress.bestStreak, this.progress.streak);
      this.progress.score += Math.round(this.drill.scoring.hit * quality + this.drill.scoring.streak * Math.max(0, this.progress.streak - 1));
    } else {
      this.registerMiss();
    }
    if (this.progress.hits >= this.drill.minimumHits) this.finish();
  }

  registerMiss(): void {
    if (this.progress.complete) return;
    this.progress.misses += 1;
    this.progress.streak = 0;
    this.progress.score += this.drill.scoring.miss;
  }

  finish(): void {
    this.progress.complete = true;
    this.progress.passed = this.progress.hits >= this.drill.minimumHits;
  }

  reset(): void {
    this.progress.elapsed = 0;
    this.progress.hits = 0;
    this.progress.misses = 0;
    this.progress.streak = 0;
    this.progress.bestStreak = 0;
    this.progress.score = 0;
    this.progress.complete = false;
    this.progress.passed = false;
  }
}