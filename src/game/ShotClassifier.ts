import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { ShotKind, Side } from "../core/types";
import type { BallState, PaddleState } from "../physics/State";

export interface ShotClassification {
  kind: ShotKind;
  side: Side;
  speed: number;
  spinRate: number;
  verticalAngle: number;
  horizontalAngle: number;
  contactQuality: number;
  offensive: boolean;
  defensive: boolean;
}

export function classifyShot(ball: BallState, paddle: PaddleState, side: Side): ShotClassification {
  const speed = ball.velocity.length();
  const spinRate = ball.angularVelocity.length();
  const verticalAngle = Math.atan2(ball.velocity.y, Math.max(0.001, Math.sqrt(ball.velocity.x ** 2 + ball.velocity.z ** 2)));
  const horizontalAngle = Math.atan2(ball.velocity.x, Math.max(0.001, Math.abs(ball.velocity.z)));
  const paddleSpeed = paddle.swingVelocity.length();
  const topComponent = ball.angularVelocity.x;
  const incomingNormal = Math.abs(ball.velocity.dot(paddle.normal));
  const contactQuality = clamp(1 - Math.abs(ball.position.x - paddle.position.x) / (paddle.faceWidth * 0.5), 0, 1);
  let kind: ShotKind = "drive";
  if (paddleSpeed > 7 || speed > 28) kind = "smash";
  else if (topComponent > 40 && speed > 12) kind = "loop";
  else if (ball.velocity.y < -2 && speed < 15) kind = "chop";
  else if (speed < 12 && ball.velocity.y > 0) kind = "push";
  else if (incomingNormal < 2) kind = "block";
  else if (speed < 8 && ball.position.y > 1.6) kind = "lob";
  const offensive = kind === "smash" || kind === "loop" || kind === "drive";
  const defensive = kind === "chop" || kind === "block" || kind === "push";
  return {
    kind,
    side,
    speed,
    spinRate,
    verticalAngle,
    horizontalAngle,
    contactQuality,
    offensive,
    defensive
  };
}

export function shotLabel(kind: ShotKind): string {
  return kind.replace("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function shotColor(kind: ShotKind): string {
  if (kind === "smash") return "#ff6e5c";
  if (kind === "loop") return "#ffb657";
  if (kind === "chop") return "#68a6ff";
  if (kind === "serve") return "#c5a6ff";
  return "#dce8ee";
}

export function spinName(spin: Vec3): string {
  const top = Math.abs(spin.x);
  const side = Math.abs(spin.y);
  const back = Math.abs(spin.z);
  if (top < 20 && side < 20 && back < 20) return "no spin";
  if (top > side * 1.5 && top > back * 1.5) return spin.x > 0 ? "topspin" : "backspin";
  if (side > top * 1.5 && side > back * 1.5) return "sidespin";
  return "mixed spin";
}