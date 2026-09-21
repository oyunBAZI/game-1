import type { GamePhase, Side } from "../core/types";

export interface TimelineEvent {
  id: string;
  time: number;
  phase: GamePhase;
  label: string;
  side?: Side;
  score?: { home: number; away: number };
}

export class MatchTimeline {
  private events: TimelineEvent[] = [];
  private sequence = 0;

  add(event: Omit<TimelineEvent, "id">): TimelineEvent {
    const stored = { ...event, id: "timeline-" + ++this.sequence, score: event.score ? { ...event.score } : undefined };
    this.events.push(stored);
    if (this.events.length > 2000) this.events.shift();
    return stored;
  }

  point(time: number, phase: GamePhase, winner: Side, label: string, score: { home: number; away: number }): TimelineEvent {
    return this.add({ time, phase, side: winner, label, score });
  }

  recent(limit = 20): TimelineEvent[] {
    return this.events.slice(-limit).map((event) => ({ ...event, score: event.score ? { ...event.score } : undefined }));
  }

  at(time: number): TimelineEvent[] {
    return this.events.filter((event) => event.time <= time).map((event) => ({ ...event }));
  }

  find(id: string): TimelineEvent | null {
    const event = this.events.find((candidate) => candidate.id === id);
    return event ? { ...event, score: event.score ? { ...event.score } : undefined } : null;
  }

  clear(): void {
    this.events.length = 0;
    this.sequence = 0;
  }
}