import { EventBus } from "../core/EventBus";
import { Vec3 } from "../core/Vec3";
import type { CollisionContact, Side } from "../core/types";
import { mergeTuning, type PhysicsTuning, TABLE } from "./constants";
import { resolveNetContact, resolvePaddleContact, resolveTableBounce } from "./ContactModels";
import { NetCollider } from "./NetCollider";
import { PaddleCollider } from "./PaddleCollider";
import { BallIntegrator } from "./Integrator";
import { TableCollider } from "./TableCollider";
import { WorldState } from "./State";

type WorldHit =
  | { kind: "paddle"; contact: CollisionContact }
  | { kind: "net"; contact: CollisionContact }
  | { kind: "table"; contact: CollisionContact; surface: "top" | "edge" | "side"; normal: Vec3 };

export interface PhysicsStepResult {
  contacts: CollisionContact[];
  ballOut: boolean;
  outReason: string | null;
}

export class PhysicsWorld {
  readonly state: WorldState;
  readonly table: TableCollider;
  readonly net: NetCollider;
  readonly paddles: PaddleCollider;
  readonly integrator: BallIntegrator;
  readonly tuning: PhysicsTuning;
  private readonly contacts: CollisionContact[] = [];
  private readonly desiredSpin: Record<Side, Vec3> = { home: new Vec3(), away: new Vec3() };
  private lastContactTick = new Map<string, number>();

  constructor(
    private readonly events: EventBus,
    tuning: Partial<PhysicsTuning> = {}
  ) {
    this.tuning = mergeTuning(tuning);
    this.state = new WorldState();
    this.table = new TableCollider();
    this.net = new NetCollider();
    this.paddles = new PaddleCollider();
    this.integrator = new BallIntegrator(this.tuning);
  }

  reset(): void {
    this.state.tick = 0;
    this.state.time = 0;
    this.state.ball.reset();
    this.state.paddles.home.position.set(0, 1, 1);
    this.state.paddles.away.position.set(0, 1, -1);
    for (const side of ["home", "away"] as Side[]) {
      this.state.paddles[side].previousPosition.copy(this.state.paddles[side].position);
      this.state.paddles[side].normal.set(0, 0, side === "home" ? -1 : 1);
      this.state.paddles[side].previousNormal.copy(this.state.paddles[side].normal);
      this.state.paddles[side].velocity.set(0, 0, 0);
      this.state.paddles[side].swingVelocity.set(0, 0, 0);
      this.state.paddles[side].angularVelocity.set(0, 0, 0);
      this.state.paddles[side].active = true;
      this.state.players[side].velocity.set(0, 0, 0);
      this.state.players[side].energy = 1;
      this.state.players[side].ready = true;
      this.state.players[side].stance = "neutral";
      this.desiredSpin[side].set(0, 0, 0);
    }
    this.state.players.home.position.set(0, 0, 1.62);
    this.state.players.away.position.set(0, 0, -1.62);
    for (const side of ["home", "away"] as Side[]) {
      this.state.players[side].previousPosition.copy(this.state.players[side].position);
    }
    this.net.reset();
    this.contacts.length = 0;
    this.lastContactTick.clear();
  }

  serve(side: Side, velocity: Vec3, spin = new Vec3()): void {
    const sign = side === "home" ? 1 : -1;
    // The strike takes place just inside the server's end line. The racket
    // and hand can actually reach this position from behind the table.
    const position = new Vec3(0, TABLE.top + 0.30, sign * 1.05);
    const direction = velocity.clone();
    if (Math.sign(direction.z) === sign || Math.abs(direction.z) < 0.01) direction.z = -sign * Math.abs(direction.z || 4.5);
    this.state.ball.reset(position, direction);
    this.state.ball.angularVelocity.copy(spin);
    this.state.ball.lastContactSide = side;
    this.state.ball.lastContact = null;
  }

  setDesiredSpin(side: Side, spin: Vec3): void {
    this.desiredSpin[side].copy(spin).clampMagnitude(this.tuning.maxSpinRate);
  }

  fixedStep(dt: number, controls?: () => void, simulateBall = true, looseBall = false): PhysicsStepResult {
    const world = this.state;
    world.beginStep();
    controls?.();
    this.integrator.integratePlayers(world, dt);
    for (const paddle of [world.paddles.home, world.paddles.away]) {
      paddle.updateKinematics(dt);
      paddle.velocity.clampMagnitude(15);
    }
    this.net.step(dt);
    this.contacts.length = 0;
    let outReason: string | null = null;
    if (simulateBall) {
      this.advanceBall(dt);
      outReason = this.detectOut();
    } else if (looseBall) {
      // Point scoring is finished, but the ball keeps moving through the same
      // table and net contacts until the next serve is prepared.
      this.advanceBall(dt);
      this.settleLooseBall(dt);
    }
    world.finishStep(dt);
    for (const contact of this.contacts) this.emitContact(contact);
    return { contacts: [...this.contacts], ballOut: Boolean(outReason), outReason };
  }

  /** Resolve the earliest surface first, then simulate the unused part of the step.
   * This permits a fast ball to hit the net and table in one step without
   * reporting the contacts in the opposite order or tunnelling through either.
   */
  private advanceBall(dt: number): void {
    const ball = this.state.ball;
    const frameStart = ball.previousPosition.clone();
    let remaining = dt;
    let elapsed = 0;
    for (let iteration = 0; iteration < 8 && remaining > 1e-7; iteration += 1) {
      const start = ball.position.clone();
      const startVelocity = ball.velocity.clone();
      const startSpin = ball.angularVelocity.clone();
      const startForce = ball.force.clone();
      const startTorque = ball.torque.clone();
      ball.previousPosition.copy(start);
      // The full step is a collision probe. It must not consume the forces or
      // determine the impact velocity: drag and Magnus lift are nonlinear, so
      // interpolating the end velocity makes a struck ball depend on the size
      // of the portion of the frame after contact.
      this.integrator.integrate(ball, remaining);
      const hit = this.firstHit(elapsed / dt, (elapsed + remaining) / dt);
      if (!hit) { remaining = 0; break; }
      const fraction = Math.max(0, Math.min(1, hit.contact.timeOfImpact));
      ball.position.copy(start);
      ball.velocity.copy(startVelocity);
      ball.angularVelocity.copy(startSpin);
      ball.force.copy(startForce);
      ball.torque.copy(startTorque);
      if (fraction > 0) this.integrator.integrate(ball, remaining * fraction);
      const globalTime = (elapsed + remaining * fraction) / dt;
      const normal = Vec3.from(hit.contact.normal);
      const surfaceVelocity = hit.kind === "paddle"
        ? this.state.paddles[hit.contact.side!].velocityAt(Vec3.from(hit.contact.point), globalTime)
        : hit.kind === "net" && hit.contact.surfaceId === "net-mesh"
          ? this.net.velocityAt(hit.contact.point.x, hit.contact.point.y) : new Vec3();
      hit.contact.relativeSpeed = Math.max(0, -ball.velocity.clone().sub(surfaceVelocity).dot(normal));
      this.resolveHit(hit, globalTime);
      hit.contact.timeOfImpact = globalTime;
      this.contacts.push(hit.contact);
      this.lastContactTick.set(hit.contact.surfaceId, this.state.tick);
      elapsed += remaining * fraction;
      remaining *= 1 - fraction;
    }
    // The iteration cap only protects against degenerate geometry. Keep the
    // frame finite and preserve the original start for render interpolation.
    if (remaining > 1e-7) {
      ball.previousPosition.copy(ball.position);
      this.integrator.integrate(ball, remaining);
    }
    ball.previousPosition.copy(frameStart);
  }

  private firstHit(startTime: number, endTime: number): WorldHit | null {
    const ball = this.state.ball;
    let earliest: WorldHit | null = null;
    const consider = (hit: WorldHit | null): void => {
      if (!hit || this.lastContactTick.get(hit.contact.surfaceId) === this.state.tick) return;
      if (!earliest || hit.contact.timeOfImpact < earliest.contact.timeOfImpact) earliest = hit;
    };
    for (const side of ["home", "away"] as Side[]) {
      const paddle = this.state.paddles[side];
      const contact = this.paddles.detect(ball, paddle, startTime, endTime);
      if (contact) consider({ kind: "paddle", contact });
    }
    const net = this.net.detect(ball);
    if (net) consider({ kind: "net", contact: net });
    const table = this.table.detect(ball);
    if (table) consider({ kind: "table", ...table });
    return earliest;
  }

  private resolveHit(hit: WorldHit, contactTime: number): void {
    const ball = this.state.ball;
    const contact = hit.contact;
    const normal = Vec3.from(contact.normal);
    if (hit.kind === "paddle") {
      const side = contact.side!;
      const paddle = this.state.paddles[side];
      resolvePaddleContact(ball, paddle, this.tuning.rubber, this.desiredSpin[side], normal, contactTime);
      ball.lastContact = "paddle";
      ball.lastContactSide = side;
      ball.lastHitTick = this.state.tick;
    } else if (hit.kind === "net") {
      const before = ball.velocity.clone();
      const surfaceVelocity = contact.surfaceId === "net-mesh"
        ? this.net.velocityAt(contact.point.x, contact.point.y) : new Vec3();
      resolveNetContact(ball, normal,
        contact.surfaceId.startsWith("net-post") ? 0.55 : this.tuning.netRestitution,
        surfaceVelocity);
      if (!contact.surfaceId.startsWith("net-post")) {
        this.net.applyImpulse(Vec3.from(contact.point), before.sub(ball.velocity).multiplyScalar(ball.mass * 0.6));
      }
      ball.lastContact = "net";
    } else {
      resolveTableBounce(ball, hit.normal, hit.surface === "top" ? this.tuning.table : {
        ...this.tuning.table,
        restitution: hit.surface === "side" ? this.tuning.table.edgeRestitution * 0.7 : this.tuning.table.edgeRestitution
      });
      ball.grounded = hit.surface === "top";
      ball.lastContact = hit.surface === "top" ? "table" : "edge";
    }
    ball.position.copy(contact.point).addScaled(normal, ball.radius + 0.0005);
    ball.contactCount += 1;
  }

  private detectOut(): string | null {
    const ball = this.state.ball;
    if (ball.position.y <= ball.radius) {
      ball.position.y = ball.radius;
      return "floor";
    }
    if (Math.abs(ball.position.x) > 2.4) return "wide";
    if (Math.abs(ball.position.z) > 3.2) return "long";
    if (ball.age > 7.5 && ball.position.y < TABLE.top) return "stale";
    return null;
  }

  private settleLooseBall(dt: number): void {
    const ball = this.state.ball;
    if (ball.position.y > ball.radius) return;
    ball.position.y = ball.radius;
    if (ball.velocity.y < -0.24) {
      ball.velocity.y = -ball.velocity.y * this.tuning.floorRestitution;
      ball.velocity.x *= 0.78;
      ball.velocity.z *= 0.78;
      ball.angularVelocity.multiplyScalar(0.7);
    } else {
      ball.velocity.y = 0;
      ball.velocity.x *= Math.exp(-4 * dt);
      ball.velocity.z *= Math.exp(-4 * dt);
      ball.angularVelocity.multiplyScalar(Math.exp(-6 * dt));
    }
    ball.grounded = true;
  }

  private emitContact(contact: CollisionContact): void {
    this.events.emit("physics:contact", { ...contact, tick: this.state.tick });
  }

  snapshot() {
    return { ...this.state.snapshot(), net: this.net.snapshot() };
  }

  restore(snapshot: ReturnType<WorldState["snapshot"]>): void {
    this.state.restore(snapshot);
    this.contacts.length = 0;
    this.lastContactTick.clear();
    this.net.restore(snapshot.net);
  }

  recentContacts(): CollisionContact[] {
    return [...this.contacts];
  }
}
