import { EventBus } from "../core/EventBus";
import { FixedStepLoop } from "../core/FixedStepLoop";
import { Logger } from "../core/Logger";
import { createDefaultConfig } from "../config/GameConfig";
import { GameSimulation } from "../game/GameSimulation";
import { InputManager } from "../input/InputManager";
import { AudioBus } from "../audio/AudioBus";
import { RenderBridge } from "../render/RenderBridge";
import { applyGlobalUiStyles } from "../ui/UiTheme";
import { GameHud } from "../ui/Hud";
import { MenuController } from "../ui/MenuController";
import { SettingsPanel } from "../ui/SettingsPanel";
import { DebugOverlay } from "../debug/DebugOverlay";
import { Profiler } from "../debug/Profiler";

export class GameApp {
  readonly events = new EventBus(1024);
  readonly logger = new Logger("app");
  readonly config = createDefaultConfig();
  readonly simulation = new GameSimulation(this.config, this.events);
  readonly input: InputManager;
  readonly renderer: RenderBridge;
  readonly loop: FixedStepLoop;
  readonly audio: AudioBus;
  readonly hud: GameHud;
  readonly menu: MenuController;
  readonly settings: SettingsPanel;
  readonly profiler = new Profiler();
  readonly debug: DebugOverlay;
  private lastFrame = performance.now();
  private fps = 60;
  private cameraIndex = 0;
  private inputRaf = 0;
  private disposed = false;

  constructor(private readonly root: HTMLElement) {
    applyGlobalUiStyles();
    this.input = new InputManager(root, this.events);
    this.renderer = new RenderBridge(this.simulation);
    this.renderer.mount(root);
    this.loop = new FixedStepLoop(this.events, this.config.physics.fixedHz);
    this.loop.add(this.simulation);
    this.audio = new AudioBus(this.events);
    this.hud = new GameHud(root, this.simulation, this.events);
    this.menu = new MenuController(root, this.simulation, this.events);
    this.settings = new SettingsPanel(root, this.config, this.events);
    this.debug = new DebugOverlay(root, this.simulation, this.profiler);
    this.events.on("input:frame", (input) => {
      if (input.pause && this.simulation.isRunning()) {
        this.menu.toggle();
        if (this.menu.isVisible()) this.simulation.match.pause();
        else this.simulation.match.resume();
      }
      if (input.cameraMode) this.cycleCamera();
    });
    this.events.on("match:phase", ({ to }) => {
      if (to === "finished") this.menu.show();
    });
    root.addEventListener("pointerdown", () => this.audio.unlock(), { once: true });
    this.logger.info("Game application constructed");
  }

  start(): void {
    this.loop.onFrame((dt, alpha) => {
      this.profiler.time("render", () => this.renderer.update(dt, alpha));
      this.hud.update(dt);
      this.debug.update(this.fps);
    });
    this.loop.start();
    this.animate();
  }

  private animate = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.fps = this.fps * 0.92 + (1 / dt) * 0.08;
    const input = this.input.sample(now / 1000);
    this.simulation.setInput(input);
    this.inputRaf = requestAnimationFrame(this.animate);
  };

  private cycleCamera(): void {
    this.cameraIndex = (this.cameraIndex + 1) % 3;
    const modes = ["competitive", "broadcast", "ball"] as const;
    this.renderer.setCameraMode(modes[this.cameraIndex]);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.inputRaf);
    this.loop.dispose();
    this.input.dispose();
    this.hud.dispose();
    this.menu.dispose();
    this.settings.dispose();
    this.debug.dispose();
    this.renderer.dispose();
    this.audio.dispose();
    this.simulation.stop();
  }
}
