import { Vec3 } from "./Vec3";
import type { Vec3Like } from "./types";

export class Matrix3 {
  elements: number[];

  constructor(elements?: readonly number[]) {
    this.elements = elements ? [...elements] : [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  identity(): this {
    this.elements = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    return this;
  }

  set(
    n11: number, n12: number, n13: number,
    n21: number, n22: number, n23: number,
    n31: number, n32: number, n33: number
  ): this {
    this.elements = [n11, n21, n31, n12, n22, n32, n13, n23, n33];
    return this;
  }

  clone(): Matrix3 {
    return new Matrix3(this.elements);
  }

  multiply(matrix: Matrix3): this {
    const a = this.elements;
    const b = matrix.elements;
    return this.set(
      a[0] * b[0] + a[3] * b[1] + a[6] * b[2],
      a[0] * b[3] + a[3] * b[4] + a[6] * b[5],
      a[0] * b[6] + a[3] * b[7] + a[6] * b[8],
      a[1] * b[0] + a[4] * b[1] + a[7] * b[2],
      a[1] * b[3] + a[4] * b[4] + a[7] * b[5],
      a[1] * b[6] + a[4] * b[7] + a[7] * b[8],
      a[2] * b[0] + a[5] * b[1] + a[8] * b[2],
      a[2] * b[3] + a[5] * b[4] + a[8] * b[5],
      a[2] * b[6] + a[5] * b[7] + a[8] * b[8]
    );
  }

  determinant(): number {
    const [a, b, c, d, e, f, g, h, i] = this.elements;
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }

  transpose(): this {
    const [a, b, c, d, e, f, g, h, i] = this.elements;
    return this.set(a, d, g, b, e, h, c, f, i);
  }

  invert(): this {
    const determinant = this.determinant();
    if (Math.abs(determinant) < 1e-9) return this.identity();
    const [a, b, c, d, e, f, g, h, i] = this.elements;
    return this.set(
      (e * i - f * h) / determinant,
      (c * h - b * i) / determinant,
      (b * f - c * e) / determinant,
      (f * g - d * i) / determinant,
      (a * i - c * g) / determinant,
      (c * d - a * f) / determinant,
      (d * h - e * g) / determinant,
      (b * g - a * h) / determinant,
      (a * e - b * d) / determinant
    );
  }

  transform(value: Vec3Like): Vec3 {
    const e = this.elements;
    return new Vec3(
      e[0] * value.x + e[3] * value.y + e[6] * value.z,
      e[1] * value.x + e[4] * value.y + e[7] * value.z,
      e[2] * value.x + e[5] * value.y + e[8] * value.z
    );
  }

  static rotationX(radians: number): Matrix3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Matrix3().set(1, 0, 0, 0, c, -s, 0, s, c);
  }

  static rotationY(radians: number): Matrix3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Matrix3().set(c, 0, s, 0, 1, 0, -s, 0, c);
  }

  static rotationZ(radians: number): Matrix3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Matrix3().set(c, -s, 0, s, c, 0, 0, 0, 1);
  }
}