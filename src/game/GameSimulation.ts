import { EventBus } from "../core/EventBus";
import type { FixedStepParticipant } from "../core/FixedStepLoop";
import { Vec3 } from "../core/Vec3";
import type { InputFrame, Side, WorldSnapshot } from "../core/types";
import { createDefaultConfig, type GameConfig } from "../config/GameConfig";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { AIBrain } from "./AIBrain";
import { MatchController } from "./MatchController";
import { PlayerController } from "./PlayerController";
import { COMPETITION_RULES, TRAINING_RULES } from "./Rules";
import { MatchStats } from "./MatchStats";

export class GameSimulation implements FixedStepParticipant {
  readonly events: EventBus;
  readonly world: PhysicsWorld;
  readonly match: MatchController;
  readonly stats: MatchStats;
  readonly playerController: PlayerController;
  readonly ai: AIBrain;
  readonly config: GameConfig;
  private input: InputFrame = this.emptyInput();
  private running = false;
  private pendingServe = false;

  constructor(config: Partial<GameConfig> = {}, events = new EventBus(512)) {
    this.config = { ...createDefaultConfig(), ...config, physics: { ...createDefaultConfig().physics, ...config.physics } };
    this.events = events;
    this.world = new PhysicsWorld(this.events, {
      gravity: this.config.physics.gravity,
      airDensity: this.config.physics.airDensity,
      dragCoefficient: this.config.physics.dragCoefficient,
      magnusCoefficient: this.config.physics.magnusCoefficient,
      angularDrag: this.config.physics.angularDrag,
      table: this.config.physics.table,
      rubber: this.config.physics.rubbers.balanced
    });
    const rules = this.config.mode === "match" ? COMPETITION_RULES : TRAINING_RULES;
    this.match = new MatchController(this.events, this.world, rules, this.config.mode);
    this.stats = new MatchStats();
    this.playerController = new PlayerController(
      "home",
      this.world.state.players.home,
      this.world.state.paddles.home,
      this.world.paddles
    );
    this.ai = new AIBrain("away", this.config.difficulty, this.world.tuning);
    this.events.on("shot:hit", (event) => {
      this.stats.recordShot(event.side, event.kind, event.speed, Math.sqrt(event.spin.x ** 2 + event.spin.y ** 2 + event.spin.z ** 2));
    });
    this.events.on("rally:end", ({ winner, reason }) => {
      this.stats.recordPoint(winner);
      if (reason.includes("out") || reason.includes("floor") || reason.includes("net")) {
        this.stats.recordError(winner === "home" ? "away" : "home", reason);
      }
    });
  }

  start(): void {
    if (this.running && this.match.phase() === "paused") {
      this.match.resume();
      return;
    }
    if (this.running && this.match.phase() !== "finished") return;
    this.restart();
  }

  restart(): void {
    this.running = true;
    this.pendingServe = false;
    this.world.reset();
    this.ai.reset();
    this.match.start("home");
  }

  setInput(input: InputFrame): void {
    this.input = { ...input };
    this.pendingServe ||= input.serve;
    this.playerController.setInput(this.input);
  }

  fixedUpdate(dt: number, tick: number): void {
    if (!this.running) return;
    if (this.match.phase() === "paused" || this.match.phase() === "finished") return;
    this.match.update(dt);
    if (this.match.phase() === "serve" && this.match.currentServer() === "home" && this.pendingServe) {
      this.match.serveNow();
      this.pendingServe = false;
    }
    const simulateBall = this.match.phase() === "rally";
    const result = this.world.fixedStep(dt, () => {
      this.playerController.update(dt);
      this.world.setDesiredSpin("home", this.playerController.desiredSpin());
      const aiAction = this.ai.update(dt, this.world.state.ball, this.world.state.players.away, this.world.state.paddles.away);
      this.world.state.players.away.velocity.copy(aiAction.move).multiplyScalar(this.config.difficulty.movementSpeed);
      const paddle = this.world.state.paddles.away;
      const rally = this.match.rally.state;
      paddle.active = rally.active && rally.serveStage === "complete" &&
        rally.expectedBounce === "away" && rally.bouncesOnExpected > 0;
      this.world.paddles.placeForInput(paddle, aiAction.paddleTarget, aiAction.paddleNormal, dt, 4 + this.config.difficulty.movementSpeed);
      paddle.swingVelocity.copy(aiAction.paddleNormal).multiplyScalar(aiAction.swing * 3.5);
      this.world.setDesiredSpin("away", aiAction.spin);
    }, simulateBall);
    if (result.ballOut) {
      const lastSide = this.world.state.ball.lastContactSide ?? "home";
      this.events.emit("physics:out", { side: lastSide, reason: result.outReason ?? "out" });
    }
  }

  snapshot(): WorldSnapshot {
    return this.world.snapshot();
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  private emptyInput(): InputFrame {
    return {
      sequence: 0,
      time: 0,
      moveX: 0,
      moveY: 0,
      paddleX: 0,
      paddleY: 0,
      paddleZ: 0,
      swing: 0,
      spinX: 0,
      spinY: 0,
      spinZ: 0,
      serve: false,
      pause: false,
      cameraMode: 0
    };
  }
}
