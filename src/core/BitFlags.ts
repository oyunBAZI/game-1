export class BitFlags {
  private value = 0;

  constructor(initial = 0) {
    this.value = initial >>> 0;
  }

  set(mask: number, enabled = true): this {
    if (enabled) this.value |= mask;
    else this.value &= ~mask;
    this.value >>>= 0;
    return this;
  }

  has(mask: number): boolean {
    return (this.value & mask) === mask;
  }

  toggle(mask: number): this {
    this.value ^= mask;
    this.value >>>= 0;
    return this;
  }

  clear(): this {
    this.value = 0;
    return this;
  }

  raw(): number {
    return this.value >>> 0;
  }

  clone(): BitFlags {
    return new BitFlags(this.value);
  }

  toArray(maxBits = 32): number[] {
    const result: number[] = [];
    for (let bit = 0; bit < maxBits; bit += 1) {
      const mask = 1 << bit;
      if (this.has(mask)) result.push(bit);
    }
    return result;
  }
}

export const FLAGS = {
  PLAYER: 1 << 0,
  BALL: 1 << 1,
  PADDLE: 1 << 2,
  TABLE: 1 << 3,
  NET: 1 << 4,
  STATIC: 1 << 5,
  DEBUG: 1 << 6,
  REPLAY: 1 << 7
} as const;