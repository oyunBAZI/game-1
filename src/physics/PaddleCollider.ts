import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { CollisionContact } from "../core/types";
import { BALL, PADDLE } from "./constants";
import { sweptSpherePlane } from "./CollisionPrimitives";
import type { BallState, PaddleState } from "./State";

export class PaddleCollider {
  detect(ball: BallState, paddle: PaddleState): CollisionContact | null {
    if (!paddle.active) return null;
    const planePoint = paddle.position;
    const plane = sweptSpherePlane(ball.previousPosition, ball.position, BALL.radius, {
      point: planePoint,
      normal: paddle.normal,
      id: "paddle-" + paddle.side,
      kind: "paddle"
    });
    if (!plane.hit) return null;
    const local = plane.point.clone().sub(paddle.position);
    const width = PADDLE.faceWidth * 0.5 + PADDLE.collisionPadding;
    const height = PADDLE.faceHeight * 0.5 + PADDLE.collisionPadding;
    if (Math.abs(local.x) > width || Math.abs(local.y) > height) return null;
    return {
      kind: "paddle",
      timeOfImpact: plane.time,
      point: plane.point.toJSON(),
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