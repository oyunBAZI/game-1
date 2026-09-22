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
  private selectedServe: ServeStyle = "flat";
  private phaseBeforePause: GamePhase = "serve";
  private gamesCompleted = 0;

  constructor(
    private readonly events: EventBus,
    private readonly world: PhysicsWorld,
    rules: RuleSet = TRAINING_RULES,
    mode: GameMode = "practice"
  ) {
    this.rules = rules;
    this.scoreboard = new Scoreboard(events, rules);
    this.rally = new RallyController(events, world, this.scoreboard, rules);
    this.serve = new ServeController(events, world, rules);
    const context: MatchContext = { mode, phase: "boot", selectedServe: "flat" };
    this.machine = new StateMachine(context);
    this.machine.addMany([
      ...(["boot", "menu", "serve", "rally", "point", "paused", "finished"] as GamePhase[])
        .map((phase) => ({ name: phase, enter: (_: MatchContext, previous: string | null) =>
          this.events.emit("match:phase", { from: (previous ?? "boot") as GamePhase, to: phase }) }))
    ]);
    this.machine.start("boot");
    this.events.on("rally:end", ({ winner }) => this.onRallyEnd(winner));
    this.events.on("rally:let", () => {
      if (this.phase() !== "rally") return;
      this.serve.replayLet();
      this.world.state.ball.reset();
      this.machine.transitionTo("serve");
      this.events.emit("ui:toast", { message: "LET — replay the serve", level: "info" });
    });
  }

  start(server: Side = "home"): void {
    this.rally.cancel();
    this.serve.replayLet();
    this.scoreboard.resetMatch();
    this.initialServer = server;
    this.nextServer = server;
    this.pointDelay = 0;
    this.gamesCompleted = 0;
    this.machine.transitionTo("serve");
  }

  update(dt: number): void {
    if (this.machine.current === "serve") {
      if (this.nextServer === "away" && !this.serve.isActive()) this.serveNow();
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
    if (this.machine.current !== "paused") {
      this.phaseBeforePause = this.phase();
      this.machine.transitionTo("paused");
    }
  }

  resume(): void {
    if (this.machine.current === "paused") this.machine.transitionTo(this.phaseBeforePause);
  }

  setServeStyle(style: ServeStyle): void {
    this.selectedServe = style;
  }

  serveNow(): boolean {
    if (this.machine.current !== "serve") return false;
    if (this.serve.isActive()) return false;
    const plan = this.serve.begin(this.nextServer, this.selectedServe);
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
    if (this.scoreboard.gamesPlayed > this.gamesCompleted) {
      this.gamesCompleted = this.scoreboard.gamesPlayed;
      this.initialServer = this.initialServer === "home" ? "away" : "home";
    }
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

  dispose(): void {
    this.rally.dispose();
  }
}
