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
  launchY: number;
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
      ? this.random.range(0.36, 0.48)
      : this.random.range(-0.48, -0.36);
    const secondBounceZ = server === "home"
      ? this.random.range(-0.80, -0.48)
      : this.random.range(0.48, 0.80);
    const firstTravel = 0.62 - Math.abs(firstBounceZ);
    const secondTravel = Math.abs(firstBounceZ) + Math.abs(secondBounceZ);
    const restitution = this.world.tuning.table.restitution;
    const gravity = Math.abs(this.world.tuning.gravity);
    const drop = 0.20 - this.world.state.ball.radius;
    const horizontalRetention = 0.60;
    // Ballistic first-bounce estimate plus the table's normal restitution.
    // Tangential impulse removes roughly 40% of horizontal speed on a flat
    // bounce. Drag and spin perturb the exact landing point in live play.
    const firstFlight = Math.sqrt(2 * restitution * drop /
      (gravity * (secondTravel / (firstTravel * horizontalRetention) - restitution)));
    const speed = firstTravel / firstFlight;
    const launchY = (gravity * firstFlight * firstFlight * 0.5 - drop) / firstFlight;
    const spin = this.spinForStyle(style, server);
    this.current = {
      server,
      style,
      targetX,
      firstBounceZ,
      secondBounceZ,
      speed,
      launchY,
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
    const flight = (0.62 - Math.abs(this.current.firstBounceZ)) / this.current.speed;
    const bounceFlight = (Math.abs(this.current.firstBounceZ) + Math.abs(this.current.secondBounceZ)) / this.current.speed;
    const velocity = new Vec3(
      lateral / (flight + bounceFlight),
      this.current.launchY,
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

  replayLet(): void {
    this.current = null;
    this.served = false;
    this.tossTime = 0;
  }

  plan(): ServePlan | null {
    return this.current ? { ...this.current, spin: this.current.spin.clone() } : null;
  }

  private spinForStyle(style: ServeStyle, server: Side): Vec3 {
    const sign = server === "home" ? 1 : -1;
    if (style === "flat") return new Vec3(0, 0, 0);
    if (style === "lob") return new Vec3(sign * 22, 0, 0);
    // omega x velocity must point down for topspin on either side of the table.
    if (style === "backspin") return new Vec3(sign * 65, 0, 15);
    if (style === "topspin") return new Vec3(-sign * 90, 0, -8);
    if (style === "kick") return new Vec3(-sign * 150, 60, -40);
    return new Vec3(-sign * 105, 125, 15);
  }
}
