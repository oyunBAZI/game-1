import { Vector3 } from "three";

/** Fixed-length limb solution. Unreachable targets clamp to the arm's reach. */
export function solveTwoBone(
  root: Vector3, target: Vector3, pole: Vector3,
  upperLength: number, lowerLength: number,
  joint: Vector3, end: Vector3
): void {
  const axis = target.clone().sub(root);
  const distance = Math.max(Math.abs(upperLength - lowerLength) + 1e-5,
    Math.min(upperLength + lowerLength - 1e-5, axis.length()));
  if (axis.lengthSq() < 1e-12) axis.set(0, -1, 0);
  axis.normalize();
  end.copy(root).addScaledVector(axis, distance);
  const bend = pole.clone().sub(root);
  bend.addScaledVector(axis, -bend.dot(axis));
  if (bend.lengthSq() < 1e-10) {
    bend.set(Math.abs(axis.y) < 0.9 ? 0 : 1, Math.abs(axis.y) < 0.9 ? 1 : 0, 0);
    bend.addScaledVector(axis, -bend.dot(axis));
  }
  bend.normalize();
  const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  joint.copy(root).addScaledVector(axis, along).addScaledVector(bend, height);
}
