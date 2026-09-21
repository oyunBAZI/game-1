import type { EventBus } from "../core/EventBus";
import type { GameSimulation } from "../game/GameSimulation";
import { UI_THEME } from "./UiTheme";

export class MenuController {
  readonly root: HTMLDivElement;
  private visible = true;
  private readonly title: HTMLHeadingElement;
  private readonly modeLabel: HTMLSpanElement;

  constructor(
    private readonly container: HTMLElement,
    private readonly simulation: GameSimulation,
    private readonly events: EventBus
  ) {
    this.root = document.createElement("div");
    this.root.dataset.gameUi = "menu";
    this.root.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(135deg,rgba(3,10,14,.74),rgba(4,14,20,.36));pointer-events:auto;";
    const panel = document.createElement("section");
    panel.className = "ttu-panel";
    panel.style.cssText = "width:min(420px,calc(100vw - 40px));padding:30px;display:flex;flex-direction:column;gap:17px;";
    this.title = document.createElement("h1");
    this.title.textContent = "TABLE TENNIS ULTRA";
    this.title.style.cssText = "margin:0;font-size:clamp(28px,5vw,45px);line-height:.95;letter-spacing:-.06em;";
    const subtitle = document.createElement("p");
    subtitle.textContent = "A high-frequency, spin-aware browser simulation foundation.";
    subtitle.style.cssText = "margin:0;color:" + UI_THEME.muted + ";line-height:1.5;";
    this.modeLabel = document.createElement("span");
    this.modeLabel.textContent = "PRACTICE MODE";
    this.modeLabel.className = "ttu-chip";
    const start = this.button("Start session", () => this.start());
    const reset = this.button("Reset session", () => {
      this.simulation.restart();
      this.events.emit("ui:toast", { message: "Session reset", level: "info" });
    });
    const hint = document.createElement("small");
    hint.textContent = "Press C to cycle cameras during play.";
    hint.style.color = UI_THEME.muted;
    panel.append(this.title, subtitle, this.modeLabel, start, reset, hint);
    this.root.appendChild(panel);
    container.appendChild(this.root);
  }

  show(): void {
    this.visible = true;
    this.root.style.display = "grid";
  }

  hide(): void {
    this.visible = false;
    this.root.style.display = "none";
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  private start(): void {
    this.simulation.start();
    this.hide();
    this.events.emit("ui:toast", { message: "Session started", level: "success" });
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = "padding:12px 15px;border:1px solid rgba(181,255,240,.24);border-radius:10px;background:rgba(84,214,199,.13);color:" + UI_THEME.accentStrong + ";cursor:pointer;text-align:left;";
    button.addEventListener("click", onClick);
    return button;
  }

  dispose(): void {
    this.root.remove();
  }
}
