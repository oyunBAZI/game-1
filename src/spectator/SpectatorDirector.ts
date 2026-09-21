import type { EventBus } from "../core/EventBus";
import type { CameraRig } from "../render/CameraRig";

export interface SpectatorCue {
  id: string;
  type: "impact" | "rally" | "point";
  intensity: number;
  preferredCamera: "competitive" | "broadcast" | "ball";
  duration: number;
}

export class SpectatorDirector {
  private queue: SpectatorCue[] = [];
  private current: SpectatorCue | null = null;
  private remaining = 0;
  private unsubscribe: Array<() => void> = [];

  constructor(private readonly events: EventBus, private readonly camera: CameraRig) {
    this.unsubscribe.push(
      events.on("shot:hit", ({ kind, speed }) => this.queueCue({ id: "shot-" + kind, type: "impact", intensity: Math.min(1, speed / 32), preferredCamera: kind === "smash" ? "ball" : "competitive", duration: 0.4 })),
      events.on("rally:end", () => this.queueCue({ id: "point", type: "point", intensity: 1, preferredCamera: "broadcast", duration: 2 }))
    );
  }

  update(dt: number): void {
    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.current = this.queue.shift() ?? null;
      if (this.current) {
        this.remaining = this.current.duration;
        this.camera.setMode(this.current.preferredCamera);
      }
    }
  }

  queueCue(cue: SpectatorCue): void {
    if (this.queue.length > 12) this.queue.shift();
    this.queue.push(cue);
  }

  activeCue(): SpectatorCue | null {
    return this.current;
  }

  dispose(): void {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe.length = 0;
    this.queue.length = 0;
    this.current = null;
  }
}