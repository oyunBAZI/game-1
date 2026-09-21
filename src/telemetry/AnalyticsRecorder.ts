import type { EventBus } from "../core/EventBus";
import type { Side } from "../core/types";
import { MetricsRegistry } from "./Metrics";
import { ShotTelemetry } from "./ShotTelemetry";
import { TelemetryBuffer } from "./TelemetryBuffer";

export class AnalyticsRecorder {
  readonly buffer = new TelemetryBuffer();
  readonly metrics = new MetricsRegistry();
  readonly shots = new ShotTelemetry();
  private subscriptions: Array<() => void> = [];
  private rallyHits: Record<Side, number> = { home: 0, away: 0 };

  constructor(events: EventBus) {
    this.subscriptions.push(
      events.on("simulation:step", ({ tick, dt }) => {
        this.buffer.push("simulation", "step", tick, { dt });
        this.metrics.sample("simulation.dt", dt);
      }),
      events.on("physics:contact", (contact) => {
        this.buffer.push("physics", contact.kind, contact.tick, {
          speed: contact.relativeSpeed,
          penetration: contact.penetration
        });
        this.metrics.sample("contact." + contact.kind + ".speed", contact.relativeSpeed);
      }),
      events.on("shot:hit", (shot) => {
        const spinRate = Math.sqrt(shot.spin.x ** 2 + shot.spin.y ** 2 + shot.spin.z ** 2);
        this.rallyHits[shot.side] += 1;
        this.buffer.push("shot", shot.kind, 0, { side: shot.side, speed: shot.speed, spinRate });
        this.metrics.sample("shot.speed", shot.speed);
        this.metrics.sample("shot.spinRate", spinRate);
      }),
      events.on("rally:start", () => {
        this.rallyHits = { home: 0, away: 0 };
      }),
      events.on("rally:end", ({ winner }) => {
        this.buffer.push("rally", "end", 0, { winner, homeHits: this.rallyHits.home, awayHits: this.rallyHits.away });
        this.metrics.sample("rally.length", this.rallyHits.home + this.rallyHits.away);
      })
    );
  }

  snapshot(): {
    telemetry: ReturnType<TelemetryBuffer["export"]>;
    metrics: ReturnType<MetricsRegistry["summary"]>;
  } {
    return { telemetry: this.buffer.export(), metrics: this.metrics.summary() };
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription());
    this.subscriptions.length = 0;
    this.buffer.clear();
    this.metrics.clear();
    this.shots.clear();
  }
}