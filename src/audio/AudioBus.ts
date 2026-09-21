import type { EventBus } from "../core/EventBus";
import type { Vec3Like } from "../core/types";

export type SoundId = "paddle-hit" | "table-bounce" | "net-hit" | "point" | "serve" | "footstep";

export class AudioBus {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.42;

  constructor(private readonly events: EventBus) {
    events.on("shot:hit", ({ speed }) => this.play("paddle-hit", Math.min(1, speed / 30), undefined));
    events.on("physics:contact", (contact) => {
      if (contact.kind === "table") this.play("table-bounce", Math.min(1, contact.relativeSpeed / 20), contact.point);
      if (contact.kind === "net") this.play("net-hit", 0.5, contact.point);
    });
    events.on("rally:end", () => this.play("point", 0.7));
  }

  unlock(): void {
    if (this.context) {
      if (this.context.state === "suspended") void this.context.resume();
      return;
    }
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(id: SoundId, intensity = 0.5, position?: Vec3Like): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const frequency = id === "paddle-hit" ? 250 + intensity * 180 : id === "table-bounce" ? 120 + intensity * 80 : id === "net-hit" ? 90 : id === "point" ? 440 : 180;
    oscillator.type = id === "paddle-hit" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.48), now + (id === "point" ? 0.22 : 0.09));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.18 * intensity), now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (id === "point" ? 0.24 : 0.1));
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + (id === "point" ? 0.25 : 0.11));
    void position;
  }

  dispose(): void {
    this.master?.disconnect();
    void this.context?.close();
    this.master = null;
    this.context = null;
  }
}