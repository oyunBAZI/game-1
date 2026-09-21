import { EventBus } from "../core/EventBus";
import { Random } from "../core/Random";
import { Vec3 } from "../core/Vec3";
import type { Side } from "../core/types";
import type { GameSimulation } from "./GameSimulation";

export type PracticeMode = "free" | "multiball" | "serve-return" | "target" | "randomizer";

export interface PracticeSettings {
  mode: PracticeMode;
  feedInterval: number;
  feedSpeed: number;
  feedSpin: Vec3;
  target: Vec3;
  maxBalls: number;
  allowScoring: boolean;
}

export interface PracticeState {
  active: boolean;
  elapsed: number;
  feeds: number;
  successfulReturns: number;
  misses: number;
  score: number;
}

export class PracticeDirector {
  readonly state: PracticeState = {
    active: false,
    elapsed: 0,
    feeds: 0,
    successfulReturns: 0,
    misses: 0,
    score: 0
  };
  settings: PracticeSettings = {
    mode: "free",
    feedInterval: 2.2,
    feedSpeed: 8,
    feedSpin: new Vec3(),
    target: new Vec3(0, 0.76, -0.35),
    maxBalls: 1,
    allowScoring: false
  };
  private readonly random = new Random(90210);
  private feedTimer = 0;
  private lastContactCount = 0;
  private lastContactSide: Side | null = null;
  private subscriptions: Array<() => void> = [];

  constructor(
    private readonly simulation: GameSimulation,
    private readonly events: EventBus
  ) {
    this.subscriptions.push(
      events.on("physics:contact", (contact) => {
        if (contact.kind === "paddle" && contact.side === "home") {
          this.state.successfulReturns += 1;
          this.state.score += 10;
          this.lastContactSide = contact.side;
        }
      }),
      events.on("rally:end", () => {
        if (!this.state.active) return;
        this.state.misses += 1;
        this.state.score = Math.max(0, this.state.score - 5);
      })
    );
  }

  start(settings: Partial<PracticeSettings> = {}): void {
    this.settings = {
      ...this.settings,
      ...settings,
      feedSpin: settings.feedSpin?.clone() ?? this.settings.feedSpin.clone(),
      target: settings.target?.clone() ?? this.settings.target.clone()
    };
    this.state.active = true;
    this.state.elapsed = 0;
    this.state.feeds = 0;
    this.state.successfulReturns = 0;
    this.state.misses = 0;
    this.state.score = 0;
    this.feedTimer = 0;
    this.lastContactCount = 0;
  }

  stop(): void {
    this.state.active = false;
  }

  update(dt: number): void {
    if (!this.state.active) return;
    this.state.elapsed += dt;
    this.feedTimer -= dt;
    if (this.settings.mode !== "free" && this.feedTimer <= 0 && this.state.feeds < this.settings.maxBalls) {
      this.feed();
      this.feedTimer = this.settings.feedInterval;
    }
    const currentContacts = this.simulation.world.state.ball.contactCount;
    if (currentContacts > this.lastContactCount && this.lastContactSide === "home") {
      this.lastContactCount = currentContacts;
      this.events.emit("ui:toast", { message: "Return registered", level: "success" });
    }
  }

  setMode(mode: PracticeMode): void {
    this.settings.mode = mode;
  }

  reset(): void {
    this.stop();
    this.state.elapsed = 0;
    this.state.feeds = 0;
    this.state.successfulReturns = 0;
    this.state.misses = 0;
    this.state.score = 0;
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription());
    this.subscriptions.length = 0;
  }

  private feed(): void {
    const targetX = this.settings.mode === "randomizer" ? this.random.range(-0.6, 0.6) : this.settings.target.x;
    const direction = new Vec3(
      targetX * 0.5,
      this.settings.mode === "target" ? 2.4 : this.random.range(2, 3.3),
      1
    ).normalize();
    const velocity = direction.multiplyScalar(this.settings.feedSpeed);
    this.simulation.world.serve("away", velocity, this.settings.feedSpin.clone());
    this.state.feeds += 1;
  }
}