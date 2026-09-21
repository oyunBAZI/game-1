import type { Vec3Like } from "./types";

export class Vec3 implements Vec3Like {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static zero(): Vec3 {
    return new Vec3();
  }

  static one(value = 1): Vec3 {
    return new Vec3(value, value, value);
  }

  static from(value: Vec3Like): Vec3 {
    return new Vec3(value.x, value.y, value.z);
  }

  static fromArray(value: readonly number[]): Vec3 {
    return new Vec3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  setScalar(value: number): this {
    this.x = value;
    this.y = value;
    this.z = value;
    return this;
  }

  copy(value: Vec3Like): this {
    this.x = value.x;
    this.y = value.y;
    this.z = value.z;
    return this;
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(value: Vec3Like): this {
    this.x += value.x;
    this.y += value.y;
    this.z += value.z;
    return this;
  }

  addScaled(value: Vec3Like, scalar: number): this {
    this.x += value.x * scalar;
    this.y += value.y * scalar;
    this.z += value.z * scalar;
    return this;
  }

  addScalar(scalar: number): this {
    this.x += scalar;
    this.y += scalar;
    this.z += scalar;
    return this;
  }

  sub(value: Vec3Like): this {
    this.x -= value.x;
    this.y -= value.y;
    this.z -= value.z;
    return this;
  }

  subScaled(value: Vec3Like, scalar: number): this {
    this.x -= value.x * scalar;
    this.y -= value.y * scalar;
    this.z -= value.z * scalar;
    return this;
  }

  multiply(value: Vec3Like): this {
    this.x *= value.x;
    this.y *= value.y;
    this.z *= value.z;
    return this;
  }

  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  divideScalar(scalar: number): this {
    if (Math.abs(scalar) < Number.EPSILON) {
      return this.set(0, 0, 0);
    }
    return this.multiplyScalar(1 / scalar);
  }

  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  dot(value: Vec3Like): number {
    return this.x * value.x + this.y * value.y + this.z * value.z;
  }

  cross(value: Vec3Like): this {
    const x = this.y * value.z - this.z * value.y;
    const y = this.z * value.x - this.x * value.z;
    const z = this.x * value.y - this.y * value.x;
    return this.set(x, y, z);
  }

  crossVectors(a: Vec3Like, b: Vec3Like): this {
    return this.set(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  distanceToSquared(value: Vec3Like): number {
    const x = this.x - value.x;
    const y = this.y - value.y;
    const z = this.z - value.z;
    return x * x + y * y + z * z;
  }

  distanceTo(value: Vec3Like): number {
    return Math.sqrt(this.distanceToSquared(value));
  }

  normalize(): this {
    const length = this.length();
    return length > Number.EPSILON ? this.divideScalar(length) : this.set(0, 0, 0);
  }

  clampLength(min: number, max: number): this {
    const length = this.length();
    if (length < Number.EPSILON) return this;
    return this.multiplyScalar(Math.min(max, Math.max(min, length)) / length);
  }

  clampMagnitude(max: number): this {
    return this.clampLength(0, max);
  }

  lerp(target: Vec3Like, alpha: number): this {
    const t = Math.max(0, Math.min(1, alpha));
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    this.z += (target.z - this.z) * t;
    return this;
  }

  lerpUnclamped(target: Vec3Like, alpha: number): this {
    this.x += (target.x - this.x) * alpha;
    this.y += (target.y - this.y) * alpha;
    this.z += (target.z - this.z) * alpha;
    return this;
  }

  projectOnNormal(normal: Vec3Like): this {
    const n = new Vec3(normal.x, normal.y, normal.z).normalize();
    const scalar = this.dot(n);
    return this.copy(n).multiplyScalar(scalar);
  }

  projectOnPlane(normal: Vec3Like): this {
    const projection = new Vec3().copy(this).projectOnNormal(normal);
    return this.sub(projection);
  }

  reflect(normal: Vec3Like): this {
    const n = new Vec3(normal.x, normal.y, normal.z).normalize();
    return this.subScaled(n, 2 * this.dot(n));
  }

  angleTo(value: Vec3Like): number {
    const denominator = Math.sqrt(this.lengthSq() * (value.x * value.x + value.y * value.y + value.z * value.z));
    if (denominator < Number.EPSILON) return 0;
    return Math.acos(Math.max(-1, Math.min(1, this.dot(value) / denominator)));
  }

  isZero(epsilon = 1e-8): boolean {
    return this.lengthSq() <= epsilon * epsilon;
  }

  equals(value: Vec3Like, epsilon = 1e-8): boolean {
    return (
      Math.abs(this.x - value.x) <= epsilon &&
      Math.abs(this.y - value.y) <= epsilon &&
      Math.abs(this.z - value.z) <= epsilon
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  toJSON(): Vec3Like {
    return { x: this.x, y: this.y, z: this.z };
  }

  finite(): this {
    if (!Number.isFinite(this.x)) this.x = 0;
    if (!Number.isFinite(this.y)) this.y = 0;
    if (!Number.isFinite(this.z)) this.z = 0;
    return this;
  }

  rotateAroundAxis(axis: Vec3Like, radians: number): this {
    const unit = new Vec3(axis.x, axis.y, axis.z).normalize();
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const source = this.clone();
    const cross = new Vec3().crossVectors(unit, source);
    const dot = unit.dot(source);
    return this.set(
      source.x * cos + cross.x * sin + unit.x * dot * (1 - cos),
      source.y * cos + cross.y * sin + unit.y * dot * (1 - cos),
      source.z * cos + cross.z * sin + unit.z * dot * (1 - cos)
    );
  }

  withX(x: number): Vec3 {
    return new Vec3(x, this.y, this.z);
  }

  withY(y: number): Vec3 {
    return new Vec3(this.x, y, this.z);
  }

  withZ(z: number): Vec3 {
    return new Vec3(this.x, this.y, z);
  }
}