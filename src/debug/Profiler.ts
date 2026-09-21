export interface ProfileSample {
  name: string;
  duration: number;
  start: number;
  end: number;
}

export class Profiler {
  private active = new Map<string, number>();
  private samples: ProfileSample[] = [];
  private history = new Map<string, number[]>();

  begin(name: string): void {
    this.active.set(name, performance.now());
  }

  end(name: string): number {
    const start = this.active.get(name);
    if (start === undefined) return 0;
    const end = performance.now();
    const duration = end - start;
    this.active.delete(name);
    const sample = { name, duration, start, end };
    this.samples.push(sample);
    const values = this.history.get(name) ?? [];
    values.push(duration);
    if (values.length > 120) values.shift();
    this.history.set(name, values);
    if (this.samples.length > 1000) this.samples.shift();
    return duration;
  }

  time<T>(name: string, callback: () => T): T {
    this.begin(name);
    try {
      return callback();
    } finally {
      this.end(name);
    }
  }

  recent(name?: string): ProfileSample[] {
    return name ? this.samples.filter((sample) => sample.name === name) : [...this.samples];
  }

  average(name: string): number {
    const values = this.history.get(name) ?? [];
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  latest(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [name] of this.history) result[name] = this.average(name);
    return result;
  }

  reset(): void {
    this.active.clear();
    this.samples.length = 0;
    this.history.clear();
  }
}