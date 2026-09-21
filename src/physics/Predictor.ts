import { Vec3 } from "../core/Vec3";
import { TABLE } from "./constants";
import type { PhysicsTuning } from "./constants";
import { Aerodynamics } from "./Aerodynamics";
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
  private readonly aero: Aerodynamics;

  constructor(private readonly tuning: PhysicsTuning) {
    this.aero = new Aerodynamics(tuning);
  }

  predict(ball: BallState, duration = 2.5, step = 1 / 120): LandingPrediction {
    const sim = ball.clone();
    const points: PredictionPoint[] = [];
    let crossedNet = false;
    let bounces = 0;
    let landing: PredictionPoint | null = null;
    for (let time = 0; time <= duration; time += step) {
      points.push({
        time,
        position: sim.position.clone(),
        velocity: sim.velocity.clone(),
        bounced: false,
        crossedNet
      });
      if (!crossedNet && Math.abs(sim.position.z) <= 0.02) crossedNet = true;
      const previousY = sim.position.y;
      sim.beginStep();
      this.aero.apply(sim, step);
      const acceleration = sim.force.clone().divideScalar(sim.mass);
      sim.velocity.addScaled(acceleration, step);
      sim.position.addScaled(sim.velocity, step);
      if (previousY > TABLE.top + sim.radius && sim.position.y <= TABLE.top + sim.radius && Math.abs(sim.position.x) <= TABLE.width / 2 && Math.abs(sim.position.z) <= TABLE.length / 2) {
        sim.position.y = TABLE.top + sim.radius;
        sim.velocity.y = Math.abs(sim.velocity.y) * this.tuning.table.restitution;
        sim.velocity.x *= 1 - this.tuning.table.friction * 0.2;
        sim.velocity.z *= 1 - this.tuning.table.friction * 0.2;
        bounces += 1;
        const point = points[points.length - 1];
        point.bounced = true;
        landing = { ...point, position: sim.position.clone(), velocity: sim.velocity.clone() };
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