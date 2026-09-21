import type { Side } from "../core/types";

export interface TournamentPlayer {
  id: string;
  name: string;
  rating: number;
  seed: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  home: string;
  away: string | null;
  winner: string | null;
  score: { home: number; away: number };
  status: "pending" | "ready" | "playing" | "complete";
}

export class TournamentModel {
  readonly players: TournamentPlayer[] = [];
  readonly matches: TournamentMatch[] = [];
  private currentMatchId: string | null = null;

  seed(players: TournamentPlayer[]): void {
    this.players.length = 0;
    this.players.push(...players.map((player) => ({ ...player })));
    this.players.sort((a, b) => a.seed - b.seed || b.rating - a.rating);
    this.generateBracket();
  }

  generateBracket(): void {
    this.matches.length = 0;
    const size = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, this.players.length))));
    const ids = this.players.map((player) => player.id);
    while (ids.length < size) ids.push("bye-" + ids.length);
    let roundPlayers = ids;
    let round = 1;
    while (roundPlayers.length > 1) {
      const next: string[] = [];
      for (let index = 0; index < roundPlayers.length; index += 2) {
        const home = roundPlayers[index];
        const away = roundPlayers[index + 1] ?? null;
        const id = "r" + round + "-" + (index / 2);
        this.matches.push({
          id,
          round,
          home,
          away,
          winner: null,
          score: { home: 0, away: 0 },
          status: away && !away.startsWith("bye-") ? "ready" : "complete"
        });
        if (away?.startsWith("bye-")) next.push(home);
        else next.push("winner:" + id);
      }
      roundPlayers = next;
      round += 1;
    }
  }

  startMatch(id: string): TournamentMatch | null {
    const match = this.matches.find((candidate) => candidate.id === id);
    if (!match || match.status === "complete" || !match.away) return null;
    match.status = "playing";
    this.currentMatchId = id;
    return { ...match, score: { ...match.score } };
  }

  finishMatch(id: string, winner: Side, score: { home: number; away: number }): void {
    const match = this.matches.find((candidate) => candidate.id === id);
    if (!match) return;
    match.status = "complete";
    match.score = { ...score };
    match.winner = winner === "home" ? match.home : match.away;
    this.advanceWinner(match);
    if (this.currentMatchId === id) this.currentMatchId = null;
  }

  nextReadyMatch(): TournamentMatch | null {
    return this.matches.find((match) => match.status === "ready") ?? null;
  }

  current(): TournamentMatch | null {
    return this.matches.find((match) => match.id === this.currentMatchId) ?? null;
  }

  standings(): TournamentPlayer[] {
    return [...this.players].sort((a, b) => b.rating - a.rating);
  }

  private advanceWinner(match: TournamentMatch): void {
    const next = this.matches.find((candidate) => candidate.round === match.round + 1 && (candidate.home === "winner:" + match.id || candidate.away === "winner:" + match.id));
    if (!next || !match.winner) return;
    if (next.home === "winner:" + match.id) next.home = match.winner;
    if (next.away === "winner:" + match.id) next.away = match.winner;
    if (next.home && next.away && !next.home.startsWith("bye-") && !next.away.startsWith("bye-")) next.status = "ready";
  }
}