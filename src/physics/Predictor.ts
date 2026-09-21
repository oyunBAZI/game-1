import { Vec3 } from "../core/Vec3";
import { TABLE, type PhysicsTuning } from "./constants";
import { BallIntegrator } from "./Integrator";
import { TableCollider } from "./TableCollider";
import { NetCollider } from "./NetCollider";
import { resolveNetContact, resolveTableBounce } from "./ContactModels";
import type { BallState } from "./State";

export interface PredictionPoint {
  time: number;
  position: Vec3;
  velocity: Vec3;
  bounced: boolean;
  crossedNet: boolean;
}

export interface LandingPrediction {
  valid: boolean;
  time: number;
  position: Vec3;
  side: "home" | "away" | "out";
  bounces: number;
  points: PredictionPoint[];
}

export class BallPredictor {
  private readonly integrator: BallIntegrator;
  private readonly table = new TableCollider();
  private readonly net = new NetCollider();

  constructor(private readonly tuning: PhysicsTuning) {
    this.integrator = new BallIntegrator(tuning);
  }

  predict(ball: BallState, duration = 2.5, step = 1 / 120): LandingPrediction {
    const sim = ball.clone();
    const points: PredictionPoint[] = [];
    let crossedNet = false;
    let bounces = 0;
    let landing: PredictionPoint | null = null;
    const fixedStep = Math.min(Math.max(step, 1 / 480), 1 / 120);
    for (let time = 0; time <= duration; time += fixedStep) {
      points.push({
        time,
        position: sim.position.clone(),
        velocity: sim.velocity.clone(),
        bounced: false,
        crossedNet
      });
      const previousZ = sim.position.z;
      const collision = this.advance(sim, fixedStep);
      if (!crossedNet && previousZ * sim.position.z <= 0 && collision !== "net") crossedNet = true;
      if (collision === "table" || collision === "edge") {
        bounces += 1;
        const point = points[points.length - 1];
        point.bounced = true;
        landing ??= { ...point, time: time + fixedStep, position: sim.position.clone(), velocity: sim.velocity.clone() };
        if (bounces >= 2) break;
      }
      if (sim.position.y < -0.2 || Math.abs(sim.position.x) > 3 || Math.abs(sim.position.z) > 4) break;
    }
    const final = landing ?? points[points.length - 1];
    const valid = Boolean(landing && Math.abs(landing.position.x) <= TABLE.width / 2 && Math.abs(landing.position.z) <= TABLE.length / 2);
    return {
      valid,
      time: final?.time ?? 0,
      position: final?.position.clone() ?? ball.position.clone(),
      side: valid ? (final.position.z >= 0 ? "home" : "away") : "out",
      bounces,
      points
    };
  }

  private advance(ball: BallState, dt: number): "table" | "edge" | "net" | null {
    let remaining = dt;
    let first: "table" | "edge" | "net" | null = null;
    for (let attempt = 0; attempt < 3 && remaining > 1e-7; attempt += 1) {
      const start = ball.position.clone();
      const velocity = ball.velocity.clone();
      const spin = ball.angularVelocity.clone();
      ball.previousPosition.copy(start);
      ball.force.set(0, 0, 0);
      ball.torque.set(0, 0, 0);
      this.integrator.integrate(ball, remaining);
      const table = this.table.detect(ball);
      const net = this.net.detect(ball);
      const tableFirst = table && (!net || table.contact.timeOfImpact <= net.timeOfImpact);
      const contact = tableFirst ? table!.contact : net;
      if (!contact) break;
      const elapsed = remaining * contact.timeOfImpact;
      ball.position.copy(start);
      ball.velocity.copy(velocity);
      ball.angularVelocity.copy(spin);
      ball.force.set(0, 0, 0);
      ball.torque.set(0, 0, 0);
      if (elapsed > 0) this.integrator.integrate(ball, elapsed);
      const normal = Vec3.from(contact.normal);
      const kind = tableFirst ? (table!.surface === "edge" ? "edge" : "table") : "net";
      if (tableFirst) resolveTableBounce(ball, normal, kind === "edge"
        ? { ...this.tuning.table, restitution: this.tuning.table.edgeRestitution }
        : this.tuning.table);
      else resolveNetContact(ball, normal, this.tuning.netRestitution);
      ball.position.copy(contact.point).addScaled(normal, ball.radius + 0.0005);
      first ??= kind;
      remaining -= Math.max(elapsed, 1e-7);
      // A collision at the start of the following segment can only be the
      // same surface. Leave that surface before another prediction sample.
      if (elapsed < 1e-7) break;
    }
    return first;
  }

  interceptTime(ball: BallState, targetZ: number, maxTime = 2): number | null {
    let time = 0;
    const position = ball.position.clone();
    const velocity = ball.velocity.clone();
    while (time < maxTime) {
      if ((position.z - targetZ) * (position.z + velocity.z * (1 / 240) - targetZ) <= 0) return time;
      position.addScaled(velocity, 1 / 240);
      velocity.y += this.tuning.gravity / 240;
      time += 1 / 240;
    }
    return null;
  }
}
