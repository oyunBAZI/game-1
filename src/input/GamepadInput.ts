import { clamp } from "../core/MathUtils";
import type { InputFrame } from "../core/types";
import type { InputSource } from "./InputMapper";

export class GamepadInput implements InputSource {
  private gamepadIndex: number | null = null;
  private readonly connected = (event: GamepadEvent) => {
    if (this.gamepadIndex === null) this.gamepadIndex = event.gamepad.index;
  };
  private readonly disconnected = (event: GamepadEvent) => {
    if (event.gamepad.index === this.gamepadIndex) this.gamepadIndex = null;
  };

  constructor(private readonly deadzone = 0.12) {
    window.addEventListener("gamepadconnected", this.connected);
    window.addEventListener("gamepaddisconnected", this.disconnected);
  }

  sample(time: number): Partial<InputFrame> {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = this.gamepadIndex !== null ? pads[this.gamepadIndex] : Array.from(pads).find(Boolean);
    if (!pad) return { time };
    const axis = (index: number) => this.applyDeadzone(pad.axes[index] ?? 0);
    const button = (index: number) => pad.buttons[index]?.value ?? 0;
    return {
      time,
      moveX: axis(0),
      moveY: -axis(1),
      paddleX: axis(2),
      paddleY: -axis(3),
      swing: button(0),
      serve: button(1) > 0.5,
      pause: button(9) > 0.5,
      cameraMode: button(3) > 0.5 ? 1 : 0
    };
  }

  private applyDeadzone(value: number): number {
    const sign = Math.sign(value);
    const magnitude = Math.max(0, (Math.abs(value) - this.deadzone) / (1 - this.deadzone));
    return clamp(sign * magnitude, -1, 1);
  }

  dispose(): void {
    window.removeEventListener("gamepadconnected", this.connected);
    window.removeEventListener("gamepaddisconnected", this.disconnected);
  }
}