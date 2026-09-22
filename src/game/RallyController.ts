import { EventBus } from "../core/EventBus";
import type { ContactKind, Side } from "../core/types";
import { oppositeSide } from "../core/types";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import type { CollisionContact } from "../core/types";
import type { Scoreboard } from "./Scoreboard";
import { classifyShot } from "./ShotClassifier";
import { TRAINING_RULES, type RuleSet } from "./Rules";

export interface RallyState {
  active: boolean;
  server: Side | null;
  lastHitter: Side | null;
  touches: number;
  lastContact: ContactKind | null;
  startedAt: number;
  pointReason: string | null;
  serveStage: "own" | "receiver" | "complete";
  expectedBounce: Side | null;
  bouncesOnExpected: number;
  netOnServe: boolean;
}

export class RallyController {
  readonly state: RallyState = {
    active: false,
    server: null,
    lastHitter: null,
    touches: 0,
    lastContact: null,
    startedAt: 0,
    pointReason: null,
    serveStage: "own",
    expectedBounce: null,
    bouncesOnExpected: 0,
    netOnServe: false
  };
  private unsubscribe: Array<() => void> = [];

  constructor(
    private readonly events: EventBus,
    private readonly world: PhysicsWorld,
    private readonly scoreboard: Scoreboard,
    private readonly rules: RuleSet = TRAINING_RULES
  ) {
    this.unsubscribe.push(
      this.events.on("rally:start", ({ server }) => this.start(server)),
      this.events.on("physics:contact", (contact) => this.onContact(contact)),
      this.events.on("physics:out", ({ reason }) => this.onOut(reason))
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
    this.state.serveStage = "own";
    this.state.expectedBounce = server;
    this.state.bouncesOnExpected = 0;
    this.state.netOnServe = false;
  }

  cancel(): void {
    this.state.active = false;
    this.state.pointReason = null;
  }

  onContact(contact: CollisionContact & { tick: number }): void {
    if (!this.state.active) return;
    if (contact.kind === "paddle" && contact.side) {
      const side = contact.side;
      const opponent = oppositeSide(side);
      if (this.state.serveStage !== "complete") {
        this.end(opponent, "early-serve-return");
        return;
      }
      if (this.state.lastHitter === side) {
        this.end(opponent, "double-hit");
        return;
      }
      if (this.state.expectedBounce !== side || this.state.bouncesOnExpected === 0) {
        this.end(opponent, "volley");
        return;
      }
      this.state.lastContact = "paddle";
      this.state.lastHitter = contact.side;
      this.state.touches += 1;
      this.state.expectedBounce = opponent;
      this.state.bouncesOnExpected = 0;
      const paddle = this.world.state.paddles[contact.side];
      const shot = classifyShot(this.world.state.ball, paddle, contact.side);
      this.events.emit("shot:hit", {
        side: contact.side,
        kind: shot.kind,
        speed: shot.speed,
        spin: this.world.state.ball.angularVelocity.toJSON()
      });
      return;
    }
    if (contact.kind === "table" || contact.kind === "edge") {
      if (contact.normal.y <= 0) {
        this.onOut("table-side");
        return;
      }
      const side: Side = contact.point.z >= 0 ? "home" : "away";
      if (side !== this.state.expectedBounce) {
        this.end(oppositeSide(this.state.lastHitter ?? this.state.server ?? side), "wrong-side-bounce");
        return;
      }
      this.state.bouncesOnExpected += 1;
      if (this.state.serveStage === "own") {
        this.state.serveStage = "receiver";
        this.state.expectedBounce = oppositeSide(this.state.server!);
        this.state.bouncesOnExpected = 0;
      } else if (this.state.serveStage === "receiver") {
        this.state.serveStage = "complete";
        this.state.lastHitter = this.state.server;
        if (this.state.netOnServe && this.rules.letOnNetServe) {
          this.state.active = false;
          this.state.pointReason = "let";
          this.events.emit("rally:let", { server: this.state.server! });
          return;
        }
      } else if (this.state.bouncesOnExpected > 1) {
        this.end(this.state.lastHitter ?? oppositeSide(side), "double-bounce");
      }
      this.state.lastContact = contact.kind;
      return;
    }
    if (contact.kind === "net" && this.state.serveStage === "receiver") this.state.netOnServe = true;
    this.state.lastContact = contact.kind;
  }

  private onOut(reason: string): void {
    if (!this.state.active) return;
    if (this.state.serveStage !== "complete") {
      this.end(oppositeSide(this.state.server ?? "home"), "service-" + reason);
    } else if (this.state.bouncesOnExpected > 0) {
      this.end(this.state.lastHitter ?? "home", reason);
    } else {
      this.end(oppositeSide(this.state.lastHitter ?? "home"), reason);
    }
  }

  end(winner: Side, reason: string): void {
    if (!this.state.active) return;
    this.state.active = false;
    this.state.pointReason = reason;
    this.scoreboard.awardPoint(winner);
    this.events.emit("rally:end", { winner, reason });
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
