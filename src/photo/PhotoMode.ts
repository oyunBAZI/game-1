import type { GameRenderer } from "../render/Renderer";
import type { CameraRig } from "../render/CameraRig";

export class PhotoMode {
  private active = false;
  private savedPixelRatio = 1;
  private savedClearColor = 0;

  constructor(
    private readonly renderer: GameRenderer,
    private readonly camera: CameraRig
  ) {}

  enter(): void {
    if (this.active) return;
    this.active = true;
    this.savedPixelRatio = window.devicePixelRatio;
    this.renderer.renderer.setPixelRatio(Math.min(3, window.devicePixelRatio * 1.5));
    this.camera.setMode("free");
    document.body.classList.add("ttu-photo-mode");
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.renderer.renderer.setPixelRatio(Math.min(2, this.savedPixelRatio));
    this.camera.setMode("competitive");
    document.body.classList.remove("ttu-photo-mode");
  }

  toggle(): void {
    if (this.active) this.exit();
    else this.enter();
  }

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.exit();
    void this.savedClearColor;
  }
}