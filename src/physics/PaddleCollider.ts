import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { CollisionContact } from "../core/types";
import { BALL, PADDLE } from "./constants";
import { sweptSpherePlane } from "./CollisionPrimitives";
import type { BallState, PaddleState } from "./State";

export class PaddleCollider {
  detect(ball: BallState, paddle: PaddleState, startFraction = 0): CollisionContact | null {
    if (!paddle.active) return null;
    // Sweep in the moving blade's frame. Testing against only its final position
    // misses fast strokes and produces contacts on the wrong side of the rubber.
    const paddleStart = paddle.previousPosition.clone().lerp(paddle.position, startFraction);
    const start = ball.previousPosition.clone().sub(paddleStart);
    const end = ball.position.clone().sub(paddle.position);
    const motion = end.clone().sub(start);
    if (motion.lengthSq() < 1e-12) return null;
    const normal = paddle.normal.clone().normalize();
    if (motion.dot(normal) > 0) normal.negate();
    if (start.dot(normal) < ball.radius - 0.002) return null;
    const plane = sweptSpherePlane(start, end, ball.radius, {
      point: new Vec3(),
      normal,
      id: "paddle-" + paddle.side,
      kind: "paddle"
    });
    if (!plane.hit) return null;
    const right = new Vec3(normal.z, 0, -normal.x).normalize();
    const up = new Vec3().crossVectors(normal, right).normalize();
    const width = PADDLE.faceWidth * 0.5 + PADDLE.collisionPadding;
    const height = PADDLE.faceHeight * 0.5 + PADDLE.collisionPadding;
    if (Math.abs(plane.point.dot(right)) > width || Math.abs(plane.point.dot(up)) > height) return null;
    const paddleAtImpact = paddleStart.lerp(paddle.position, plane.time);
    return {
      kind: "paddle",
      timeOfImpact: plane.time,
      point: plane.point.add(paddleAtImpact).toJSON(),
      normal: plane.normal.toJSON(),
      penetration: plane.penetration,
      relativeSpeed: ball.velocity.clone().sub(paddle.velocity).length(),
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
    paddle.normal.copy(targetNormal).normalize();
    paddle.position.x = clamp(paddle.position.x, -0.95, 0.95);
    paddle.position.y = clamp(paddle.position.y, 0.42, 1.8);
    const sideSign = paddle.side === "home" ? 1 : -1;
    paddle.position.z = clamp(paddle.position.z, sideSign > 0 ? 0.12 : -1.82, sideSign > 0 ? 1.82 : -0.12);
  }
}
