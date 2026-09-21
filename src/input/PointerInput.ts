import { clamp } from "../core/MathUtils";
import type { InputFrame } from "../core/types";
import type { InputSource } from "./InputMapper";

export class PointerInput implements InputSource {
  private x = 0;
  private y = 0;
  private motionX = 0;
  private down = false;
  private pointerId: number | null = null;
  private readonly move = (event: PointerEvent) => {
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const bounds = this.element.getBoundingClientRect();
    this.x = clamp(((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1, -1, 1);
    this.y = clamp(1 - ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2, -1, 1);
    this.motionX += event.movementX;
  };
  private readonly press = (event: PointerEvent) => {
    if (this.pointerId === null) this.pointerId = event.pointerId;
    this.down = true;
  };
  private readonly release = (event: PointerEvent) => {
    if (event.pointerId === this.pointerId) {
      this.down = false;
      this.pointerId = null;
    }
  };

  constructor(private readonly element: HTMLElement) {
    element.addEventListener("pointermove", this.move);
    element.addEventListener("pointerdown", this.press);
    window.addEventListener("pointerup", this.release);
    window.addEventListener("pointercancel", this.release);
  }

  sample(time: number): Partial<InputFrame> {
    const result = {
      time,
      paddleX: this.x * 0.68,
      paddleY: this.y * 0.45,
      spinY: clamp(this.motionX * 0.025, -1, 1),
      swing: this.down ? 0.72 : 0
    };
    this.motionX = 0;
    return result;
  }

  dispose(): void {
    this.element.removeEventListener("pointermove", this.move);
    this.element.removeEventListener("pointerdown", this.press);
    window.removeEventListener("pointerup", this.release);
    window.removeEventListener("pointercancel", this.release);
  }
}
