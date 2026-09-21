import type { Side, ShotKind, TelemetryRecord } from "../core/types";

export interface SideStats {
  pointsWon: number;
  ralliesWon: number;
  serves: number;
  servicePointsWon: number;
  hits: number;
  winners: number;
  errors: number;
  nets: number;
  edges: number;
  longestRally: number;
  maxSpeed: number;
  totalSpeed: number;
  spinRate: number;
  shotKinds: Record<ShotKind, number>;
}

export class MatchStats {
  readonly sides: Record<Side, SideStats> = {
    home: this.emptySide(),
    away: this.emptySide()
  };
  readonly telemetry: TelemetryRecord[] = [];

  recordPoint(winner: Side): void {
    this.sides[winner].pointsWon += 1;
    this.sides[winner].ralliesWon += 1;
  }

  recordServe(server: Side, won: boolean): void {
    this.sides[server].serves += 1;
    if (won) this.sides[server].servicePointsWon += 1;
  }

  recordShot(side: Side, kind: ShotKind, speed: number, spinRate: number): void {
    const stats = this.sides[side];
    stats.hits += 1;
    stats.shotKinds[kind] += 1;
    stats.maxSpeed = Math.max(stats.maxSpeed, speed);
    stats.totalSpeed += speed;
    stats.spinRate += spinRate;
    if (kind === "smash" || kind === "loop") stats.winners += 1;
  }

  recordError(side: Side, reason: string): void {
    this.sides[side].errors += 1;
    if (reason.includes("net")) this.sides[side].nets += 1;
  }

  recordRallyLength(side: Side, length: number): void {
    this.sides[side].longestRally = Math.max(this.sides[side].longestRally, length);
  }

  emit(category: string, name: string, values: Record<string, number | string | boolean>): void {
    this.telemetry.push({
      id: category + ":" + name + ":" + this.telemetry.length,
      tick: this.telemetry.length,
      category,
      name,
      values
    });
    if (this.telemetry.length > 5000) this.telemetry.shift();
  }

  averageSpeed(side: Side): number {
    const stats = this.sides[side];
    return stats.hits ? stats.totalSpeed / stats.hits : 0;
  }

  averageSpin(side: Side): number {
    const stats = this.sides[side];
    return stats.hits ? stats.spinRate / stats.hits : 0;
  }

  reset(): void {
    this.sides.home = this.emptySide();
    this.sides.away = this.emptySide();
    this.telemetry.length = 0;
  }

  private emptySide(): SideStats {
    return {
      pointsWon: 0,
      ralliesWon: 0,
      serves: 0,
      servicePointsWon: 0,
      hits: 0,
      winners: 0,
      errors: 0,
      nets: 0,
      edges: 0,
      longestRally: 0,
      maxSpeed: 0,
      totalSpeed: 0,
      spinRate: 0,
      shotKinds: {
        serve: 0,
        drive: 0,
        loop: 0,
        smash: 0,
        push: 0,
        chop: 0,
        block: 0,
        lob: 0,
        unknown: 0
      }
    };
  }
}