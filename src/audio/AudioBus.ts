import type { EventBus } from "../core/EventBus";
import type { Vec3Like } from "../core/types";

export type SoundId = "paddle-hit" | "table-bounce" | "net-hit" | "point" | "serve" | "footstep";

/** Short physical transients, synthesized after the first user gesture. A
 * filtered noise layer supplies the attack; a decaying resonator supplies the
 * blade, table or cord's body. No external audio requests are required. */
export class AudioBus {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private volume = 0.42;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(events: EventBus) {
    this.unsubscribe.push(
      events.on("shot:hit", ({ speed }) => this.play("paddle-hit", Math.min(1, speed / 20))),
      events.on("physics:contact", (contact) => {
        if (contact.kind === "table") this.play("table-bounce", Math.min(1, contact.relativeSpeed / 13), contact.point);
        if (contact.kind === "net") this.play("net-hit", Math.min(1, contact.relativeSpeed / 10), contact.point);
      }),
      events.on("rally:start", () => this.play("serve", 0.24)),
      events.on("rally:end", () => this.play("point", 0.45))
    );
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
    this.noise = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * 0.22), this.context.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 0x18a63f2d;
    for (let index = 0; index < data.length; index += 1) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      data[index] = ((seed >>> 0) / 2147483648 - 1) * (1 - index / data.length);
    }
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(id: SoundId, intensity = 0.5, position?: Vec3Like): void {
    // Do not create an AudioContext from a simulation event: browser autoplay
    // policy requires the real pointer gesture handled by GameApp.unlock().
    const context = this.context;
    if (!this.enabled || !context || !this.master || context.state !== "running") return;
    const now = context.currentTime;
    const strength = Math.max(0.08, Math.min(1, intensity));
    const output = context.createGain();
    let pan: StereoPannerNode | null = null;
    output.gain.value = 0.55;
    if (position) {
      pan = context.createStereoPanner();
      pan.pan.value = Math.max(-0.65, Math.min(0.65, position.x / 1.4));
      output.connect(pan);
      pan.connect(this.master);
    } else output.connect(this.master);
    const cleanup = () => { output.disconnect(); pan?.disconnect(); };

    if (id === "point") {
      this.tone(context, output, now, 410, 230, 0.19, strength * 0.08);
      this.tone(context, output, now + 0.075, 615, 310, 0.24, strength * 0.07, cleanup);
      return;
    }
    const isPaddle = id === "paddle-hit";
    const isNet = id === "net-hit";
    const duration = isNet ? 0.16 : isPaddle ? 0.085 : id === "table-bounce" ? 0.07 : 0.055;
    if (this.noise) {
      const source = context.createBufferSource();
      source.buffer = this.noise;
      const filter = context.createBiquadFilter();
      filter.type = isNet ? "bandpass" : "highpass";
      filter.frequency.value = isNet ? 680 : isPaddle ? 1350 : 1100;
      filter.Q.value = isNet ? 1.1 : 0.7;
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(strength * (isNet ? 0.09 : 0.18), now + 0.002);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(output);
      source.start(now);
      source.stop(now + duration);
      source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    }
    const frequency = isPaddle ? 235 : isNet ? 105 : id === "serve" ? 350 : 170;
    this.tone(context, output, now, frequency, frequency * (isPaddle ? 0.42 : 0.57),
      duration, strength * (isPaddle ? 0.19 : isNet ? 0.05 : 0.13), cleanup);
  }

  private tone(context: AudioContext, output: AudioNode, at: number,
    frequency: number, endFrequency: number, duration: number, volume: number,
    onDone?: () => void): void {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.003);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(at);
    oscillator.stop(at + duration);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); onDone?.(); };
  }

  dispose(): void {
    this.unsubscribe.forEach((stop) => stop());
    this.unsubscribe.length = 0;
    this.master?.disconnect();
    void this.context?.close();
    this.master = null;
    this.context = null;
    this.noise = null;
  }
}
