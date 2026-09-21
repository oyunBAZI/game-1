import { BallVisual } from "./Ball";
import { CameraRig } from "./CameraRig";
import { ArenaVisual } from "./Arena";
import { GameRenderer } from "./Renderer";
import { ArenaLighting } from "./Lighting";
import { PaddleVisual } from "./Paddle";
import { TableVisual } from "./Table";
import { createMaterialPalette } from "./ProceduralMaterials";
import { EnvironmentDetail } from "./EnvironmentDetail";
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
  private readonly materials = createMaterialPalette();

  constructor(private readonly simulation: GameSimulation) {
    this.renderer = new GameRenderer(simulation.config.graphics);
    this.camera = new CameraRig(this.renderer.camera);
    this.table = new TableVisual(this.materials);
    this.arena = new ArenaVisual(this.materials);
    this.lighting = new ArenaLighting(simulation.config.graphics.shadows);
    this.ball = new BallVisual(this.materials);
    this.environment = new EnvironmentDetail(this.materials);
    this.paddles = {
      home: new PaddleVisual("home", this.materials),
      away: new PaddleVisual("away", this.materials)
    };
    this.renderer.add(this.arena.group);
    this.renderer.add(this.environment.group);
    this.renderer.add(this.table.group);
    this.renderer.add(this.lighting.group);
    this.renderer.add(this.ball.group);
    this.renderer.add(this.paddles.home.group);
    this.renderer.add(this.paddles.away.group);
  }

  mount(container: HTMLElement): void {
    this.renderer.mount(container);
  }

  update(dt: number, alpha: number): void {
    this.ball.sync(this.simulation.world.state.ball, alpha, this.simulation.config.graphics.showTrails);
    this.paddles.home.sync(this.simulation.world.state.paddles.home, alpha);
    this.paddles.away.sync(this.simulation.world.state.paddles.away, alpha);
    this.camera.update(dt, this.simulation.world.state.ball);
    this.renderer.render();
  }

  setCameraMode(mode: "competitive" | "broadcast" | "ball" | "free"): void {
    this.camera.setMode(mode);
  }

  dispose(): void {
    this.ball.dispose();
    this.paddles.home.dispose();
    this.paddles.away.dispose();
    this.table.dispose();
    this.renderer.dispose();
  }
}