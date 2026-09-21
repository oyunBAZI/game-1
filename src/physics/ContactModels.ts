import { Vec3 } from "../core/Vec3";
import { clamp } from "../core/MathUtils";
import type { RubberProfile, TableProfile } from "../core/types";
import { BALL } from "./constants";
import type { BallState, PaddleState } from "./State";

export interface ContactResponse {
  velocityBefore: Vec3;
  velocityAfter: Vec3;
  spinBefore: Vec3;
  spinAfter: Vec3;
  energyBefore: number;
  energyAfter: number;
  impulse: Vec3;
  slip: number;
}

function kineticEnergy(ball: BallState): number {
  const linear = 0.5 * ball.mass * ball.velocity.lengthSq();
  const angular = 0.5 * BALL.inertia * ball.angularVelocity.lengthSq();
  return linear + angular;
}

export function resolveTableBounce(
  ball: BallState,
  normal: Vec3,
  table: TableProfile
): ContactResponse {
  const before = ball.velocity.clone();
  const spinBefore = ball.angularVelocity.clone();
  const energyBefore = kineticEnergy(ball);
  const normalSpeed = ball.velocity.dot(normal);
  if (normalSpeed < 0) ball.velocity.subScaled(normal, (1 + table.restitution) * normalSpeed);
  const tangent = ball.velocity.clone().projectOnPlane(normal);
  const spinSurface = new Vec3().crossVectors(ball.angularVelocity, normal).multiplyScalar(BALL.radius);
  const relativeTangent = tangent.add(spinSurface);
  const frictionImpulse = relativeTangent.multiplyScalar(-clamp(table.friction, 0, 1) * ball.mass);
  ball.velocity.addScaled(frictionImpulse, 1 / ball.mass);
  const spinDelta = new Vec3().crossVectors(normal, frictionImpulse).multiplyScalar(1 / Math.max(BALL.inertia, 1e-8));
  ball.angularVelocity.add(spinDelta).clampMagnitude(1600);
  ball.velocity.clampMagnitude(55);
  const energyAfter = kineticEnergy(ball);
  return {
    velocityBefore: before,
    velocityAfter: ball.velocity.clone(),
    spinBefore,
    spinAfter: ball.angularVelocity.clone(),
    energyBefore,
    energyAfter,
    impulse: ball.velocity.clone().sub(before).multiplyScalar(ball.mass),
    slip: relativeTangent.length()
  };
}

export function resolvePaddleContact(
  ball: BallState,
  paddle: PaddleState,
  rubber: RubberProfile,
  desiredSpin: Vec3
): ContactResponse {
  const before = ball.velocity.clone();
  const spinBefore = ball.angularVelocity.clone();
  const energyBefore = kineticEnergy(ball);
  const contactNormal = paddle.normal.clone().normalize();
  const paddleVelocity = paddle.velocityAt(ball.position);
  const relative = ball.velocity.clone().sub(paddleVelocity);
  const approach = relative.dot(contactNormal);
  if (approach > 0) {
    return {
      velocityBefore: before,
      velocityAfter: before.clone(),
      spinBefore,
      spinAfter: spinBefore.clone(),
      energyBefore,
      energyAfter: energyBefore,
      impulse: new Vec3(),
      slip: 0
    };
  }
  const normalImpulse = -(1 + rubber.restitution) * approach * ball.mass;
  ball.velocity.addScaled(contactNormal, normalImpulse / ball.mass);
  const tangential = relative.projectOnPlane(contactNormal);
  const desired = desiredSpin.clone().clampMagnitude(1000);
  const grip = clamp(rubber.friction * rubber.spinTransfer, 0, 1.5);
  const tangentialCorrection = tangential.multiplyScalar(-grip * 0.62);
  ball.velocity.addScaled(tangentialCorrection, 1);
  const contactTorque = new Vec3().crossVectors(contactNormal, tangentialCorrection).multiplyScalar(
    rubber.spinTransfer / Math.max(BALL.inertia, 1e-8)
  );
  ball.angularVelocity.add(contactTorque).addScaled(desired, 0.35);
  ball.velocity.addScaled(paddle.swingVelocity, rubber.restitution * 0.18);
  ball.velocity.clampMagnitude(55);
  ball.angularVelocity.clampMagnitude(1600);
  const energyAfter = kineticEnergy(ball);
  return {
    velocityBefore: before,
    velocityAfter: ball.velocity.clone(),
    spinBefore,
    spinAfter: ball.angularVelocity.clone(),
    energyBefore,
    energyAfter,
    impulse: ball.velocity.clone().sub(before).multiplyScalar(ball.mass),
    slip: tangential.length()
  };
}

export function resolveNetContact(ball: BallState, normal: Vec3, restitution: number): ContactResponse {
  const before = ball.velocity.clone();
  const spinBefore = ball.angularVelocity.clone();
  const energyBefore = kineticEnergy(ball);
  const normalSpeed = ball.velocity.dot(normal);
  if (normalSpeed < 0) ball.velocity.subScaled(normal, (1 + restitution) * normalSpeed);
  ball.velocity.multiplyScalar(0.78);
  ball.angularVelocity.multiplyScalar(0.7);
  const energyAfter = kineticEnergy(ball);
  return {
    velocityBefore: before,
    velocityAfter: ball.velocity.clone(),
    spinBefore,
    spinAfter: ball.angularVelocity.clone(),
    energyBefore,
    energyAfter,
    impulse: ball.velocity.clone().sub(before).multiplyScalar(ball.mass),
    slip: 0
  };
}

export function dampAfterMiss(ball: BallState, dt: number): void {
  const damping = Math.exp(-1.8 * dt);
  ball.velocity.multiplyScalar(damping);
  ball.angularVelocity.multiplyScalar(Math.exp(-0.8 * dt));
}