import { SimulationClock } from "./Clock";
import { EventBus } from "./EventBus";
import type { Updatable } from "./types";

export interface FixedStepParticipant {
  fixedUpdate(dt: number, tick: number): void;
}

export class FixedStepLoop {
  readonly clock: SimulationClock;
  private participants: FixedStepParticipant[] = [];
  private raf = 0;
  private lastTime = 0;
  private running = false;
  private frameListeners = new Set<(dt: number, alpha: number) => void>();

  constructor(private readonly events: EventBus, fixedHz = 240) {
    this.clock = new SimulationClock(fixedHz);
  }

  add(participant: FixedStepParticipant): () => void {
    this.participants.push(participant);
    return () => {
      const index = this.participants.indexOf(participant);
      if (index >= 0) this.participants.splice(index, 1);
    };
  }

  onFrame(listener: (dt: number, alpha: number) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame((time) => this.frame(time));
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  step(frameDelta: number): number {
    return this.clock.advance(frameDelta, (dt, tick) => {
      for (const participant of [...this.participants]) participant.fixedUpdate(dt, tick);
      this.events.emit("simulation:step", { tick, dt });
    });
  }

  private frame(time: number): void {
    if (!this.running) return;
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.step(dt);
    for (const listener of this.frameListeners) listener(dt, this.clock.alpha);
    this.raf = requestAnimationFrame((next) => this.frame(next));
  }

  dispose(): void {
    this.stop();
    this.participants.length = 0;
    this.frameListeners.clear();
  }
}