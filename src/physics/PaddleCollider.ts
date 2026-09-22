import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { CollisionContact } from "../core/types";
import { BALL, PADDLE } from "./constants";
import { sweptSpherePlane } from "./CollisionPrimitives";
import type { BallState, PaddleState } from "./State";

export class PaddleCollider {
  detect(ball: BallState, paddle: PaddleState, startTime = 0, endTime = 1): CollisionContact | null {
    if (!paddle.active) return null;
    // Sweep in the racket's moving frame. A stationary ball can be struck by a
    // moving blade, and a tilted blade needs its own local face coordinates.
    const startPaddle = paddle.previousPosition.clone().lerp(paddle.position, startTime);
    const endPaddle = paddle.previousPosition.clone().lerp(paddle.position, endTime);
    const relativeStart = ball.previousPosition.clone().sub(startPaddle);
    const relativeEnd = ball.position.clone().sub(endPaddle);
    const normal = paddle.normal.clone().normalize();
    if (relativeEnd.clone().sub(relativeStart).dot(normal) >= -1e-8) return null;
    const plane = sweptSpherePlane(relativeStart, relativeEnd, ball.radius, {
      point: new Vec3(),
      normal,
      id: "paddle-" + paddle.side,
      kind: "paddle"
    });
    if (!plane.hit) return null;
    const right = new Vec3(1, 0, 0).projectOnPlane(normal);
    if (right.lengthSq() < 1e-8) right.set(0, 0, 1).projectOnPlane(normal);
    right.normalize();
    const up = new Vec3().crossVectors(right, normal).normalize();
    const local = plane.point;
    const width = PADDLE.faceWidth * 0.5 + PADDLE.collisionPadding;
    const height = PADDLE.faceHeight * 0.5 + PADDLE.collisionPadding;
    if ((local.dot(right) / width) ** 2 + (local.dot(up) / height) ** 2 > 1) return null;
    const point = local.clone().add(startPaddle.lerp(endPaddle, plane.time));
    return {
      kind: "paddle",
      timeOfImpact: plane.time,
      point: point.toJSON(),
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
