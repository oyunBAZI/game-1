import type { EventBus } from "../core/EventBus";
import type { GameSimulation } from "../game/GameSimulation";
import { UI_THEME } from "./UiTheme";

export class GameHud {
  readonly root: HTMLDivElement;
  private readonly scoreHome: HTMLSpanElement;
  private readonly scoreAway: HTMLSpanElement;
  private readonly phase: HTMLSpanElement;
  private readonly speed: HTMLSpanElement;
  private readonly spin: HTMLSpanElement;
  private readonly toast: HTMLDivElement;
  private toastTimer = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly simulation: GameSimulation,
    events: EventBus
  ) {
    this.root = document.createElement("div");
    this.root.dataset.gameUi = "hud";
    this.root.style.cssText = "position:absolute;inset:0;padding:22px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none;";
    const top = document.createElement("div");
    top.style.cssText = "display:flex;justify-content:space-between;align-items:flex-start;gap:16px;";
    const score = document.createElement("div");
    score.className = "ttu-panel";
    score.style.cssText = "padding:14px 18px;min-width:230px;display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;";
    this.scoreHome = this.text("0", "font-size:32px;font-weight:750;text-align:center;");
    this.scoreAway = this.text("0", "font-size:32px;font-weight:750;text-align:center;");
    const divider = this.text("—", "color:" + UI_THEME.muted + ";");
    score.append(this.labeled("HOME", this.scoreHome), divider, this.labeled("AWAY", this.scoreAway));
    const status = document.createElement("div");
    status.className = "ttu-panel";
    status.style.cssText = "padding:12px 15px;display:flex;align-items:center;gap:12px;";
    this.phase = this.text("READY", "font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:" + UI_THEME.accentStrong + ";");
    status.append(this.phase);
    top.append(score, status);
    const bottom = document.createElement("div");
    bottom.style.cssText = "display:flex;justify-content:space-between;align-items:flex-end;gap:12px;";
    const telemetry = document.createElement("div");
    telemetry.className = "ttu-panel";
    telemetry.style.cssText = "padding:10px 13px;display:flex;gap:12px;font-size:12px;color:" + UI_THEME.muted + ";";
    this.speed = this.text("0.0 m/s");
    this.spin = this.text("0 rpm");
    telemetry.append(this.speed, this.spin);
    const hint = document.createElement("div");
    hint.className = "ttu-chip";
    hint.textContent = "WASD move · mouse aim · SPACE swing · ENTER serve";
    bottom.append(telemetry, hint);
    this.toast = document.createElement("div");
    this.toast.className = "ttu-panel";
    this.toast.style.cssText = "position:absolute;left:50%;top:26%;transform:translate(-50%,-50%);padding:12px 18px;opacity:0;transition:opacity .2s;color:" + UI_THEME.accentStrong + ";";
    this.root.append(top, bottom, this.toast);
    container.appendChild(this.root);
    events.on("score:change", (scoreState) => {
      this.scoreHome.textContent = String(scoreState.home);
      this.scoreAway.textContent = String(scoreState.away);
    });
    events.on("match:phase", ({ to }) => {
      this.phase.textContent = to.toUpperCase();
    });
    events.on("ui:toast", ({ message, level }) => this.showToast(message, level));
  }

  update(dt: number): void {
    const ball = this.simulation.world.state.ball;
    this.speed.textContent = ball.speed().toFixed(1) + " m/s";
    this.spin.textContent = Math.round(ball.spinRate() * 9.55) + " rpm";
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (this.toastTimer === 0) this.toast.style.opacity = "0";
  }

  showToast(message: string, level: "info" | "success" | "warning" | "error" = "info"): void {
    this.toast.textContent = message;
    this.toast.style.color = level === "error" ? UI_THEME.danger : level === "warning" ? UI_THEME.warning : UI_THEME.accentStrong;
    this.toast.style.opacity = "1";
    this.toastTimer = 2.5;
  }

  private labeled(label: string, value: HTMLElement): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;flex-direction:column;gap:1px;text-align:center;";
    const caption = this.text(label, "font-size:10px;letter-spacing:.12em;color:" + UI_THEME.muted + ";");
    wrapper.append(caption, value);
    return wrapper;
  }

  private text(value: string, style = ""): HTMLSpanElement {
    const element = document.createElement("span");
    element.textContent = value;
    element.style.cssText = style;
    return element;
  }

  dispose(): void {
    this.root.remove();
  }
}