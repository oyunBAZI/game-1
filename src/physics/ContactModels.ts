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
  if (normalSpeed >= 0) return {
    velocityBefore: before, velocityAfter: before.clone(), spinBefore,
    spinAfter: spinBefore.clone(), energyBefore, energyAfter: energyBefore,
    impulse: new Vec3(), slip: 0
  };
  const normalImpulse = -(1 + table.restitution) * normalSpeed * ball.mass;
  ball.velocity.addScaled(normal, normalImpulse / ball.mass);
  const arm = normal.clone().multiplyScalar(-BALL.radius);
  const relativeTangent = ball.velocity.clone().add(new Vec3().crossVectors(ball.angularVelocity, arm)).projectOnPlane(normal);
  const slip = relativeTangent.length();
  const effectiveMass = 1 / (1 / ball.mass + BALL.radius * BALL.radius / BALL.inertia);
  const frictionImpulse = relativeTangent.multiplyScalar(-Math.min(
    effectiveMass,
    slip > 1e-8 ? table.friction * normalImpulse / slip : 0
  ));
  ball.velocity.addScaled(frictionImpulse, 1 / ball.mass);
  const spinDelta = new Vec3().crossVectors(arm, frictionImpulse).multiplyScalar(1 / BALL.inertia);
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
    slip
  };
}

export function resolvePaddleContact(
  ball: BallState,
  paddle: PaddleState,
  rubber: RubberProfile,
  desiredSpin: Vec3,
  contactNormal = paddle.normal,
  contactTime = 1
): ContactResponse {
  const before = ball.velocity.clone();
  const spinBefore = ball.angularVelocity.clone();
  const energyBefore = kineticEnergy(ball);
  const normal = contactNormal.clone().normalize();
  const paddleVelocity = paddle.velocityAt(ball.position, contactTime);
  const relative = ball.velocity.clone().sub(paddleVelocity);
  const approach = relative.dot(normal);
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
  ball.velocity.addScaled(normal, normalImpulse / ball.mass);
  const arm = normal.clone().multiplyScalar(-ball.radius);
  // Spin control represents brushing the rubber tangentially across the ball.
  // Its effect is bounded by the rubber's friction impulse; it cannot simply
  // add angular momentum to a ball without a contact force.
  const brushVelocity = new Vec3().crossVectors(desiredSpin, arm).projectOnPlane(normal).clampMagnitude(4);
  const tangential = relative.clone().add(new Vec3().crossVectors(ball.angularVelocity, arm))
    .sub(brushVelocity).projectOnPlane(normal);
  const slip = tangential.length();
  const grip = clamp(rubber.friction * rubber.spinTransfer, 0, 1.5);
  const effectiveMass = 1 / (1 / ball.mass + ball.radius * ball.radius / BALL.inertia);
  const tangentImpulse = tangential.multiplyScalar(-Math.min(
    effectiveMass * rubber.spinTransfer,
    slip > 1e-8 ? grip * normalImpulse / slip : 0
  ));
  ball.velocity.addScaled(tangentImpulse, 1 / ball.mass);
  const contactTorque = new Vec3().crossVectors(arm, tangentImpulse).multiplyScalar(1 / BALL.inertia);
  ball.angularVelocity.add(contactTorque);
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
    slip
  };
}

export function resolveNetContact(ball: BallState, normal: Vec3, restitution: number,
  surfaceVelocity = new Vec3()): ContactResponse {
  const before = ball.velocity.clone();
  const spinBefore = ball.angularVelocity.clone();
  const energyBefore = kineticEnergy(ball);
  const normalSpeed = ball.velocity.clone().sub(surfaceVelocity).dot(normal);
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
