import type { ReplayData, ReplayFrame } from "../core/types";
import type { GameSimulation } from "../game/GameSimulation";

export class ReplayPlayer {
  private replay: ReplayData | null = null;
  private index = 0;
  private playing = false;
  private rate = 1;

  constructor(private readonly simulation: GameSimulation) {}

  load(replay: ReplayData): void {
    this.replay = structuredClone(replay);
    this.index = 0;
    this.playing = false;
    if (this.replay.frames[0]) this.simulation.world.restore(this.replay.frames[0].snapshot);
  }

  play(): void {
    if (this.replay?.frames.length) this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  stop(): void {
    this.playing = false;
    this.index = 0;
    const first = this.replay?.frames[0];
    if (first) this.simulation.world.restore(first.snapshot);
  }

  update(frameDelta: number): void {
    if (!this.playing || !this.replay) return;
    const advance = Math.max(1, Math.round(frameDelta * 60 * this.rate));
    this.index = Math.min(this.replay.frames.length - 1, this.index + advance);
    const frame = this.replay.frames[this.index];
    if (frame) this.apply(frame);
    if (this.index >= this.replay.frames.length - 1) this.playing = false;
  }

  seek(normalized: number): void {
    if (!this.replay || this.replay.frames.length === 0) return;
    this.index = Math.round(Math.max(0, Math.min(1, normalized)) * (this.replay.frames.length - 1));
    this.apply(this.replay.frames[this.index]);
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.01, Math.min(4, rate));
  }

  currentFrame(): ReplayFrame | null {
    return this.replay?.frames[this.index] ?? null;
  }

  isLoaded(): boolean {
    return Boolean(this.replay);
  }

  private apply(frame: ReplayFrame): void {
    this.simulation.world.restore(frame.snapshot);
    this.simulation.events.emit("replay:frame", {
      index: this.index,
      total: this.replay?.frames.length ?? 0
    });
  }
}