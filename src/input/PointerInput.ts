import { clamp } from "../core/MathUtils";
import type { InputFrame } from "../core/types";
import type { InputSource } from "./InputMapper";

export class PointerInput implements InputSource {
  private x = 0;
  private y = 0;
  private down = false;
  private pointerId: number | null = null;
  private readonly move = (event: PointerEvent) => {
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    this.x = event.movementX;
    this.y = event.movementY;
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
  }

  sample(time: number): Partial<InputFrame> {
    const result = {
      time,
      paddleX: clamp(this.x * 0.012, -1, 1),
      paddleY: clamp(-this.y * 0.009, -1, 1),
      spinY: clamp(this.x * 0.8, -1, 1),
      swing: this.down ? 0.72 : 0
    };
    this.x *= 0.08;
    this.y *= 0.08;
    return result;
  }

  dispose(): void {
    this.element.removeEventListener("pointermove", this.move);
    this.element.removeEventListener("pointerdown", this.press);
    window.removeEventListener("pointerup", this.release);
  }
}