import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { CollisionContact, ContactKind, Vec3Like } from "../core/types";

export interface Plane {
  point: Vec3;
  normal: Vec3;
  id: string;
  kind: ContactKind;
}

export interface Aabb {
  min: Vec3;
  max: Vec3;
  id: string;
  kind: ContactKind;
}

export interface Sphere {
  center: Vec3;
  radius: number;
}

export interface SegmentSweep {
  hit: boolean;
  time: number;
  point: Vec3;
  normal: Vec3;
  penetration: number;
}

export function pointInAabb(point: Vec3Like, box: Aabb, padding = 0): boolean {
  return (
    point.x >= box.min.x - padding &&
    point.x <= box.max.x + padding &&
    point.y >= box.min.y - padding &&
    point.y <= box.max.y + padding &&
    point.z >= box.min.z - padding &&
    point.z <= box.max.z + padding
  );
}

export function closestPointOnAabb(point: Vec3Like, box: Aabb): Vec3 {
  return new Vec3(
    clamp(point.x, box.min.x, box.max.x),
    clamp(point.y, box.min.y, box.max.y),
    clamp(point.z, box.min.z, box.max.z)
  );
}

export function distanceSquaredPointAabb(point: Vec3Like, box: Aabb): number {
  return closestPointOnAabb(point, box).distanceToSquared(point);
}

export function sphereAabbOverlap(sphere: Sphere, box: Aabb): SegmentSweep {
  const closest = closestPointOnAabb(sphere.center, box);
  const delta = sphere.center.clone().sub(closest);
  const distance = delta.length();
  if (distance > sphere.radius) {
    return { hit: false, time: 1, point: closest, normal: new Vec3(), penetration: 0 };
  }
  const normal = distance > 1e-7 ? delta.divideScalar(distance) : new Vec3(0, 1, 0);
  return {
    hit: true,
    time: 0,
    point: closest,
    normal,
    penetration: sphere.radius - distance
  };
}

export function sweptSpherePlane(
  start: Vec3Like,
  end: Vec3Like,
  radius: number,
  plane: Plane
): SegmentSweep {
  const startDistance = Vec3.from(start).sub(plane.point).dot(plane.normal);
  const endDistance = Vec3.from(end).sub(plane.point).dot(plane.normal);
  const startOutside = startDistance >= radius;
  const endInside = endDistance < radius;
  if (!startOutside && endInside) {
    const penetration = radius - endDistance;
    return {
      hit: true,
      time: 0,
      point: Vec3.from(end).subScaled(plane.normal, endDistance),
      normal: plane.normal.clone(),
      penetration
    };
  }
  if (!startOutside || !endInside) {
    return { hit: false, time: 1, point: Vec3.from(end), normal: new Vec3(), penetration: 0 };
  }
  const denominator = startDistance - endDistance;
  if (Math.abs(denominator) < 1e-8) {
    return { hit: false, time: 1, point: Vec3.from(end), normal: new Vec3(), penetration: 0 };
  }
  const time = clamp((startDistance - radius) / denominator, 0, 1);
  const point = Vec3.from(start).lerp(end, time).subScaled(plane.normal, radius);
  return { hit: true, time, point, normal: plane.normal.clone(), penetration: 0 };
}

export function sweptSphereAabb(
  start: Vec3Like,
  end: Vec3Like,
  radius: number,
  box: Aabb
): SegmentSweep {
  const expanded: Aabb = {
    min: box.min.clone().addScalar(-radius),
    max: box.max.clone().addScalar(radius),
    id: box.id,
    kind: box.kind
  };
  const direction = Vec3.from(end).sub(start);
  let tMin = 0;
  let tMax = 1;
  let hitAxis: "x" | "y" | "z" = "x";
  let hitSign = 1;
  for (const axis of ["x", "y", "z"] as const) {
    const origin = start[axis];
    const delta = direction[axis];
    const min = expanded.min[axis];
    const max = expanded.max[axis];
    if (Math.abs(delta) < 1e-8) {
      if (origin < min || origin > max) {
        return { hit: false, time: 1, point: Vec3.from(end), normal: new Vec3(), penetration: 0 };
      }
      continue;
    }
    let near = (min - origin) / delta;
    let far = (max - origin) / delta;
    let sign = -1;
    if (near > far) {
      [near, far] = [far, near];
      sign = 1;
    }
    if (near > tMin) {
      tMin = near;
      hitAxis = axis;
      hitSign = sign;
    }
    tMax = Math.min(tMax, far);
    if (tMin > tMax) {
      return { hit: false, time: 1, point: Vec3.from(end), normal: new Vec3(), penetration: 0 };
    }
  }
  if (tMin < 0 || tMin > 1) {
    const overlap = sphereAabbOverlap({ center: Vec3.from(end), radius }, box);
    return overlap;
  }
  const point = Vec3.from(start).addScaled(direction, tMin);
  const normal = new Vec3();
  normal[hitAxis] = hitSign;
  return { hit: true, time: tMin, point, normal, penetration: 0 };
}

export function makeContact(
  kind: ContactKind,
  sweep: SegmentSweep,
  surfaceId: string,
  relativeSpeed: number
): CollisionContact | null {
  if (!sweep.hit) return null;
  return {
    kind,
    timeOfImpact: sweep.time,
    point: sweep.point.toJSON(),
    normal: sweep.normal.toJSON(),
    penetration: sweep.penetration,
    relativeSpeed,
    surfaceId
  };
}

export function reflectVelocity(velocity: Vec3, normal: Vec3, restitution: number): Vec3 {
  const normalSpeed = velocity.dot(normal);
  if (normalSpeed >= 0) return velocity;
  return velocity.subScaled(normal, (1 + restitution) * normalSpeed);
}

export function tangentVelocity(velocity: Vec3, normal: Vec3): Vec3 {
  return velocity.clone().sub(new Vec3().copy(normal).multiplyScalar(velocity.dot(normal)));
}