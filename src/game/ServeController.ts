import { EventBus } from "../core/EventBus";
import { Random } from "../core/Random";
import { Vec3 } from "../core/Vec3";
import type { Side } from "../core/types";
import { TABLE } from "../physics/constants";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import type { RuleSet } from "./Rules";

export type ServeStyle = "flat" | "backspin" | "topspin" | "pendulum" | "kick" | "lob";

export interface ServePlan {
  server: Side;
  style: ServeStyle;
  targetX: number;
  firstBounceZ: number;
  secondBounceZ: number;
  speed: number;
  spin: Vec3;
  legal: boolean;
}

export class ServeController {
  private readonly random: Random;
  private current: ServePlan | null = null;
  private tossTime = 0;
  private served = false;
  private pointNumber = 0;

  constructor(
    private readonly events: EventBus,
    private readonly world: PhysicsWorld,
    private readonly rules: RuleSet,
    seed = 441
  ) {
    this.random = new Random(seed);
  }

  begin(server: Side, style: ServeStyle = "pendulum"): ServePlan {
    const targetX = this.random.range(-TABLE.width * 0.38, TABLE.width * 0.38);
    const firstBounceZ = server === "home"
      ? this.random.range(0.1, TABLE.length * 0.42)
      : this.random.range(-TABLE.length * 0.42, -0.1);
    const secondBounceZ = server === "home"
      ? this.random.range(-TABLE.length * 0.44, -0.18)
      : this.random.range(0.18, TABLE.length * 0.44);
    const speed = style === "lob" ? 3.0 : style === "kick" ? 3.9 : 3.45;
    const spin = this.spinForStyle(style, server);
    this.current = {
      server,
      style,
      targetX,
      firstBounceZ,
      secondBounceZ,
      speed,
      spin,
      legal: true
    };
    this.tossTime = 0;
    this.served = false;
    this.events.emit("rally:start", { server });
    return this.current;
  }

  update(dt: number): void {
    if (!this.current || this.served) return;
    this.tossTime += dt;
    if (this.tossTime < 0.12) return;
    const sign = this.current.server === "home" ? 1 : -1;
    const towardOpponent = -sign;
    const lateral = this.current.targetX;
    // Drive down into the server's half first; the table rebound clears the net.
    const arc = this.current.style === "lob" ? -1.35 : -1.6;
    const velocity = new Vec3(
      lateral * 1.2,
      arc,
      towardOpponent * this.current.speed
    );
    this.world.serve(this.current.server, velocity, this.current.spin);
    this.served = true;
  }

  invalidate(reason: string): void {
    if (!this.current) return;
    this.current.legal = false;
    this.events.emit("rally:end", { winner: this.current.server === "home" ? "away" : "home", reason });
  }

  isServing(): boolean {
    return Boolean(this.current && !this.served);
  }

  isActive(): boolean {
    return Boolean(this.current);
  }

  finishPoint(): void {
    this.current = null;
    this.served = false;
    this.tossTime = 0;
    this.pointNumber += 1;
  }

  reset(): void {
    this.current = null;
    this.served = false;
    this.tossTime = 0;
    this.pointNumber = 0;
  }

  plan(): ServePlan | null {
    return this.current ? { ...this.current, spin: this.current.spin.clone() } : null;
  }

  private spinForStyle(style: ServeStyle, server: Side): Vec3 {
    const sign = server === "home" ? 1 : -1;
    if (style === "flat") return new Vec3(0, 0, 0);
    if (style === "backspin") return new Vec3(-sign * 65, 0, 15);
    if (style === "topspin") return new Vec3(sign * 90, 0, -8);
    if (style === "kick") return new Vec3(sign * 150, 60, -40);
    return new Vec3(sign * 105, 125, 15);
  }
}
