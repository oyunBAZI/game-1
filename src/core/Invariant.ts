export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function finiteRecord(record: Record<string, number>): boolean {
  return Object.values(record).every((value) => Number.isFinite(value));
}

export function assertFiniteVector(vector: { x: number; y: number; z: number }, label = "vector"): void {
  invariant(Number.isFinite(vector.x), label + ".x is not finite");
  invariant(Number.isFinite(vector.y), label + ".y is not finite");
  invariant(Number.isFinite(vector.z), label + ".z is not finite");
}

export function assertRange(value: number, min: number, max: number, label: string): void {
  invariant(value >= min && value <= max, label + " outside range");
}

export function assertUnitVector(vector: { x: number; y: number; z: number }, label = "vector"): void {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  invariant(Math.abs(length - 1) < 0.0001, label + " is not normalized");
}

export function assertPositive(value: number, label: string): void {
  invariant(value > 0, label + " must be positive");
}

export function assertNonNegative(value: number, label: string): void {
  invariant(value >= 0, label + " must be non-negative");
}

export function assertSameLength<T, U>(a: readonly T[], b: readonly U[], label: string): void {
  invariant(a.length === b.length, label + " lengths differ");
}

export function requireValue<T>(value: T | null | undefined, label: string): T {
  invariant(value !== null && value !== undefined, label + " is missing");
  return value;
}

export function guardFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(label + " became non-finite");
  return value;
}