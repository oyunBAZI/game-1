import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";

export interface SweptCircleHit {
  hit: boolean;
  time: number;
  point: Vec3;
  normal: Vec3;
  distance: number;
}

export interface SweptSphereHit {
  hit: boolean;
  time: number;
  point: Vec3;
  normal: Vec3;
  distance: number;
  feature: "face" | "edge" | "vertex";
}

export class ContinuousCollision {
  sphereAgainstPlane(start: Vec3, end: Vec3, radius: number, planePoint: Vec3, planeNormal: Vec3): SweptSphereHit {
    const normal = planeNormal.clone().normalize();
    const startDistance = start.clone().sub(planePoint).dot(normal);
    const endDistance = end.clone().sub(planePoint).dot(normal);
    if (startDistance < radius && endDistance < radius) {
      return {
        hit: true,
        time: 0,
        point: end.clone().subScaled(normal, endDistance),
        normal,
        distance: endDistance,
        feature: "face"
      };
    }
    if (startDistance >= radius && endDistance >= radius) {
      return { hit: false, time: 1, point: end.clone(), normal: new Vec3(), distance: endDistance, feature: "face" };
    }
    const denominator = startDistance - endDistance;
    const time = clamp((startDistance - radius) / Math.max(1e-9, denominator), 0, 1);
    const point = start.clone().lerp(end, time).subScaled(normal, radius);
    return { hit: true, time, point, normal, distance: radius, feature: "face" };
  }

  sphereAgainstSegment(start: Vec3, end: Vec3, radius: number, segmentA: Vec3, segmentB: Vec3): SweptSphereHit {
    const movement = end.clone().sub(start);
    const segment = segmentB.clone().sub(segmentA);
    const relative = start.clone().sub(segmentA);
    const denominator = movement.lengthSq();
    const time = denominator < 1e-9 ? 0 : clamp(-relative.dot(movement) / denominator, 0, 1);
    const closest = start.clone().addScaled(movement, time);
    const segmentT = clamp(closest.clone().sub(segmentA).dot(segment) / Math.max(1e-9, segment.lengthSq()), 0, 1);
    const onSegment = segmentA.clone().addScaled(segment, segmentT);
    const offset = closest.clone().sub(onSegment);
    const distance = offset.length();
    if (distance > radius) {
      return { hit: false, time: 1, point: end.clone(), normal: new Vec3(), distance, feature: "edge" };
    }
    const normal = distance > 1e-9 ? offset.divideScalar(distance) : new Vec3(0, 1, 0);
    return {
      hit: true,
      time,
      point: onSegment.clone().addScaled(normal, radius),
      normal,
      distance,
      feature: segmentT > 0.01 && segmentT < 0.99 ? "edge" : "vertex"
    };
  }

  movingSphereAgainstMovingSphere(
    aStart: Vec3,
    aEnd: Vec3,
    aRadius: number,
    bStart: Vec3,
    bEnd: Vec3,
    bRadius: number
  ): SweptSphereHit {
    const relativeStart = aStart.clone().sub(bStart);
    const relativeMovement = aEnd.clone().sub(aStart).sub(bEnd.clone().sub(bStart));
    const radius = aRadius + bRadius;
    const a = relativeMovement.lengthSq();
    const b = 2 * relativeStart.dot(relativeMovement);
    const c = relativeStart.lengthSq() - radius * radius;
    if (c <= 0) {
      return {
        hit: true,
        time: 0,
        point: aStart.clone().lerp(aEnd, 0.5),
        normal: relativeStart.normalize(),
        distance: Math.sqrt(Math.max(0, relativeStart.lengthSq())),
        feature: "vertex"
      };
    }
    const discriminant = b * b - 4 * a * c;
    if (a < 1e-9 || discriminant < 0) {
      return { hit: false, time: 1, point: aEnd.clone(), normal: new Vec3(), distance: Math.sqrt(c), feature: "vertex" };
    }
    const root = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (root < 0 || root > 1) {
      return { hit: false, time: 1, point: aEnd.clone(), normal: new Vec3(), distance: Math.sqrt(c), feature: "vertex" };
    }
    const aPoint = aStart.clone().lerp(aEnd, root);
    const bPoint = bStart.clone().lerp(bEnd, root);
    const normal = aPoint.clone().sub(bPoint).normalize();
    return { hit: true, time: root, point: aPoint, normal, distance: radius, feature: "vertex" };
  }

  conservativeAdvance(start: Vec3, velocity: Vec3, radius: number, distanceToSurface: (position: Vec3) => number, dt: number): number {
    let time = 0;
    let position = start.clone();
    for (let iteration = 0; iteration < 8 && time < dt; iteration += 1) {
      const distance = distanceToSurface(position) - radius;
      if (distance <= 0) return time;
      const speed = Math.max(0.001, velocity.length());
      const advance = Math.min(dt - time, Math.max(0.00001, distance / speed * 0.8));
      time += advance;
      position = start.clone().addScaled(velocity, time);
    }
    return dt;
  }
}