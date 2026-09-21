import { clamp } from "../core/MathUtils";
import type { CameraRig } from "./CameraRig";

export class OrbitInput {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private readonly down = (event: PointerEvent) => {
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };
  private readonly move = (event: PointerEvent) => {
    if (!this.dragging) return;
    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.yaw += deltaX * 0.006;
    this.pitch = clamp(this.pitch - deltaY * 0.004, -0.15, 0.8);
    this.camera.setOrbit(this.yaw, this.pitch);
  };
  private readonly up = () => {
    this.dragging = false;
  };
  private yaw = 0.58;
  private pitch = 0.22;

  constructor(private readonly element: HTMLElement, private readonly camera: CameraRig) {
    element.addEventListener("pointerdown", this.down);
    element.addEventListener("pointermove", this.move);
    window.addEventListener("pointerup", this.up);
  }

  reset(): void {
    this.yaw = 0.58;
    this.pitch = 0.22;
    this.camera.setOrbit(this.yaw, this.pitch);
  }

  dispose(): void {
    this.element.removeEventListener("pointerdown", this.down);
    this.element.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.up);
  }
}