import { Vec3 } from "../core/Vec3";
import { EventBus } from "../core/EventBus";
import { TABLE } from "./constants";
import type { PhysicsTuning } from "./constants";
import type { BallState } from "./State";
import { PhysicsWorld } from "./PhysicsWorld";

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
  private readonly world: PhysicsWorld;

  constructor(private readonly tuning: PhysicsTuning) {
    this.world = new PhysicsWorld(new EventBus(1), tuning);
    this.world.state.paddles.home.active = false;
    this.world.state.paddles.away.active = false;
  }

  predict(ball: BallState, duration = 2.5, step = 1 / 120): LandingPrediction {
    this.world.reset();
    this.world.state.ball = ball.clone();
    const sim = this.world.state.ball;
    const points: PredictionPoint[] = [];
    let crossedNet = false;
    let bounces = 0;
    let landing: PredictionPoint | null = null;
    points.push({ time: 0, position: sim.position.clone(), velocity: sim.velocity.clone(), bounced: false, crossedNet });
    for (let time = 0; time < duration; time += step) {
      const beforeZ = sim.position.z;
      const result = this.world.fixedStep(Math.min(step, duration - time));
      const bounced = result.contacts.some((contact) => contact.kind === "table" || (contact.kind === "edge" && contact.normal.y > 0));
      if (beforeZ * sim.position.z <= 0 && sim.position.y > TABLE.top + TABLE.netHeight) crossedNet = true;
      const point = {
        time: Math.min(duration, time + step),
        position: sim.position.clone(),
        velocity: sim.velocity.clone(),
        bounced,
        crossedNet
      };
      points.push(point);
      if (bounced) {
        bounces += 1;
        landing = point;
        if (bounces >= 3) break;
      }
      if (result.ballOut) break;
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
