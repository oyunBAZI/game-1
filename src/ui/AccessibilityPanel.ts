import type { AccessibilityManager } from "../accessibility/AccessibilityManager";
import { UI_THEME } from "./UiTheme";

export class AccessibilityPanel {
  readonly root: HTMLDivElement;
  private readonly motion: HTMLInputElement;
  private readonly contrast: HTMLInputElement;
  private readonly captions: HTMLInputElement;
  private readonly scale: HTMLInputElement;

  constructor(container: HTMLElement, private readonly accessibility: AccessibilityManager) {
    this.root = document.createElement("div");
    this.root.className = "ttu-panel";
    this.root.dataset.gameUi = "accessibility";
    this.root.style.cssText = "position:absolute;right:22px;bottom:88px;display:none;width:250px;padding:16px;flex-direction:column;gap:12px;";
    const heading = document.createElement("strong");
    heading.textContent = "Accessibility";
    this.motion = this.addToggle("Reduced motion", accessibility.state.reducedMotion, (value) => accessibility.setReducedMotion(value));
    this.contrast = this.addToggle("High contrast ball", accessibility.state.highContrastBall, (value) => accessibility.setHighContrastBall(value));
    this.captions = this.addToggle("Captions", accessibility.state.captions, (value) => accessibility.setCaptions(value));
    const scaleRow = document.createElement("label");
    scaleRow.textContent = "UI scale";
    scaleRow.style.cssText = "display:grid;gap:6px;color:" + UI_THEME.muted + ";font-size:12px;";
    this.scale = document.createElement("input");
    this.scale.type = "range";
    this.scale.min = "0.8";
    this.scale.max = "1.5";
    this.scale.step = "0.05";
    this.scale.value = String(accessibility.state.uiScale);
    this.scale.addEventListener("input", () => accessibility.setUiScale(Number(this.scale.value)));
    scaleRow.append(this.scale);
    this.root.append(heading, this.wrap("Reduced motion", this.motion), this.wrap("High contrast ball", this.contrast), this.wrap("Captions", this.captions), scaleRow);
    container.appendChild(this.root);
  }

  toggle(): void {
    this.root.style.display = this.root.style.display === "flex" ? "none" : "flex";
  }

  private addToggle(label: string, checked: boolean, callback: (value: boolean) => void): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => callback(input.checked));
    return input;
  }

  private wrap(label: string, input: HTMLInputElement): HTMLElement {
    const row = document.createElement("label");
    row.style.cssText = "display:flex;align-items:center;gap:8px;font-size:13px;";
    const text = document.createElement("span");
    text.textContent = label;
    row.append(input, text);
    return row;
  }

  dispose(): void {
    this.root.remove();
  }
}