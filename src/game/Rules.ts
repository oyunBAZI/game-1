import type { Side } from "../core/types";
import { oppositeSide } from "../core/types";

export interface RuleSet {
  pointsPerGame: number;
  gamesToWin: number;
  winByTwo: boolean;
  serviceChangePoints: number;
  serviceChangeAtDeuce: boolean;
  alternateEnds: boolean;
  letOnNetServe: boolean;
  allowEdge: boolean;
  bestOf: number;
}

export const COMPETITION_RULES: RuleSet = {
  pointsPerGame: 11,
  gamesToWin: 3,
  winByTwo: true,
  serviceChangePoints: 2,
  serviceChangeAtDeuce: true,
  alternateEnds: true,
  letOnNetServe: true,
  allowEdge: true,
  bestOf: 5
};

export const TRAINING_RULES: RuleSet = {
  pointsPerGame: 11,
  gamesToWin: 1,
  winByTwo: false,
  serviceChangePoints: 5,
  serviceChangeAtDeuce: false,
  alternateEnds: false,
  letOnNetServe: true,
  allowEdge: true,
  bestOf: 1
};

export function isGamePoint(home: number, away: number, rules: RuleSet): boolean {
  const target = rules.pointsPerGame;
  return (home >= target - 1 && home > away) || (away >= target - 1 && away > home);
}

export function isDeuce(home: number, away: number, rules: RuleSet): boolean {
  return home >= rules.pointsPerGame - 1 && away >= rules.pointsPerGame - 1;
}

export function hasGameWinner(home: number, away: number, rules: RuleSet): Side | null {
  const highest = Math.max(home, away);
  const difference = Math.abs(home - away);
  if (highest < rules.pointsPerGame) return null;
  if (rules.winByTwo && difference < 2) return null;
  if (!rules.winByTwo && difference < 1) return null;
  return home > away ? "home" : "away";
}

export function hasMatchWinner(gamesHome: number, gamesAway: number, rules: RuleSet): Side | null {
  const target = Math.ceil(rules.bestOf / 2);
  if (gamesHome >= target) return "home";
  if (gamesAway >= target) return "away";
  return null;
}

export function serviceOwnerForPoint(
  initialServer: Side,
  pointsPlayed: number,
  home: number,
  away: number,
  rules: RuleSet
): Side {
  if (rules.serviceChangeAtDeuce && isDeuce(home, away, rules)) {
    return pointsPlayed % 2 === 0 ? initialServer : oppositeSide(initialServer);
  }
  const changeCount = Math.floor(pointsPlayed / Math.max(1, rules.serviceChangePoints));
  return changeCount % 2 === 0 ? initialServer : oppositeSide(initialServer);
}

export function receiverForServer(server: Side): Side {
  return oppositeSide(server);
}

export function shouldChangeEnds(gameIndex: number, rules: RuleSet): boolean {
  return rules.alternateEnds && gameIndex % 2 === 1;
}

export function pointSummary(home: number, away: number, rules: RuleSet): string {
  const deuce = isDeuce(home, away, rules);
  if (deuce) return "DEUCE";
  if (isGamePoint(home, away, rules)) return "GAME POINT";
  return "RALLY";
}