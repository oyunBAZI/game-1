import type { GraphicsConfig } from "../config/GameConfig";
import type { FrameBudget } from "./FrameBudget";

export type QualityLevel = "low" | "medium" | "high" | "ultra";

export class QualityScaler {
  private level: QualityLevel = "high";
  private cooldown = 0;
  private readonly order: QualityLevel[] = ["low", "medium", "high", "ultra"];

  constructor(private readonly config: GraphicsConfig) {}

  update(dt: number, budget: FrameBudget): QualityLevel {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown > 0) return this.level;
    if (budget.frameMs > 24 && this.level !== "low") {
      this.setLevel(this.order[Math.max(0, this.order.indexOf(this.level) - 1)]);
      this.cooldown = 3;
    } else if (budget.frameMs < 12 && this.level !== "ultra") {
      this.setLevel(this.order[Math.min(this.order.length - 1, this.order.indexOf(this.level) + 1)]);
      this.cooldown = 8;
    }
    return this.level;
  }

  setLevel(level: QualityLevel): void {
    this.level = level;
    const presets: Record<QualityLevel, Partial<GraphicsConfig>> = {
      low: { shadowMapSize: 512, pixelRatioCap: 1 },
      medium: { shadowMapSize: 1024, pixelRatioCap: 1.5 },
      high: { shadowMapSize: 2048, pixelRatioCap: 2 },
      ultra: { shadowMapSize: 4096, pixelRatioCap: 2.5 }
    };
    Object.assign(this.config, presets[level]);
  }

  current(): QualityLevel {
    return this.level;
  }
}
