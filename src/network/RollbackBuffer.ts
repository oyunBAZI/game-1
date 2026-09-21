import type { InputFrame, Side, WorldSnapshot } from "../core/types";

export interface RollbackEntry {
  tick: number;
  snapshot: WorldSnapshot;
  inputs: Record<Side, InputFrame>;
}

export class RollbackBuffer {
  private entries: RollbackEntry[] = [];

  constructor(private readonly capacity = 240) {}

  push(entry: RollbackEntry): void {
    const existing = this.entries.findIndex((item) => item.tick === entry.tick);
    if (existing >= 0) this.entries[existing] = structuredClone(entry);
    else this.entries.push(structuredClone(entry));
    this.entries.sort((a, b) => a.tick - b.tick);
    while (this.entries.length > this.capacity) this.entries.shift();
  }

  get(tick: number): RollbackEntry | null {
    const exact = this.entries.find((entry) => entry.tick === tick);
    if (exact) return structuredClone(exact);
    let nearest: RollbackEntry | null = null;
    for (const entry of this.entries) {
      if (entry.tick <= tick) nearest = entry;
      else break;
    }
    return nearest ? structuredClone(nearest) : null;
  }

  discardBefore(tick: number): void {
    this.entries = this.entries.filter((entry) => entry.tick >= tick);
  }

  clear(): void {
    this.entries.length = 0;
  }

  size(): number {
    return this.entries.length;
  }

  range(): { first: number | null; last: number | null } {
    return {
      first: this.entries[0]?.tick ?? null,
      last: this.entries[this.entries.length - 1]?.tick ?? null
    };
  }
}