import { EventBus } from "../core/EventBus";
import { Random } from "../core/Random";
import { Vec3 } from "../core/Vec3";
import type { Side } from "../core/types";
import { TABLE } from "../physics/constants";
import { PhysicsWorld } from "../physics/PhysicsWorld";
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
  lateralSpeed: number;
  spin: Vec3;
  legal: boolean;
}

export class ServeController {
  private readonly random: Random;
  private current: ServePlan | null = null;
  private tossTime = 0;
  private served = false;
  private pointNumber = 0;
  private readonly calibrationWorld: PhysicsWorld;

  constructor(
    private readonly events: EventBus,
    private readonly world: PhysicsWorld,
    private readonly rules: RuleSet,
    seed = 441
  ) {
    this.random = new Random(seed);
    // A spare world uses the exact same contacts, drag and net as live play.
    // It is only advanced when a serve is selected, never during a rally.
    this.calibrationWorld = new PhysicsWorld(new EventBus(1), world.tuning);
  }

  prepare(server: Side): void {
    const sign = server === "home" ? 1 : -1;
    this.world.state.ball.reset(new Vec3(0, TABLE.top + 0.30, sign * 1.05));
  }

  begin(server: Side, style: ServeStyle = "pendulum"): ServePlan {
    const targetX = this.random.range(-TABLE.width * 0.38, TABLE.width * 0.38);
    const firstBounceZ = server === "home"
      ? this.random.range(0.36, 0.48)
      : this.random.range(-0.48, -0.36);
    const secondBounceZ = server === "home"
      ? this.random.range(-0.80, -0.48)
      : this.random.range(0.48, 0.80);
    const firstTravel = 1.05 - Math.abs(firstBounceZ);
    const secondTravel = Math.abs(firstBounceZ) + Math.abs(secondBounceZ);
    const restitution = this.world.tuning.table.restitution;
    const gravity = Math.abs(this.world.tuning.gravity);
    const drop = 0.30 - this.world.state.ball.radius;
    const horizontalRetention = 0.60;
    // Ballistic first-bounce estimate plus the table's normal restitution.
    // Tangential impulse removes roughly 40% of horizontal speed on a flat
    // bounce. Drag and spin perturb the exact landing point in live play.
    const firstFlight = Math.sqrt(2 * restitution * drop /
      (gravity * (secondTravel / (firstTravel * horizontalRetention) - restitution)));
    const speed = firstTravel / firstFlight;
    const launchY = (gravity * firstFlight * firstFlight * 0.5 - drop) / firstFlight;
    const spin = this.spinForStyle(style, server);
    const solved = this.calibrate(server, spin, firstBounceZ, secondBounceZ, targetX,
      speed, launchY, targetX / (firstFlight + secondTravel / (speed * horizontalRetention)));
    this.current = {
      server,
      style,
      targetX,
      firstBounceZ,
      secondBounceZ,
      speed: solved.z,
      launchY: solved.y,
      lateralSpeed: solved.x,
      spin,
      legal: true
    };
    this.tossTime = 0;
    this.served = false;
    this.prepare(server);
    this.events.emit("rally:start", { server });
    return this.current;
  }

  update(dt: number): void {
    if (!this.current || this.served) return;
    this.tossTime += dt;
    // The ball is visibly tossed before contact. Keep the held and launched
    // ball at the same location so service has no teleport or false impact.
    const duration = 0.42;
    const progress = Math.min(1, this.tossTime / duration);
    const ball = this.world.state.ball;
    ball.position.y = TABLE.top + 0.30 + 0.22 * 4 * progress * (1 - progress);
    if (this.tossTime < duration) return;
    const sign = this.current.server === "home" ? 1 : -1;
    const velocity = new Vec3(
      this.current.lateralSpeed,
      this.current.launchY,
      -sign * this.current.speed
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

  /** Shooting-method correction: fit two longitudinal bounce positions and
   * the receiver's lateral landing using live-world collision outcomes. */
  private calibrate(side: Side, spin: Vec3, firstTarget: number, secondTarget: number,
    xTarget: number, speed: number, launchY: number, lateralSpeed: number): Vec3 {
    let candidate = new Vec3(lateralSpeed, launchY, speed);
    let best = candidate.clone();
    let bestError = Infinity;
    for (let iteration = 0; iteration < 6; iteration += 1) {
      const result = this.measure(side, spin, candidate);
      if (!result) break;
      const [first, second] = result;
      const errorFirst = first.z - firstTarget;
      const errorSecond = second.z - secondTarget;
      const errorX = second.x - xTarget;
      const error = Math.hypot(errorFirst * 1.5, errorSecond, errorX * 0.7);
      if (error < bestError) { bestError = error; best.copy(candidate); }
      if (error < 0.007) break;
      const speedProbe = this.measure(side, spin, new Vec3(candidate.x, candidate.y, candidate.z + 0.08));
      const heightProbe = this.measure(side, spin, new Vec3(candidate.x, candidate.y + 0.08, candidate.z));
      const lateralProbe = this.measure(side, spin, new Vec3(candidate.x + 0.08, candidate.y, candidate.z));
      if (!speedProbe || !heightProbe || !lateralProbe) break;
      const a = (speedProbe[0].z - first.z) / 0.08;
      const b = (heightProbe[0].z - first.z) / 0.08;
      const c = (speedProbe[1].z - second.z) / 0.08;
      const d = (heightProbe[1].z - second.z) / 0.08;
      const determinant = a * d - b * c;
      if (Math.abs(determinant) < 0.0001) break;
      candidate.z = Math.max(2, Math.min(12, candidate.z +
        Math.max(-0.8, Math.min(0.8, (-errorFirst * d + b * errorSecond) / determinant))));
      candidate.y = Math.max(-4, Math.min(2, candidate.y +
        Math.max(-0.8, Math.min(0.8, (c * errorFirst - a * errorSecond) / determinant))));
      const dx = (lateralProbe[1].x - second.x) / 0.08;
      if (Math.abs(dx) > 0.01) candidate.x += Math.max(-0.45, Math.min(0.45, -errorX / dx));
      // A root of the bounce equations can still hit the net. Retain the
      // closest measured legal candidate instead of publishing an invalid one.
    }
    return best;
  }

  private measure(side: Side, spin: Vec3, velocity: Vec3): [Vec3, Vec3] | null {
    const world = this.calibrationWorld;
    world.reset();
    world.state.paddles.home.active = false;
    world.state.paddles.away.active = false;
    world.serve(side, new Vec3(velocity.x, velocity.y, (side === "home" ? -1 : 1) * velocity.z), spin);
    const bounces: Vec3[] = [];
    for (let tick = 0; tick < 360; tick += 1) {
      const result = world.fixedStep(1 / 240);
      for (const hit of result.contacts) {
        if (hit.kind === "net" || hit.surfaceId === "table-side" || hit.surfaceId === "table-edge") return null;
        if (hit.surfaceId === "table-top") {
          bounces.push(Vec3.from(hit.point));
          if (bounces.length === 2) {
            if (bounces[0].z * (side === "home" ? 1 : -1) <= 0 ||
                bounces[1].z * (side === "home" ? 1 : -1) >= 0) return null;
            return [bounces[0], bounces[1]];
          }
        }
      }
      if (result.ballOut) return null;
    }
    return null;
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
