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
  private readonly contactSides = new Set<Side>();
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
    this.state.players.home.position.set(0, 0, 1.62);
    this.state.players.away.position.set(0, 0, -1.62);
    this.net.reset();
    this.contacts.length = 0;
    this.contactSides.clear();
    this.lastContactTick.clear();
  }

  serve(side: Side, velocity: Vec3, spin = new Vec3()): void {
    const sign = side === "home" ? 1 : -1;
    const position = new Vec3(0, TABLE.top + 0.42, sign * 0.58);
    const direction = velocity.clone();
    if (Math.sign(direction.z) === sign || Math.abs(direction.z) < 0.01) direction.z = -sign * Math.abs(direction.z || 4.5);
    this.state.ball.reset(position, direction);
    this.state.ball.angularVelocity.copy(spin);
    this.state.ball.lastContactSide = side;
    this.state.ball.lastContact = null;
  }

  fixedStep(dt: number): PhysicsStepResult {
    const world = this.state;
    world.beginStep();
    this.integrator.integratePlayers(world, dt);
    this.integrator.integrate(world.ball, dt);
    this.net.step(dt);
    this.contacts.length = 0;
    this.contactSides.clear();
    this.detectAndResolvePaddles();
    this.detectAndResolveNet();
    this.detectAndResolveTable();
    const outReason = this.detectOut();
    world.finishStep(dt);
    for (const contact of this.contacts) this.emitContact(contact);
    return { contacts: [...this.contacts], ballOut: Boolean(outReason), outReason };
  }

  private detectAndResolvePaddles(): void {
    const ball = this.state.ball;
    for (const side of ["home", "away"] as Side[]) {
      const paddle = this.state.paddles[side];
      const contact = this.paddles.detect(ball, paddle);
      if (!contact) continue;
      const previousTick = this.lastContactTick.get(contact.surfaceId);
      if (previousTick === this.state.tick) continue;
      const desiredSpin = new Vec3(0, 0, 0);
      resolvePaddleContact(ball, paddle, this.tuning.rubber, desiredSpin);
      ball.position.addScaled(Vec3.from(contact.normal), contact.penetration + 0.0005);
      ball.lastContact = "paddle";
      ball.lastContactSide = side;
      ball.lastHitTick = this.state.tick;
      ball.contactCount += 1;
      this.contacts.push(contact);
      this.contactSides.add(side);
      this.lastContactTick.set(contact.surfaceId, this.state.tick);
      this.events.emit("shot:hit", {
        side,
        kind: "drive",
        speed: ball.velocity.length(),
        spin: ball.angularVelocity.toJSON()
      });
    }
  }

  private detectAndResolveNet(): void {
    const ball = this.state.ball;
    const contact = this.net.detect(ball);
    if (!contact) return;
    const previousTick = this.lastContactTick.get(contact.surfaceId);
    if (previousTick === this.state.tick) return;
    resolveNetContact(ball, Vec3.from(contact.normal), this.tuning.netRestitution);
    this.net.applyImpulse(Vec3.from(contact.point), ball.velocity.clone().multiplyScalar(ball.mass * 0.6));
    ball.position.addScaled(Vec3.from(contact.normal), contact.penetration + 0.0005);
    ball.lastContact = "net";
    ball.contactCount += 1;
    this.contacts.push(contact);
    this.lastContactTick.set(contact.surfaceId, this.state.tick);
  }

  private detectAndResolveTable(): void {
    const ball = this.state.ball;
    const collision = this.table.detect(ball);
    if (!collision) return;
    const previousTick = this.lastContactTick.get(collision.contact.surfaceId);
    if (previousTick === this.state.tick) return;
    resolveTableBounce(ball, collision.normal, this.tuning.table);
    ball.position.addScaled(collision.normal, collision.contact.penetration + 0.0005);
    ball.grounded = true;
    ball.lastContact = collision.surface;
    ball.contactCount += 1;
    this.contacts.push(collision.contact);
    this.lastContactTick.set(collision.contact.surfaceId, this.state.tick);
  }

  private detectOut(): string | null {
    const ball = this.state.ball;
    if (ball.position.y < -0.15) return "floor";
    if (Math.abs(ball.position.x) > 2.4) return "wide";
    if (Math.abs(ball.position.z) > 3.2) return "long";
    if (ball.age > 7.5 && ball.position.y < TABLE.top) return "stale";
    return null;
  }

  private emitContact(contact: CollisionContact): void {
    this.events.emit("physics:contact", { ...contact, tick: this.state.tick });
  }

  snapshot() {
    return this.state.snapshot();
  }

  restore(snapshot: ReturnType<WorldState["snapshot"]>): void {
    this.state.restore(snapshot);
  }

  recentContacts(): CollisionContact[] {
    return [...this.contacts];
  }
}