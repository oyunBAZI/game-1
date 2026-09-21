import type { Side } from "../core/types";
import { EventBus } from "../core/EventBus";
import { hasGameWinner, hasMatchWinner, type RuleSet } from "./Rules";

export interface ScoreSnapshot {
  points: Record<Side, number>;
  games: Record<Side, number>;
  pointsPlayed: number;
  gamesPlayed: number;
  lastPointWinner: Side | null;
  matchWinner: Side | null;
}

export class Scoreboard {
  points: Record<Side, number> = { home: 0, away: 0 };
  games: Record<Side, number> = { home: 0, away: 0 };
  pointsPlayed = 0;
  gamesPlayed = 0;
  lastPointWinner: Side | null = null;
  matchWinner: Side | null = null;

  constructor(
    private readonly events: EventBus,
    private readonly rules: RuleSet
  ) {}

  resetMatch(): void {
    this.points.home = 0;
    this.points.away = 0;
    this.games.home = 0;
    this.games.away = 0;
    this.pointsPlayed = 0;
    this.gamesPlayed = 0;
    this.lastPointWinner = null;
    this.matchWinner = null;
    this.emit();
  }

  resetGame(): void {
    this.points.home = 0;
    this.points.away = 0;
    this.pointsPlayed = 0;
    this.lastPointWinner = null;
    this.emit();
  }

  awardPoint(side: Side): { gameWinner: Side | null; matchWinner: Side | null } {
    if (this.matchWinner) return { gameWinner: null, matchWinner: this.matchWinner };
    this.points[side] += 1;
    this.pointsPlayed += 1;
    this.lastPointWinner = side;
    const gameWinner = hasGameWinner(this.points.home, this.points.away, this.rules);
    if (gameWinner) {
      this.games[gameWinner] += 1;
      this.gamesPlayed += 1;
      this.resetGame();
      this.lastPointWinner = gameWinner;
      this.matchWinner = hasMatchWinner(this.games.home, this.games.away, this.rules);
    }
    this.emit();
    return { gameWinner, matchWinner: this.matchWinner };
  }

  score(side: Side): number {
    return this.points[side];
  }

  gameScore(side: Side): number {
    return this.games[side];
  }

  snapshot(): ScoreSnapshot {
    return {
      points: { ...this.points },
      games: { ...this.games },
      pointsPlayed: this.pointsPlayed,
      gamesPlayed: this.gamesPlayed,
      lastPointWinner: this.lastPointWinner,
      matchWinner: this.matchWinner
    };
  }

  restore(snapshot: ScoreSnapshot): void {
    this.points = { ...snapshot.points };
    this.games = { ...snapshot.games };
    this.pointsPlayed = snapshot.pointsPlayed;
    this.gamesPlayed = snapshot.gamesPlayed;
    this.lastPointWinner = snapshot.lastPointWinner;
    this.matchWinner = snapshot.matchWinner;
    this.emit();
  }

  private emit(): void {
    this.events.emit("score:change", {
      home: this.points.home,
      away: this.points.away,
      gamesHome: this.games.home,
      gamesAway: this.games.away
    });
  }
}