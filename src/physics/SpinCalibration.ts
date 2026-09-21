import { Vec3 } from "../core/Vec3";
import { average, clamp } from "../core/MathUtils";
import type { PhysicsTuning } from "./constants";
import { Aerodynamics } from "./Aerodynamics";
import { BallState } from "./State";

export interface CalibrationSample {
  height: number;
  incomingSpeed: number;
  outgoingSpeed: number;
  incomingSpin: Vec3;
  outgoingSpin: Vec3;
  timeToBounce: number;
}

export interface CalibrationReport {
  restitutionEstimate: number;
  frictionEstimate: number;
  magnusScale: number;
  angularDampingEstimate: number;
  sampleCount: number;
  warnings: string[];
}

export class SpinCalibration {
  private samples: CalibrationSample[] = [];

  record(sample: CalibrationSample): void {
    this.samples.push({ ...sample, incomingSpin: sample.incomingSpin.clone(), outgoingSpin: sample.outgoingSpin.clone() });
    if (this.samples.length > 500) this.samples.shift();
  }

  estimate(): CalibrationReport {
    const warnings: string[] = [];
    if (this.samples.length < 3) warnings.push("At least three repeatable impacts are recommended.");
    const restitutions = this.samples
      .filter((sample) => sample.incomingSpeed > 0)
      .map((sample) => clamp(sample.outgoingSpeed / sample.incomingSpeed, 0, 1.5));
    const frictionSamples = this.samples.map((sample) => {
      const incoming = sample.incomingSpin.length();
      const outgoing = sample.outgoingSpin.length();
      return incoming > 0 ? clamp(1 - outgoing / incoming, 0, 1) : 0;
    });
    const magnusSamples = this.samples.map((sample) => {
      const lateral = Math.abs(sample.outgoingSpin.y - sample.incomingSpin.y);
      return lateral / Math.max(0.001, sample.incomingSpeed * sample.timeToBounce);
    });
    const dampingSamples = this.samples.map((sample) => {
      const before = sample.incomingSpin.length();
      const after = sample.outgoingSpin.length();
      return before > 0 ? clamp(1 - after / before, 0, 1) : 0;
    });
    return {
      restitutionEstimate: restitutions.length ? average(restitutions) : 0,
      frictionEstimate: frictionSamples.length ? average(frictionSamples) : 0,
      magnusScale: magnusSamples.length ? average(magnusSamples) : 0,
      angularDampingEstimate: dampingSamples.length ? average(dampingSamples) : 0,
      sampleCount: this.samples.length,
      warnings
    };
  }

  simulateDrop(tuning: PhysicsTuning, height: number, spin = new Vec3()): CalibrationSample {
    const ball = new BallState().reset(new Vec3(0, tuning.table.restitution + height + 0.76, 0), new Vec3(0, 0, 0));
    ball.angularVelocity.copy(spin);
    const aero = new Aerodynamics(tuning);
    let elapsed = 0;
    let previousY = ball.position.y;
    while (elapsed < 3) {
      ball.beginStep();
      aero.apply(ball, 1 / 240);
      ball.velocity.addScaled(ball.force, (1 / 240) / ball.mass);
      ball.position.addScaled(ball.velocity, 1 / 240);
      if (previousY > tuning.table.restitution + 0.76 && ball.position.y <= tuning.table.restitution + 0.76) break;
      previousY = ball.position.y;
      elapsed += 1 / 240;
    }
    return {
      height,
      incomingSpeed: Math.abs(ball.velocity.y),
      outgoingSpeed: Math.abs(ball.velocity.y) * tuning.table.restitution,
      incomingSpin: spin.clone(),
      outgoingSpin: ball.angularVelocity.clone(),
      timeToBounce: elapsed
    };
  }

  clear(): void {
    this.samples.length = 0;
  }
}