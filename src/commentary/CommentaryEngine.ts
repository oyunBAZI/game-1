import type { EventBus } from "../core/EventBus";
import type { Side, ShotKind } from "../core/types";

interface CommentaryLine {
  id: string;
  event: "shot" | "point" | "rally";
  minSpeed?: number;
  kind?: ShotKind;
  text: string;
}

const LINES: CommentaryLine[] = [
  { id: "drive-fast", event: "shot", minSpeed: 20, kind: "drive", text: "A sharp drive through the middle." },
  { id: "loop-heavy", event: "shot", minSpeed: 14, kind: "loop", text: "Heavy rotation on that opening loop." },
  { id: "smash", event: "shot", minSpeed: 25, kind: "smash", text: "That is a full-blooded finish." },
  { id: "chop", event: "shot", kind: "chop", text: "A low defensive chop keeps the point alive." },
  { id: "rally-long", event: "rally", text: "The exchange is starting to stretch." },
  { id: "point-home", event: "point", text: "Home side takes the point." },
  { id: "point-away", event: "point", text: "Away side answers immediately." }
];

export class CommentaryEngine {
  private lastLineAt = 0;
  private cooldown = 1.7;
  private readonly listeners: Array<() => void> = [];

  constructor(private readonly events: EventBus) {
    this.listeners.push(
      events.on("shot:hit", (event) => this.onShot(event.side, event.kind, event.speed)),
      events.on("rally:end", ({ winner }) => this.onPoint(winner))
    );
  }

  private onShot(side: Side, kind: ShotKind, speed: number): void {
    const now = performance.now() / 1000;
    if (now - this.lastLineAt < this.cooldown) return;
    const candidates = LINES.filter((line) => line.event === "shot" && (!line.kind || line.kind === kind) && (!line.minSpeed || speed >= line.minSpeed));
    if (!candidates.length) return;
    this.say(candidates[candidates.length - 1].text);
    void side;
  }

  private onPoint(winner: Side): void {
    const line = LINES.find((candidate) => candidate.id === (winner === "home" ? "point-home" : "point-away"));
    if (line) this.say(line.text);
  }

  private say(text: string): void {
    this.lastLineAt = performance.now() / 1000;
    this.events.emit("ui:toast", { message: text, level: "info" });
  }

  dispose(): void {
    this.listeners.forEach((listener) => listener());
    this.listeners.length = 0;
  }
}