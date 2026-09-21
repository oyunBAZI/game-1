import { clamp } from "./MathUtils";

export class SimulationClock {
  readonly fixedDelta: number;
  readonly maxFrameDelta: number;
  private accumulator = 0;
  private _time = 0;
  private _tick = 0;
  private _alpha = 0;
  private _paused = false;
  private _scale = 1;

  constructor(fixedHz = 240, maxFrameDelta = 0.1) {
    this.fixedDelta = 1 / Math.max(1, fixedHz);
    this.maxFrameDelta = maxFrameDelta;
  }

  get time(): number {
    return this._time;
  }

  get tick(): number {
    return this._tick;
  }

  get alpha(): number {
    return this._alpha;
  }

  get paused(): boolean {
    return this._paused;
  }

  get scale(): number {
    return this._scale;
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
  }

  setScale(scale: number): void {
    this._scale = clamp(scale, 0, 8);
  }

  reset(): void {
    this.accumulator = 0;
    this._time = 0;
    this._tick = 0;
    this._alpha = 0;
  }

  advance(frameDelta: number, step: (dt: number, tick: number) => void): number {
    if (this._paused) return 0;
    const scaled = clamp(frameDelta, 0, this.maxFrameDelta) * this._scale;
    this.accumulator += scaled;
    let steps = 0;
    const maxSteps = 32;
    while (this.accumulator >= this.fixedDelta && steps < maxSteps) {
      step(this.fixedDelta, this._tick);
      this.accumulator -= this.fixedDelta;
      this._time += this.fixedDelta;
      this._tick += 1;
      steps += 1;
    }
    this._alpha = this.accumulator / this.fixedDelta;
    return steps;
  }

  drain(): void {
    this.accumulator = 0;
    this._alpha = 0;
  }
}