import * as THREE from "three";

/** Fixed-length limb solution. Unreachable targets are clamped without stretching. */
export function solveTwoBone(
  root: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3,
  upperLength: number, lowerLength: number
): { joint: THREE.Vector3; end: THREE.Vector3 } {
  const direction = target.clone().sub(root);
  const distance = THREE.MathUtils.clamp(direction.length(),
    Math.abs(upperLength - lowerLength) + 1e-5, upperLength + lowerLength - 1e-5);
  if (direction.lengthSq() < 1e-10) direction.set(0, -1, 0);
  direction.normalize();
  const bend = pole.clone().sub(root);
  bend.addScaledVector(direction, -bend.dot(direction));
  if (bend.lengthSq() < 1e-10) {
    bend.set(Math.abs(direction.y) < 0.9 ? 0 : 1, Math.abs(direction.y) < 0.9 ? 1 : 0, 0);
    bend.addScaledVector(direction, -bend.dot(direction));
  }
  bend.normalize();
  const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  return {
    joint: root.clone().addScaledVector(direction, along).addScaledVector(bend, height),
    end: root.clone().addScaledVector(direction, distance)
  };
}
