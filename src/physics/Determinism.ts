import { Random } from "../core/Random";
import type { WorldSnapshot } from "../core/types";
import type { WorldState } from "./State";

export interface DeterminismDigest {
  tick: number;
  position: string;
  velocity: string;
  angularVelocity: string;
  scoreKey?: string;
}

export function digestWorld(world: WorldState): DeterminismDigest {
  const ball = world.ball;
  const quantize = (value: number) => Math.round(value * 1000000) / 1000000;
  const key = (vector: { x: number; y: number; z: number }) =>
    [quantize(vector.x), quantize(vector.y), quantize(vector.z)].join(",");
  return {
    tick: world.tick,
    position: key(ball.position),
    velocity: key(ball.velocity),
    angularVelocity: key(ball.angularVelocity)
  };
}

export function digestSnapshot(snapshot: WorldSnapshot): DeterminismDigest {
  const quantize = (value: number) => Math.round(value * 1000000) / 1000000;
  const key = (vector: { x: number; y: number; z: number }) =>
    [quantize(vector.x), quantize(vector.y), quantize(vector.z)].join(",");
  return {
    tick: snapshot.tick,
    position: key(snapshot.ball.position),
    velocity: key(snapshot.ball.velocity),
    angularVelocity: key(snapshot.ball.angularVelocity)
  };
}

export function runDeterministic(seed: number, steps: number, action: (random: Random, step: number) => WorldSnapshot): WorldSnapshot[] {
  const random = new Random(seed);
  const snapshots: WorldSnapshot[] = [];
  for (let step = 0; step < steps; step += 1) snapshots.push(action(random, step));
  return snapshots;
}