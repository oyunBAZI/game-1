export interface FrameBudget {
  frameMs: number;
  physicsMs: number;
  renderMs: number;
  uiMs: number;
  idleMs: number;
  droppedFrames: number;
}

export class FrameBudgetTracker {
  private current: FrameBudget = {
    frameMs: 16.67,
    physicsMs: 0,
    renderMs: 0,
    uiMs: 0,
    idleMs: 0,
    droppedFrames: 0
  };
  private samples: FrameBudget[] = [];

  beginFrame(): number {
    return performance.now();
  }

  endFrame(start: number, physicsMs: number, renderMs: number, uiMs: number): FrameBudget {
    const frameMs = performance.now() - start;
    this.current = {
      frameMs,
      physicsMs,
      renderMs,
      uiMs,
      idleMs: Math.max(0, 16.67 - frameMs),
      droppedFrames: frameMs > 33.34 ? Math.floor(frameMs / 16.67) - 1 : 0
    };
    this.samples.push({ ...this.current });
    if (this.samples.length > 180) this.samples.shift();
    return { ...this.current };
  }

  latest(): FrameBudget {
    return { ...this.current };
  }

  average(): FrameBudget {
    if (!this.samples.length) return { ...this.current };
    const keys: Array<keyof FrameBudget> = ["frameMs", "physicsMs", "renderMs", "uiMs", "idleMs", "droppedFrames"];
    const result = { ...this.current };
    for (const key of keys) result[key] = this.samples.reduce((sum, sample) => sum + sample[key], 0) / this.samples.length;
    return result;
  }

  reset(): void {
    this.samples.length = 0;
  }
}