import { Vec3 } from "../core/Vec3";
import type { Side, ShotKind } from "../core/types";

export interface ShotTelemetryRecord {
  id: string;
  tick: number;
  side: Side;
  kind: ShotKind;
  speed: number;
  spinRate: number;
  contactQuality: number;
  launch: Vec3;
  spin: Vec3;
  predictedLanding: Vec3 | null;
  legal: boolean;
}

export class ShotTelemetry {
  private records: ShotTelemetryRecord[] = [];
  private sequence = 0;

  record(record: Omit<ShotTelemetryRecord, "id">): ShotTelemetryRecord {
    const result = {
      ...record,
      id: "shot-" + ++this.sequence,
      launch: record.launch.clone(),
      spin: record.spin.clone(),
      predictedLanding: record.predictedLanding?.clone() ?? null
    };
    this.records.push(result);
    if (this.records.length > 2500) this.records.shift();
    return result;
  }

  recent(limit = 30): ShotTelemetryRecord[] {
    return this.records.slice(-limit).map((record) => ({
      ...record,
      launch: record.launch.clone(),
      spin: record.spin.clone(),
      predictedLanding: record.predictedLanding?.clone() ?? null
    }));
  }

  bySide(side: Side): ShotTelemetryRecord[] {
    return this.records.filter((record) => record.side === side);
  }

  byKind(kind: ShotKind): ShotTelemetryRecord[] {
    return this.records.filter((record) => record.kind === kind);
  }

  fastest(side?: Side): ShotTelemetryRecord | null {
    const source = side ? this.bySide(side) : this.records;
    return source.reduce<ShotTelemetryRecord | null>((best, record) => !best || record.speed > best.speed ? record : best, null);
  }

  clear(): void {
    this.records.length = 0;
    this.sequence = 0;
  }
}