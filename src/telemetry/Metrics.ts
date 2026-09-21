import { average, median, standardDeviation } from "../core/MathUtils";

export interface MetricSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  latest: number;
}

export class MetricSeries {
  private values: number[] = [];

  constructor(readonly name: string, private readonly capacity = 1200) {}

  push(value: number): void {
    if (!Number.isFinite(value)) return;
    this.values.push(value);
    if (this.values.length > this.capacity) this.values.shift();
  }

  summary(): MetricSummary {
    if (!this.values.length) {
      return { count: 0, min: 0, max: 0, mean: 0, median: 0, standardDeviation: 0, latest: 0 };
    }
    return {
      count: this.values.length,
      min: Math.min(...this.values),
      max: Math.max(...this.values),
      mean: average(this.values),
      median: median(this.values),
      standardDeviation: standardDeviation(this.values),
      latest: this.values[this.values.length - 1]
    };
  }

  valuesCopy(): number[] {
    return [...this.values];
  }

  clear(): void {
    this.values.length = 0;
  }
}

export class MetricsRegistry {
  private series = new Map<string, MetricSeries>();

  get(name: string): MetricSeries {
    const existing = this.series.get(name);
    if (existing) return existing;
    const created = new MetricSeries(name);
    this.series.set(name, created);
    return created;
  }

  sample(name: string, value: number): void {
    this.get(name).push(value);
  }

  summary(): Record<string, MetricSummary> {
    const result: Record<string, MetricSummary> = {};
    for (const [name, series] of this.series) result[name] = series.summary();
    return result;
  }

  clear(): void {
    for (const series of this.series.values()) series.clear();
    this.series.clear();
  }
}