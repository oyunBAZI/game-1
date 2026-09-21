import type { TelemetryRecord } from "../core/types";

export interface TelemetryFilter {
  category?: string;
  name?: string;
  sinceTick?: number;
  untilTick?: number;
}

export class TelemetryBuffer {
  private records: TelemetryRecord[] = [];
  private sequence = 0;

  constructor(private readonly capacity = 10000) {}

  push(category: string, name: string, tick: number, values: Record<string, number | string | boolean>): TelemetryRecord {
    const record: TelemetryRecord = {
      id: category + ":" + name + ":" + ++this.sequence,
      tick,
      category,
      name,
      values: { ...values }
    };
    this.records.push(record);
    while (this.records.length > this.capacity) this.records.shift();
    return record;
  }

  add(record: TelemetryRecord): void {
    this.records.push(structuredClone(record));
    while (this.records.length > this.capacity) this.records.shift();
  }

  query(filter: TelemetryFilter = {}): TelemetryRecord[] {
    return this.records.filter((record) => {
      if (filter.category && record.category !== filter.category) return false;
      if (filter.name && record.name !== filter.name) return false;
      if (filter.sinceTick !== undefined && record.tick < filter.sinceTick) return false;
      if (filter.untilTick !== undefined && record.tick > filter.untilTick) return false;
      return true;
    }).map((record) => structuredClone(record));
  }

  latest(category?: string): TelemetryRecord | null {
    for (let index = this.records.length - 1; index >= 0; index -= 1) {
      if (!category || this.records[index].category === category) return structuredClone(this.records[index]);
    }
    return null;
  }

  count(category?: string): number {
    return category ? this.records.filter((record) => record.category === category).length : this.records.length;
  }

  clear(): void {
    this.records.length = 0;
    this.sequence = 0;
  }

  export(): TelemetryRecord[] {
    return this.records.map((record) => structuredClone(record));
  }
}