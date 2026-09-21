import type { EventBus } from "../core/EventBus";
import type { GameConfig } from "../config/GameConfig";

export interface AccessibilityState {
  reducedMotion: boolean;
  highContrastBall: boolean;
  screenReaderMode: boolean;
  uiScale: number;
  captions: boolean;
}

export class AccessibilityManager {
  state: AccessibilityState = {
    reducedMotion: false,
    highContrastBall: false,
    screenReaderMode: false,
    uiScale: 1,
    captions: true
  };

  constructor(private readonly config: GameConfig, private readonly events: EventBus) {
    this.applyMediaPreference();
  }

  setReducedMotion(value: boolean): void {
    this.state.reducedMotion = value;
    this.config.graphics.reducedMotion = value;
    this.events.emit("ui:toast", { message: value ? "Reduced motion enabled" : "Reduced motion disabled", level: "info" });
  }

  setHighContrastBall(value: boolean): void {
    this.state.highContrastBall = value;
    this.events.emit("ui:toast", { message: value ? "High contrast ball enabled" : "High contrast ball disabled", level: "info" });
  }

  setUiScale(value: number): void {
    this.state.uiScale = Math.max(0.8, Math.min(1.5, value));
    document.documentElement.style.setProperty("--ttu-ui-scale", String(this.state.uiScale));
  }

  setCaptions(value: boolean): void {
    this.state.captions = value;
  }

  private applyMediaPreference(): void {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.state.reducedMotion = true;
      this.config.graphics.reducedMotion = true;
    }
  }
}