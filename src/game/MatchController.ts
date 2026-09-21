import { EventBus } from "../core/EventBus";
import { StateMachine } from "../core/StateMachine";
import type { GameMode, GamePhase, Side } from "../core/types";
import type { RuleSet } from "./Rules";
import { serviceOwnerForPoint, TRAINING_RULES } from "./Rules";
import { Scoreboard } from "./Scoreboard";
import { RallyController } from "./RallyController";
import { ServeController, type ServeStyle } from "./ServeController";
import type { PhysicsWorld } from "../physics/PhysicsWorld";

interface MatchContext {
  mode: GameMode;
  phase: GamePhase;
  selectedServe: ServeStyle;
}

export class MatchController {
  readonly scoreboard: Scoreboard;
  readonly rally: RallyController;
  readonly serve: ServeController;
  private readonly machine: StateMachine<MatchContext>;
  private readonly rules: RuleSet;
  private initialServer: Side = "home";
  private nextServer: Side = "home";
  private pointDelay = 0;

  constructor(
    private readonly events: EventBus,
    private readonly world: PhysicsWorld,
    rules: RuleSet = TRAINING_RULES,
    mode: GameMode = "practice"
  ) {
    this.rules = rules;
    this.scoreboard = new Scoreboard(events, rules);
    this.rally = new RallyController(events, world, this.scoreboard);
    this.serve = new ServeController(events, world, rules);
    const context: MatchContext = { mode, phase: "boot", selectedServe: "pendulum" };
    this.machine = new StateMachine(context);
    this.machine.addMany([
      { name: "boot", enter: () => this.emitPhase("boot", "menu") },
      { name: "menu", enter: () => this.emitPhase("menu", "menu") },
      { name: "serve", enter: () => this.emitPhase("serve", "serve") },
      { name: "rally", enter: () => this.emitPhase("rally", "rally") },
      { name: "point", enter: () => this.emitPhase("point", "point") },
      { name: "paused", enter: () => this.emitPhase("paused", "paused") },
      { name: "finished", enter: () => this.emitPhase("finished", "finished") }
    ]);
    this.machine.start("boot");
    this.events.on("rally:end", ({ winner }) => this.onRallyEnd(winner));
  }

  start(server: Side = "home"): void {
    this.scoreboard.resetMatch();
    this.initialServer = server;
    this.nextServer = server;
    this.pointDelay = 0;
    this.machine.transitionTo("serve");
  }

  update(dt: number): void {
    if (this.machine.current === "serve") {
      this.serve.update(dt);
      if (!this.serve.isServing() && this.serve.isActive()) this.machine.transitionTo("rally");
    }
    if (this.machine.current === "point") {
      this.pointDelay -= dt;
      if (this.pointDelay <= 0) {
        if (this.scoreboard.matchWinner) this.machine.transitionTo("finished");
        else this.machine.transitionTo("serve");
      }
    }
  }

  pause(): void {
    if (this.machine.current !== "paused") this.machine.transitionTo("paused");
  }

  resume(): void {
    if (this.machine.current === "paused") this.machine.transitionTo(this.rally.state.active ? "rally" : "serve");
  }

  setServeStyle(style: ServeStyle): void {
    this.machineContext().selectedServe = style;
  }

  serveNow(): boolean {
    if (this.machine.current !== "serve") return false;
    const plan = this.serve.begin(this.nextServer, this.machineContext().selectedServe);
    if (!plan.legal) return false;
    return true;
  }

  phase(): GamePhase {
    return this.machine.current as GamePhase;
  }

  currentServer(): Side {
    return this.nextServer;
  }

  ruleset(): RuleSet {
    return this.rules;
  }

  private onRallyEnd(winner: Side): void {
    if (this.machine.current !== "rally" && this.machine.current !== "serve") return;
    this.nextServer = serviceOwnerForPoint(
      this.initialServer,
      this.scoreboard.pointsPlayed,
      this.scoreboard.points.home,
      this.scoreboard.points.away,
      this.rules
    );
    this.pointDelay = 1.25;
    this.machine.transitionTo("point");
    if (this.scoreboard.matchWinner) this.machine.transitionTo("finished");
    this.serve.finishPoint();
  }

  private emitPhase(from: GamePhase, to: GamePhase): void {
    const current = this.machine?.current ?? from;
    this.events.emit("match:phase", { from: current, to });
  }

  private machineContext(): MatchContext {
    return (this.machine as any).context as MatchContext;
  }

  dispose(): void {
    this.rally.dispose();
  }
}