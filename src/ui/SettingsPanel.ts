import type { GameConfig } from "../config/GameConfig";
import type { EventBus } from "../core/EventBus";
import { UI_THEME } from "./UiTheme";

export class SettingsPanel {
  readonly root: HTMLDivElement;
  private readonly reducedMotion: HTMLInputElement;
  private readonly trails: HTMLInputElement;
  private readonly exposure: HTMLInputElement;

  constructor(
    private readonly container: HTMLElement,
    private readonly config: GameConfig,
    private readonly events: EventBus
  ) {
    this.root = document.createElement("div");
    this.root.dataset.gameUi = "settings";
    this.root.style.cssText = "position:absolute;right:22px;top:88px;display:none;width:250px;padding:16px;gap:12px;flex-direction:column;";
    this.root.className = "ttu-panel";
    const heading = document.createElement("strong");
    heading.textContent = "Presentation";
    this.reducedMotion = this.checkbox("Reduced motion", config.graphics.reducedMotion, (value) => {
      config.graphics.reducedMotion = value;
      events.emit("ui:toast", { message: value ? "Camera motion reduced" : "Full camera motion enabled", level: "info" });
    });
    this.trails = this.checkbox("Ball trail", config.graphics.showTrails, (value) => {
      config.graphics.showTrails = value;
    });
    const exposureRow = document.createElement("label");
    exposureRow.textContent = "Exposure";
    exposureRow.style.cssText = "display:grid;gap:7px;font-size:12px;color:" + UI_THEME.muted + ";";
    this.exposure = document.createElement("input");
    this.exposure.type = "range";
    this.exposure.min = "0.6";
    this.exposure.max = "1.6";
    this.exposure.step = "0.01";
    this.exposure.value = String(config.graphics.toneMappingExposure);
    this.exposure.addEventListener("input", () => {
      config.graphics.toneMappingExposure = Number(this.exposure.value);
    });
    exposureRow.appendChild(this.exposure);
    this.root.append(heading, this.row("Controls", "WASD · pointer · gamepad"), this.row("Physics", config.physics.fixedHz + " Hz fixed step"), exposureRow);
    this.root.append(this.checkboxElement("Reduced motion", this.reducedMotion), this.checkboxElement("Ball trail", this.trails));
    container.appendChild(this.root);
  }

  toggle(): void {
    this.root.style.display = this.root.style.display === "flex" ? "none" : "flex";
  }

  private checkbox(label: string, value: boolean, onChange: (value: boolean) => void): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value;
    input.addEventListener("change", () => onChange(input.checked));
    return input;
  }

  private checkboxElement(label: string, input: HTMLInputElement): HTMLElement {
    const wrapper = document.createElement("label");
    wrapper.style.cssText = "display:flex;align-items:center;gap:8px;font-size:13px;";
    const text = document.createElement("span");
    text.textContent = label;
    wrapper.append(input, text);
    return wrapper;
  }

  private row(label: string, value: string): HTMLElement {
    const element = document.createElement("div");
    element.style.cssText = "display:flex;justify-content:space-between;gap:8px;font-size:12px;color:" + UI_THEME.muted + ";";
    element.innerHTML = "<span>" + label + "</span><span style='color:" + UI_THEME.text + "'>" + value + "</span>";
    return element;
  }

  dispose(): void {
    this.root.remove();
  }
}