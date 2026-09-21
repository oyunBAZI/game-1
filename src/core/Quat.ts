import type { QuatLike, Vec3Like } from "./types";
import { Vec3 } from "./Vec3";

export class Quat implements QuatLike {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static identity(): Quat {
    return new Quat();
  }

  static fromAxisAngle(axis: Vec3Like, radians: number): Quat {
    const unit = Vec3.from(axis).normalize();
    const half = radians * 0.5;
    const sin = Math.sin(half);
    return new Quat(unit.x * sin, unit.y * sin, unit.z * sin, Math.cos(half));
  }

  copy(value: QuatLike): this {
    this.x = value.x;
    this.y = value.y;
    this.z = value.z;
    this.w = value.w;
    return this;
  }

  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  normalize(): this {
    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (length < Number.EPSILON) return this.set(0, 0, 0, 1);
    this.x /= length;
    this.y /= length;
    this.z /= length;
    this.w /= length;
    return this;
  }

  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  multiply(value: QuatLike): this {
    const ax = this.x;
    const ay = this.y;
    const az = this.z;
    const aw = this.w;
    this.x = aw * value.x + ax * value.w + ay * value.z - az * value.y;
    this.y = aw * value.y - ax * value.z + ay * value.w + az * value.x;
    this.z = aw * value.z + ax * value.y - ay * value.x + az * value.w;
    this.w = aw * value.w - ax * value.x - ay * value.y - az * value.z;
    return this;
  }

  multiplied(value: QuatLike): Quat {
    return this.clone().multiply(value);
  }

  conjugate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  inverse(): this {
    const lengthSq = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    if (lengthSq < Number.EPSILON) return this.set(0, 0, 0, 1);
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;
    return this.set(-x / lengthSq, -y / lengthSq, -z / lengthSq, w / lengthSq);
  }

  rotateVector(value: Vec3Like): Vec3 {
    const q = this.clone();
    const vector = new Quat(value.x, value.y, value.z, 0);
    const result = q.multiply(vector).multiply(q.clone().conjugate());
    return new Vec3(result.x, result.y, result.z);
  }

  slerp(target: QuatLike, alpha: number): this {
    let dot = this.x * target.x + this.y * target.y + this.z * target.z + this.w * target.w;
    const targetCopy = new Quat(target.x, target.y, target.z, target.w);
    if (dot < 0) {
      dot = -dot;
      targetCopy.x = -targetCopy.x;
      targetCopy.y = -targetCopy.y;
      targetCopy.z = -targetCopy.z;
      targetCopy.w = -targetCopy.w;
    }
    if (dot > 0.9995) {
      return this.set(
        this.x + alpha * (targetCopy.x - this.x),
        this.y + alpha * (targetCopy.y - this.y),
        this.z + alpha * (targetCopy.z - this.z),
        this.w + alpha * (targetCopy.w - this.w)
      ).normalize();
    }
    const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
    const sinTheta = Math.sin(theta);
    const a = Math.sin((1 - alpha) * theta) / sinTheta;
    const b = Math.sin(alpha * theta) / sinTheta;
    return this.set(
      this.x * a + targetCopy.x * b,
      this.y * a + targetCopy.y * b,
      this.z * a + targetCopy.z * b,
      this.w * a + targetCopy.w * b
    );
  }

  toJSON(): QuatLike {
    return { x: this.x, y: this.y, z: this.z, w: this.w };
  }
}