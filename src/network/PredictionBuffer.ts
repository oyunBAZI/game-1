import type { InputFrame, WorldSnapshot } from "../core/types";

export interface PredictedState {
  tick: number;
  input: InputFrame;
  snapshot: WorldSnapshot;
  confirmed: boolean;
}

export class PredictionBuffer {
  private states: PredictedState[] = [];

  push(state: PredictedState): void {
    this.states.push(structuredClone(state));
    if (this.states.length > 512) this.states.shift();
  }

  confirm(tick: number): void {
    for (const state of this.states) if (state.tick <= tick) state.confirmed = true;
  }

  rollback(tick: number): PredictedState | null {
    const target = this.states.find((state) => state.tick === tick) ?? null;
    this.states = this.states.filter((state) => state.tick <= tick);
    return target ? structuredClone(target) : null;
  }

  unconfirmed(): PredictedState[] {
    return this.states.filter((state) => !state.confirmed).map((state) => structuredClone(state));
  }

  clear(): void {
    this.states.length = 0;
  }
}