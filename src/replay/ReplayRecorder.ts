import type { EventBus } from "../core/EventBus";
import type { GameMode, InputFrame, ReplayData, ReplayFrame, ReplayHeader, Side } from "../core/types";
import type { GameSimulation } from "../game/GameSimulation";

export class ReplayRecorder {
  private recording = false;
  private frames: ReplayFrame[] = [];
  private events: Array<{ type: string; tick: number; time: number; payload: Record<string, unknown> }> = [];
  private unsubscribe: Array<() => void> = [];

  constructor(
    private readonly simulation: GameSimulation,
    private readonly eventBus: EventBus,
    private readonly seed = 1204
  ) {
    for (const key of ["physics:contact", "physics:out", "shot:hit", "rally:end", "score:change"] as const) {
      this.unsubscribe.push(eventBus.on(key, (payload) => {
        if (!this.recording) return;
        this.events.push({
          type: key,
          tick: simulation.world.state.tick,
          time: simulation.world.state.time,
          payload: payload as Record<string, unknown>
        });
      }));
    }
  }

  start(): void {
    this.frames.length = 0;
    this.events.length = 0;
    this.recording = true;
  }

  capture(inputs: Record<Side, InputFrame>): void {
    if (!this.recording) return;
    this.frames.push({
      tick: this.simulation.world.state.tick,
      inputs: {
        home: { ...inputs.home },
        away: { ...inputs.away }
      },
      snapshot: this.simulation.snapshot(),
      events: this.events.splice(0)
    });
  }

  stop(): ReplayData {
    this.recording = false;
    const header: ReplayHeader = {
      version: 1,
      createdAt: new Date().toISOString(),
      seed: this.seed,
      mode: "replay" as GameMode,
      physicsHz: Math.round(1 / (1 / 240)),
      playerNames: { home: "Player", away: "Opponent" }
    };
    return { header, frames: this.frames.map((frame) => structuredClone(frame)) };
  }

  isRecording(): boolean {
    return this.recording;
  }

  frameCount(): number {
    return this.frames.length;
  }

  dispose(): void {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe.length = 0;
    this.frames.length = 0;
  }
}