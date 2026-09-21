import type { CollisionContact } from "../core/types";
import { Vec3 } from "../core/Vec3";

export interface ContactHistoryEntry extends CollisionContact {
  tick: number;
  time: number;
}

export class ContactHistory {
  private entries: ContactHistoryEntry[] = [];

  add(contact: CollisionContact, tick: number, time: number): void {
    this.entries.push({
      ...contact,
      tick,
      time,
      point: { ...contact.point },
      normal: { ...contact.normal }
    });
    if (this.entries.length > 2048) this.entries.shift();
  }

  recent(limit = 64): ContactHistoryEntry[] {
    return this.entries.slice(-limit).map((entry) => ({
      ...entry,
      point: { ...entry.point },
      normal: { ...entry.normal }
    }));
  }

  byKind(kind: CollisionContact["kind"]): ContactHistoryEntry[] {
    return this.entries.filter((entry) => entry.kind === kind);
  }

  last(kind?: CollisionContact["kind"]): ContactHistoryEntry | null {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      if (!kind || this.entries[index].kind === kind) return { ...this.entries[index] };
    }
    return null;
  }

  averageSpeed(kind?: CollisionContact["kind"]): number {
    const values = (kind ? this.byKind(kind) : this.entries).map((entry) => entry.relativeSpeed);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  impactDirection(kind?: CollisionContact["kind"]): Vec3 {
    const entry = this.last(kind);
    return entry ? Vec3.from(entry.normal) : new Vec3(0, 1, 0);
  }

  clear(): void {
    this.entries.length = 0;
  }
}