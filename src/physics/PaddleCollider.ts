import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { CollisionContact } from "../core/types";
import { PADDLE } from "./constants";
import type { BallState, PaddleState } from "./State";

export class PaddleCollider {
  detect(ball: BallState, paddle: PaddleState, startTime = 0, endTime = 1): CollisionContact | null {
    if (!paddle.active) return null;
    // Sample the signed distance to the *moving and rotating* face, then
    // bisect its first crossing. A sweep against only the final normal misses
    // genuine brush contacts and can invent hits while the racket opens.
    const center = new Vec3();
    const racket = new Vec3();
    const normal = new Vec3();
    const relative = new Vec3();
    const sample = (fraction: number): number => {
      const time = startTime + (endTime - startTime) * fraction;
      center.copy(ball.previousPosition).lerp(ball.position, fraction);
      racket.copy(paddle.previousPosition).lerp(paddle.position, time);
      normal.copy(paddle.previousNormal).lerp(paddle.normal, time).normalize();
      relative.copy(center).sub(racket);
      return relative.dot(normal) - ball.radius;
    };
    let previous = sample(0);
    // A ball already behind the blade cannot hit its playable front face.
    if (previous < -ball.radius - 0.001) return null;
    let timeOfImpact = -1;
    const samples = 8;
    for (let index = 1; index <= samples; index += 1) {
      const fraction = index / samples;
      const distance = sample(fraction);
      if (previous >= -1e-6 && distance <= 0 && distance < previous - 1e-8) {
        let low = (index - 1) / samples;
        let high = fraction;
        for (let iteration = 0; iteration < 16; iteration += 1) {
          const middle = (low + high) / 2;
          if (sample(middle) > 0) low = middle;
          else high = middle;
        }
        timeOfImpact = previous <= 0 && index === 1 ? 0 : high;
        break;
      }
      previous = distance;
    }
    if (timeOfImpact < 0) return null;
    const globalTime = startTime + (endTime - startTime) * timeOfImpact;
    const signedDistance = sample(timeOfImpact);
    const relativeVelocity = ball.velocity.clone().sub(paddle.velocityAt(center, globalTime));
    if (relativeVelocity.dot(normal) >= -1e-6) return null;
    const right = new Vec3(1, 0, 0).projectOnPlane(normal);
    if (right.lengthSq() < 1e-8) right.set(0, 0, 1).projectOnPlane(normal);
    right.normalize();
    const up = new Vec3().crossVectors(right, normal).normalize();
    const local = relative.addScaled(normal, -relative.dot(normal));
    const width = PADDLE.faceWidth * 0.5 + PADDLE.collisionPadding;
    const height = PADDLE.faceHeight * 0.5 + PADDLE.collisionPadding;
    if ((local.dot(right) / width) ** 2 + (local.dot(up) / height) ** 2 > 1) return null;
    const point = racket.clone().add(local);
    return {
      kind: "paddle",
      timeOfImpact,
      point: point.toJSON(),
      normal: normal.toJSON(),
      penetration: Math.max(0, -signedDistance),
      relativeSpeed: -relativeVelocity.dot(normal),
      surfaceId: "paddle-" + paddle.side,
      side: paddle.side
    };
  }

  placeForInput(
    paddle: PaddleState,
    target: Vec3,
    targetNormal: Vec3,
    dt: number,
    maxSpeed = 8
  ): void {
    const delta = Vec3.from(target).sub(paddle.position);
    const maxDistance = maxSpeed * dt;
    if (delta.length() > maxDistance) delta.clampLength(0, maxDistance);
    paddle.position.add(delta);
    const desired = Vec3.from(targetNormal).normalize();
    if (desired.isZero()) desired.copy(paddle.normal);
    const angle = Math.acos(clamp(paddle.normal.dot(desired), -1, 1));
    const maxTurn = 24 * dt;
    if (angle > maxTurn && angle < Math.PI - 1e-4) {
      const fraction = maxTurn / angle;
      const divisor = Math.sin(angle);
      paddle.normal.multiplyScalar(Math.sin((1 - fraction) * angle) / divisor)
        .addScaled(desired, Math.sin(fraction * angle) / divisor).normalize();
    } else if (angle > maxTurn) {
      // Near 180 degrees, slerp's denominator vanishes. Choose a stable
      // perpendicular axis so even a reversal progresses at the same rate.
      const previous = paddle.normal.clone();
      const axis = new Vec3(0, 1, 0).cross(previous).normalize();
      if (axis.isZero()) axis.set(1, 0, 0).cross(previous).normalize();
      paddle.normal.multiplyScalar(Math.cos(maxTurn))
        .addScaled(new Vec3().crossVectors(axis, previous), Math.sin(maxTurn)).normalize();
    } else paddle.normal.copy(desired);
    paddle.position.x = clamp(paddle.position.x, -0.95, 0.95);
    paddle.position.y = clamp(paddle.position.y, 0.42, 1.8);
    const sideSign = paddle.side === "home" ? 1 : -1;
    paddle.position.z = clamp(paddle.position.z, sideSign > 0 ? 0.12 : -1.82, sideSign > 0 ? 1.82 : -0.12);
  }
}
