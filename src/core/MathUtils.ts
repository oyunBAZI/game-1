import { Vec3 } from "./Vec3";
import type { NumericRange, Vec3Like } from "./types";

export const EPSILON = 1e-8;
export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function saturate(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (Math.abs(b - a) < EPSILON) return 0;
  return (value - a) / (b - a);
}

export function remap(value: number, from: NumericRange, to: NumericRange): number {
  return lerp(to.min, to.max, inverseLerp(from.min, from.max, value));
}

export function smoothStep(edge0: number, edge1: number, value: number): number {
  const t = saturate(inverseLerp(edge0, edge1, value));
  return t * t * (3 - 2 * t);
}

export function smootherStep(edge0: number, edge1: number, value: number): number {
  const t = saturate(inverseLerp(edge0, edge1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function approach(current: number, target: number, delta: number): number {
  if (current < target) return Math.min(target, current + delta);
  return Math.max(target, current - delta);
}

export function moveTowards(current: Vec3, target: Vec3Like, maxDistance: number): Vec3 {
  const delta = Vec3.from(target).sub(current);
  const length = delta.length();
  return length <= maxDistance || length < EPSILON
    ? current.copy(target)
    : current.addScaled(delta, maxDistance / length);
}

export function damp(current: number, target: number, smoothing: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-Math.max(0, smoothing) * dt));
}

export function dampAngle(current: number, target: number, smoothing: number, dt: number): number {
  const difference = wrapAngle(target - current);
  return current + difference * (1 - Math.exp(-Math.max(0, smoothing) * dt));
}

export function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

export function wrapAngle(radians: number): number {
  const value = wrap(radians + Math.PI, TAU) - Math.PI;
  return value === -Math.PI ? Math.PI : value;
}

export function signOrZero(value: number, epsilon = EPSILON): number {
  if (value > epsilon) return 1;
  if (value < -epsilon) return -1;
  return 0;
}

export function nearlyEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function nearlyZero(value: number, epsilon = 1e-6): boolean {
  return Math.abs(value) <= epsilon;
}

export function safeDivide(a: number, b: number, fallback = 0): number {
  return Math.abs(b) < EPSILON ? fallback : a / b;
}

export function safeNormalize(value: Vec3Like, fallback = new Vec3(0, 1, 0)): Vec3 {
  const result = Vec3.from(value);
  return result.lengthSq() < EPSILON ? fallback.clone() : result.normalize();
}

export function exponentialDecay(value: number, decayPerSecond: number, dt: number): number {
  return value * Math.exp(-Math.max(0, decayPerSecond) * Math.max(0, dt));
}

export function vectorExponentialDecay(value: Vec3, decayPerSecond: number, dt: number): Vec3 {
  return value.multiplyScalar(Math.exp(-Math.max(0, decayPerSecond) * Math.max(0, dt)));
}

export function projectScalar(value: number, min: number, max: number): number {
  return clamp(inverseLerp(min, max, value), 0, 1);
}

export function quadraticBezier(a: Vec3Like, b: Vec3Like, c: Vec3Like, t: number): Vec3 {
  const u = 1 - t;
  return new Vec3(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    u * u * a.z + 2 * u * t * b.z + t * t * c.z
  );
}

export function cubicBezier(a: Vec3Like, b: Vec3Like, c: Vec3Like, d: Vec3Like, t: number): Vec3 {
  const u = 1 - t;
  return new Vec3(
    u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    u * u * u * a.z + 3 * u * u * t * b.z + 3 * u * t * t * c.z + t * t * t * d.z
  );
}

export function sphericalToCartesian(radius: number, azimuth: number, elevation: number): Vec3 {
  const cosElevation = Math.cos(elevation);
  return new Vec3(
    radius * cosElevation * Math.sin(azimuth),
    radius * Math.sin(elevation),
    radius * cosElevation * Math.cos(azimuth)
  );
}

export function deterministicHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function variance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
}

export function standardDeviation(values: readonly number[]): number {
  return Math.sqrt(variance(values));
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function weightedAverage(items: readonly { value: number; weight: number }[]): number {
  const denominator = items.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(denominator) < EPSILON) return 0;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / denominator;
}

export function factorial(value: number): number {
  if (value < 0 || !Number.isInteger(value)) return NaN;
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
}