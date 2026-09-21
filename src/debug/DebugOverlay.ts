import type { GameSimulation } from "../game/GameSimulation";
import type { Profiler } from "./Profiler";
import { UI_THEME } from "../ui/UiTheme";

export class DebugOverlay {
  readonly root: HTMLDivElement;
  private visible = false;
  private readonly content: HTMLPreElement;

  constructor(container: HTMLElement, private readonly simulation: GameSimulation, private readonly profiler: Profiler) {
    this.root = document.createElement("div");
    this.root.dataset.gameUi = "debug";
    this.root.style.cssText = "position:absolute;left:22px;top:90px;display:none;padding:12px;min-width:280px;pointer-events:none;";
    this.root.className = "ttu-panel";
    this.content = document.createElement("pre");
    this.content.style.cssText = "margin:0;font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:" + UI_THEME.muted + ";";
    this.root.appendChild(this.content);
    container.appendChild(this.root);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? "block" : "none";
  }

  update(fps: number): void {
    if (!this.visible) return;
    const ball = this.simulation.world.state.ball;
    const perf = this.profiler.latest();
    this.content.textContent = [
      "DEBUG TELEMETRY",
      "───────────────",
      "tick       " + this.simulation.world.state.tick,
      "time       " + this.simulation.world.state.time.toFixed(2),
      "fps        " + fps.toFixed(1),
      "ball       " + ball.position.toArray().map((value) => value.toFixed(3)).join(" / "),
      "velocity   " + ball.velocity.length().toFixed(2) + " m/s",
      "spin       " + ball.spinRate().toFixed(1) + " rad/s",
      "contact    " + (ball.lastContact ?? "none"),
      "physics    " + (perf.physics ?? 0).toFixed(3) + " ms",
      "render     " + (perf.render ?? 0).toFixed(3) + " ms"
    ].join("\n");
  }

  dispose(): void {
    this.root.remove();
  }
}