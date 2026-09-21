import { Quat } from "../core/Quat";
import { Vec3 } from "../core/Vec3";
import type {
  BallSnapshot,
  PaddleSnapshot,
  PlayerSnapshot,
  Side,
  WorldSnapshot
} from "../core/types";
import { BALL, PADDLE } from "./constants";

export class BallState {
  position = new Vec3(0, 1.05, 0);
  previousPosition = new Vec3(0, 1.05, 0);
  velocity = new Vec3();
  angularVelocity = new Vec3();
  force = new Vec3();
  torque = new Vec3();
  radius = BALL.radius;
  mass = BALL.mass;
  grounded = false;
  age = 0;
  lastContact: BallSnapshot["lastContact"] = null;
  lastContactSide: Side | null = null;
  lastHitTick = -1;
  contactCount = 0;

  reset(position = new Vec3(0, 1.05, 0), velocity = new Vec3()): this {
    this.position.copy(position);
    this.previousPosition.copy(position);
    this.velocity.copy(velocity);
    this.angularVelocity.set(0, 0, 0);
    this.force.set(0, 0, 0);
    this.torque.set(0, 0, 0);
    this.grounded = false;
    this.age = 0;
    this.lastContact = null;
    this.lastContactSide = null;
    this.lastHitTick = -1;
    this.contactCount = 0;
    return this;
  }

  beginStep(): void {
    this.previousPosition.copy(this.position);
    this.force.set(0, 0, 0);
    this.torque.set(0, 0, 0);
    this.grounded = false;
  }

  addForce(value: Vec3): void {
    this.force.add(value);
  }

  addTorque(value: Vec3): void {
    this.torque.add(value);
  }

  speed(): number {
    return this.velocity.length();
  }

  spinRate(): number {
    return this.angularVelocity.length();
  }

  snapshot(): BallSnapshot {
    return {
      position: this.position.toJSON(),
      velocity: this.velocity.toJSON(),
      angularVelocity: this.angularVelocity.toJSON(),
      previousPosition: this.previousPosition.toJSON(),
      grounded: this.grounded,
      lastContact: this.lastContact,
      age: this.age
    };
  }

  restore(snapshot: BallSnapshot): void {
    this.position.copy(snapshot.position);
    this.velocity.copy(snapshot.velocity);
    this.angularVelocity.copy(snapshot.angularVelocity);
    this.previousPosition.copy(snapshot.previousPosition);
    this.grounded = snapshot.grounded;
    this.lastContact = snapshot.lastContact;
    this.age = snapshot.age;
  }

  clone(): BallState {
    const result = new BallState();
    result.position.copy(this.position);
    result.previousPosition.copy(this.previousPosition);
    result.velocity.copy(this.velocity);
    result.angularVelocity.copy(this.angularVelocity);
    result.force.copy(this.force);
    result.torque.copy(this.torque);
    result.radius = this.radius;
    result.mass = this.mass;
    result.grounded = this.grounded;
    result.age = this.age;
    result.lastContact = this.lastContact;
    result.lastContactSide = this.lastContactSide;
    result.lastHitTick = this.lastHitTick;
    result.contactCount = this.contactCount;
    return result;
  }
}

export class PaddleState {
  readonly side: Side;
  position: Vec3;
  previousPosition: Vec3;
  velocity = new Vec3();
  normal = new Vec3(0, 0, 1);
  swingVelocity = new Vec3();
  angularVelocity = new Vec3();
  rotation = new Quat();
  contactRadius: number = PADDLE.collisionPadding;
  active = true;
  faceWidth = PADDLE.faceWidth;
  faceHeight = PADDLE.faceHeight;
  grip = 0.8;
  rubberId = "balanced";

  constructor(side: Side) {
    this.side = side;
    const z = side === "home" ? 1.0 : -1.0;
    this.position = new Vec3(0, 1.0, z);
    this.previousPosition = this.position.clone();
    this.normal.set(0, 0, side === "home" ? -1 : 1);
  }

  beginStep(): void {
    this.previousPosition.copy(this.position);
    this.swingVelocity.set(0, 0, 0);
  }

  updateKinematics(dt: number): void {
    if (dt <= 0) return;
    this.velocity.copy(this.position).sub(this.previousPosition).divideScalar(dt);
    // The controller supplies a separate stroke impulse; it must survive this update.
  }

  velocityAt(point: Vec3): Vec3 {
    const offset = point.clone().sub(this.position);
    const rotational = new Vec3().crossVectors(this.angularVelocity, offset);
    return this.velocity.clone().add(this.swingVelocity).add(rotational);
  }

  snapshot(): PaddleSnapshot {
    return {
      side: this.side,
      position: this.position.toJSON(),
      velocity: this.velocity.toJSON(),
      normal: this.normal.toJSON(),
      swingVelocity: this.swingVelocity.toJSON(),
      contactRadius: this.contactRadius,
      active: this.active
    };
  }

  restore(snapshot: PaddleSnapshot): void {
    this.position.copy(snapshot.position);
    this.velocity.copy(snapshot.velocity);
    this.normal.copy(snapshot.normal);
    this.swingVelocity.copy(snapshot.swingVelocity);
    this.contactRadius = snapshot.contactRadius;
    this.active = snapshot.active;
  }
}

export class PlayerState {
  readonly side: Side;
  position: Vec3;
  previousPosition: Vec3;
  velocity = new Vec3();
  energy = 1;
  ready = true;
  stance: PlayerSnapshot["stance"] = "neutral";
  reach = 1.35;
  maxSpeed = 3.2;
  reactionTimer = 0;

  constructor(side: Side) {
    this.side = side;
    this.position = new Vec3(0, 0, side === "home" ? 1.62 : -1.62);
    this.previousPosition = this.position.clone();
  }

  updateKinematics(dt: number): void {
    if (dt <= 0) return;
    this.velocity.copy(this.position).sub(this.previousPosition).divideScalar(dt);
  }

  snapshot(): PlayerSnapshot {
    return {
      side: this.side,
      position: this.position.toJSON(),
      velocity: this.velocity.toJSON(),
      energy: this.energy,
      ready: this.ready,
      stance: this.stance
    };
  }

  restore(snapshot: PlayerSnapshot): void {
    this.position.copy(snapshot.position);
    this.velocity.copy(snapshot.velocity);
    this.energy = snapshot.energy;
    this.ready = snapshot.ready;
    this.stance = snapshot.stance;
  }
}

export class WorldState {
  tick = 0;
  time = 0;
  ball = new BallState();
  paddles: Record<Side, PaddleState> = {
    home: new PaddleState("home"),
    away: new PaddleState("away")
  };
  players: Record<Side, PlayerState> = {
    home: new PlayerState("home"),
    away: new PlayerState("away")
  };

  beginStep(): void {
    this.ball.beginStep();
    this.paddles.home.beginStep();
    this.paddles.away.beginStep();
    this.players.home.previousPosition.copy(this.players.home.position);
    this.players.away.previousPosition.copy(this.players.away.position);
  }

  finishStep(dt: number): void {
    this.paddles.home.updateKinematics(dt);
    this.paddles.away.updateKinematics(dt);
    this.players.home.updateKinematics(dt);
    this.players.away.updateKinematics(dt);
    this.ball.age += dt;
    this.time += dt;
    this.tick += 1;
  }

  snapshot(): WorldSnapshot {
    return {
      tick: this.tick,
      time: this.time,
      ball: this.ball.snapshot(),
      paddles: {
        home: this.paddles.home.snapshot(),
        away: this.paddles.away.snapshot()
      },
      players: {
        home: this.players.home.snapshot(),
        away: this.players.away.snapshot()
      }
    };
  }

  restore(snapshot: WorldSnapshot): void {
    this.tick = snapshot.tick;
    this.time = snapshot.time;
    this.ball.restore(snapshot.ball);
    this.paddles.home.restore(snapshot.paddles.home);
    this.paddles.away.restore(snapshot.paddles.away);
    this.players.home.restore(snapshot.players.home);
    this.players.away.restore(snapshot.players.away);
  }

  clone(): WorldState {
    const result = new WorldState();
    result.restore(this.snapshot());
    return result;
  }
}
