import type { InputFrame } from "../core/types";
import { DEFAULT_BINDINGS, type InputSource } from "./InputMapper";

export class KeyboardInput implements InputSource {
  private pressed = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private releasedThisFrame = new Set<string>();
  private readonly down = (event: KeyboardEvent) => {
    if (!event.repeat) this.pressedThisFrame.add(event.code);
    this.pressed.add(event.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
  };
  private readonly up = (event: KeyboardEvent) => {
    this.pressed.delete(event.code);
    this.releasedThisFrame.add(event.code);
  };

  constructor(private readonly bindings = DEFAULT_BINDINGS) {
    window.addEventListener("keydown", this.down, { passive: false });
    window.addEventListener("keyup", this.up);
  }

  sample(time: number): Partial<InputFrame> {
    const moveX = (this.isDown(this.bindings.right) ? 1 : 0) - (this.isDown(this.bindings.left) ? 1 : 0);
    const moveY = (this.isDown(this.bindings.forward) ? 1 : 0) - (this.isDown(this.bindings.back) ? 1 : 0);
    const frame: Partial<InputFrame> = {
      time,
      moveX,
      moveY,
      swing: this.isDown(this.bindings.swing) ? 1 : 0,
      serve: this.wasPressed(this.bindings.serve),
      pause: this.wasPressed(this.bindings.pause),
      cameraMode: this.wasPressed(this.bindings.camera) ? 1 : 0
    };
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    return frame;
  }

  isDown(code: string): boolean {
    return this.pressed.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  wasReleased(code: string): boolean {
    return this.releasedThisFrame.has(code);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    this.pressed.clear();
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}