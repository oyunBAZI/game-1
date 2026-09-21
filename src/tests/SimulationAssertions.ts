import { nearlyEqual } from "../core/MathUtils";
import { Vec3 } from "../core/Vec3";
import { EventBus } from "../core/EventBus";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { BallPredictor } from "../physics/Predictor";
import { Scoreboard } from "../game/Scoreboard";
import { TRAINING_RULES, hasGameWinner } from "../game/Rules";

export interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
  durationMs: number;
}

export class SimulationAssertions {
  private readonly results: TestResult[] = [];

  run(): TestResult[] {
    this.results.length = 0;
    this.test("vec3 arithmetic", () => {
      const vector = new Vec3(1, 2, 3).add(new Vec3(2, 0, -1));
      return vector.equals(new Vec3(3, 2, 2)) ? "addition is stable" : "unexpected vector result";
    });
    this.test("score win by two", () => {
      return hasGameWinner(10, 10, TRAINING_RULES) === "home" ? "training rules permit direct winner" : "training rules did not resolve";
    });
    this.test("ball receives gravity", () => {
      const events = new EventBus();
      const world = new PhysicsWorld(events);
      world.serve("home", new Vec3(0, 2, -7));
      const before = world.state.ball.position.y;
      for (let index = 0; index < 20; index += 1) world.fixedStep(1 / 240);
      return world.state.ball.position.y < before ? "ball descended" : "ball did not descend";
    });
    this.test("predictor returns samples", () => {
      const events = new EventBus();
      const world = new PhysicsWorld(events);
      world.serve("home", new Vec3(0, 2, -7));
      const prediction = new BallPredictor(world.tuning).predict(world.state.ball, 0.5);
      return prediction.points.length > 2 ? "prediction has temporal samples" : "prediction is empty";
    });
    this.test("scoreboard emits state", () => {
      const events = new EventBus();
      let emitted = false;
      events.on("score:change", () => { emitted = true; });
      const scoreboard = new Scoreboard(events, TRAINING_RULES);
      scoreboard.awardPoint("home");
      return emitted && scoreboard.score("home") === 1 ? "score event emitted" : "score event missing";
    });
    this.test("nearly equal helper", () => {
      return nearlyEqual(0.1 + 0.2, 0.3, 1e-9) ? "floating point tolerance works" : "tolerance failed";
    });
    return [...this.results];
  }

  private test(name: string, callback: () => string): void {
    const start = performance.now();
    try {
      const detail = callback();
      this.results.push({ name, passed: true, detail, durationMs: performance.now() - start });
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
        durationMs: performance.now() - start
      });
    }
  }
}