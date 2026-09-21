import { EventBus } from "../core/EventBus";
import type { ContactKind, Side } from "../core/types";
import { oppositeSide } from "../core/types";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import type { CollisionContact } from "../core/types";
import type { Scoreboard } from "./Scoreboard";
import { classifyShot } from "./ShotClassifier";

export interface RallyState {
  active: boolean;
  server: Side | null;
  lastHitter: Side | null;
  touches: number;
  lastContact: ContactKind | null;
  startedAt: number;
  pointReason: string | null;
}

export class RallyController {
  readonly state: RallyState = {
    active: false,
    server: null,
    lastHitter: null,
    touches: 0,
    lastContact: null,
    startedAt: 0,
    pointReason: null
  };
  private unsubscribe: Array<() => void> = [];

  constructor(
    private readonly events: EventBus,
    private readonly world: PhysicsWorld,
    private readonly scoreboard: Scoreboard
  ) {
    this.unsubscribe.push(
      this.events.on("rally:start", ({ server }) => this.start(server)),
      this.events.on("physics:contact", (contact) => this.onContact(contact)),
      this.events.on("physics:out", ({ side, reason }) => this.end(oppositeSide(side), reason))
    );
  }

  start(server: Side): void {
    this.state.active = true;
    this.state.server = server;
    this.state.lastHitter = null;
    this.state.touches = 0;
    this.state.lastContact = null;
    this.state.startedAt = this.world.state.time;
    this.state.pointReason = null;
  }

  onContact(contact: CollisionContact & { tick: number }): void {
    if (!this.state.active) return;
    this.state.lastContact = contact.kind;
    if (contact.kind === "paddle" && contact.side) {
      this.state.lastHitter = contact.side;
      this.state.touches += 1;
      const paddle = this.world.state.paddles[contact.side];
      const shot = classifyShot(this.world.state.ball, paddle, contact.side);
      this.events.emit("shot:hit", {
        side: contact.side,
        kind: shot.kind,
        speed: shot.speed,
        spin: this.world.state.ball.angularVelocity.toJSON()
      });
    }
    if (contact.kind === "net" && this.state.touches === 0) {
      this.end(oppositeSide(this.state.server ?? "home"), "net-before-serve");
    }
  }

  end(winner: Side, reason: string): void {
    if (!this.state.active) return;
    this.state.active = false;
    this.state.pointReason = reason;
    this.events.emit("rally:end", { winner, reason });
    this.scoreboard.awardPoint(winner);
  }

  validateServe(): { valid: boolean; reason?: string } {
    if (!this.state.active || this.state.touches > 0) return { valid: false, reason: "rally-not-awaiting-serve" };
    if (!this.state.server) return { valid: false, reason: "no-server" };
    return { valid: true };
  }

  dispose(): void {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe.length = 0;
  }
}