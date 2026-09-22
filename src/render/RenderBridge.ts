import { BallVisual } from "./Ball";
import { CameraRig } from "./CameraRig";
import { ArenaVisual } from "./Arena";
import { GameRenderer } from "./Renderer";
import { ArenaLighting } from "./Lighting";
import { PaddleVisual } from "./Paddle";
import { TableVisual } from "./Table";
import { createMaterialPalette } from "./ProceduralMaterials";
import { EnvironmentDetail } from "./EnvironmentDetail";
import { PlayerVisual } from "./Player";
import type { GameSimulation } from "../game/GameSimulation";

export class RenderBridge {
  readonly renderer: GameRenderer;
  readonly camera: CameraRig;
  readonly table: TableVisual;
  readonly arena: ArenaVisual;
  readonly lighting: ArenaLighting;
  readonly ball: BallVisual;
  readonly paddles: Record<"home" | "away", PaddleVisual>;
  readonly environment: EnvironmentDetail;
  readonly players: Record<"home" | "away", PlayerVisual>;
  private readonly materials = createMaterialPalette();

  constructor(private readonly simulation: GameSimulation) {
    this.renderer = new GameRenderer(simulation.config.graphics);
    this.camera = new CameraRig(this.renderer.camera);
    this.table = new TableVisual(this.materials);
    this.arena = new ArenaVisual(this.materials);
    this.lighting = new ArenaLighting(simulation.config.graphics.shadows, simulation.config.graphics.shadowMapSize);
    this.ball = new BallVisual(this.materials);
    this.environment = new EnvironmentDetail(this.materials, {
      banners: false, benches: false, plants: false, wallPanels: false
    });
    this.paddles = {
      home: new PaddleVisual("home", this.materials),
      away: new PaddleVisual("away", this.materials)
    };
    this.players = { home: new PlayerVisual("home"), away: new PlayerVisual("away") };
    this.renderer.add(this.arena.group);
    this.renderer.add(this.environment.group);
    this.renderer.add(this.table.group);
    this.renderer.add(this.lighting.group);
    this.renderer.add(this.ball.group);
    this.renderer.add(this.paddles.home.group);
    this.renderer.add(this.paddles.away.group);
    this.renderer.add(this.players.home.group);
    this.renderer.add(this.players.away.group);
  }

  mount(container: HTMLElement): void {
    this.renderer.mount(container);
  }

  update(dt: number, alpha: number): void {
    const state = this.simulation.world.state;
    this.ball.sync(state.ball, alpha, dt, this.simulation.config.graphics.showTrails);
    this.paddles.home.sync(state.paddles.home, alpha);
    this.paddles.away.sync(state.paddles.away, alpha);
    this.players.home.sync(state.players.home, state.paddles.home, alpha, state.time);
    this.players.away.sync(state.players.away, state.paddles.away, alpha, state.time);
    this.table.updateNet(this.simulation.world.net.positions());
    const score = this.simulation.match.scoreboard;
    this.arena.updateScore(score.points.home, score.points.away, score.games.home, score.games.away);
    this.renderer.renderer.toneMappingExposure = this.simulation.config.graphics.toneMappingExposure;
    this.camera.update(dt, state.ball, this.simulation.config.graphics.reducedMotion);
    this.renderer.render();
  }

  setCameraMode(mode: "competitive" | "broadcast" | "ball" | "free"): void {
    this.camera.setMode(mode);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
