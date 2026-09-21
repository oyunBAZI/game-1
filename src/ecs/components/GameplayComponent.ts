import type { Side, ShotKind } from "../../core/types";
import { BaseComponent } from "../Component";

export class GameplayComponent extends BaseComponent {
  side: Side | null = null;
  team = "neutral";
  role = "prop";
  health = 1;
  stamina = 1;
  shotKind: ShotKind = "unknown";
  targetId: number | null = null;
  flags = new Set<string>();
  timers = new Map<string, number>();

  setFlag(flag: string, enabled = true): void {
    if (enabled) this.flags.add(flag);
    else this.flags.delete(flag);
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  setTimer(name: string, duration: number): void {
    this.timers.set(name, duration);
  }

  tickTimers(dt: number): void {
    for (const [name, time] of this.timers) {
      const next = time - dt;
      if (next <= 0) this.timers.delete(name);
      else this.timers.set(name, next);
    }
  }

  reset(): void {
    super.reset();
    this.side = null;
    this.team = "neutral";
    this.role = "prop";
    this.health = 1;
    this.stamina = 1;
    this.shotKind = "unknown";
    this.targetId = null;
    this.flags.clear();
    this.timers.clear();
  }
}