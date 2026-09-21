export class Random {
  private state: number;

  constructor(seed = 0xdecafbad) {
    this.state = seed >>> 0;
  }

  get seed(): number {
    return this.state >>> 0;
  }

  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  next(): number {
    let state = this.state;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.state = state >>> 0;
    return (this.state >>> 0) / 4294967296;
  }

  signed(): number {
    return this.next() * 2 - 1;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error("Cannot pick from an empty array");
    return values[this.int(0, values.length - 1)];
  }

  weighted<T>(values: ReadonlyArray<{ value: T; weight: number }>): T {
    const total = values.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    if (total <= 0) return this.pick(values.map((item) => item.value));
    let cursor = this.next() * total;
    for (const item of values) {
      cursor -= Math.max(0, item.weight);
      if (cursor <= 0) return item.value;
    }
    return values[values.length - 1].value;
  }

  fork(salt: number): Random {
    return new Random((this.state ^ (salt >>> 0)) >>> 0);
  }
}
