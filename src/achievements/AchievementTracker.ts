import type { EventBus } from "../core/EventBus";
import type { ShotKind, Side } from "../core/types";

export interface Achievement {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export class AchievementTracker {
  readonly achievements: Achievement[] = [
    { id: "first-point", label: "First Point", description: "Win a point.", unlocked: false, progress: 0, target: 1 },
    { id: "long-rally", label: "Long Rally", description: "Reach a 20-shot rally.", unlocked: false, progress: 0, target: 20 },
    { id: "speed", label: "Speed Check", description: "Hit a ball above 30 m/s.", unlocked: false, progress: 0, target: 1 },
    { id: "spin", label: "Spin Doctor", description: "Record 200 rad/s of spin.", unlocked: false, progress: 0, target: 200 },
    { id: "variety", label: "Full Arsenal", description: "Use five shot types.", unlocked: false, progress: 0, target: 5 }
  ];
  private shotKinds = new Set<ShotKind>();
  private rallyHits = 0;
  private readonly subscriptions: Array<() => void> = [];

  constructor(private readonly events: EventBus) {
    this.subscriptions.push(
      events.on("rally:start", () => { this.rallyHits = 0; }),
      events.on("shot:hit", ({ kind, speed, spin }) => {
        this.rallyHits += 1;
        this.shotKinds.add(kind);
        this.update("long-rally", this.rallyHits);
        this.update("speed", speed >= 30 ? 1 : 0);
        this.update("spin", Math.sqrt(spin.x ** 2 + spin.y ** 2 + spin.z ** 2));
        this.update("variety", this.shotKinds.size);
      }),
      events.on("rally:end", ({ winner }) => {
        this.update("first-point", 1);
        void winner;
      })
    );
  }

  private update(id: string, value: number): void {
    const achievement = this.achievements.find((item) => item.id === id);
    if (!achievement || achievement.unlocked) return;
    achievement.progress = Math.max(achievement.progress, value);
    if (achievement.progress >= achievement.target) {
      achievement.unlocked = true;
      this.events.emit("ui:toast", { message: "Achievement: " + achievement.label, level: "success" });
    }
  }

  reset(): void {
    this.achievements.forEach((achievement) => {
      achievement.unlocked = false;
      achievement.progress = 0;
    });
    this.shotKinds.clear();
    this.rallyHits = 0;
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription());
    this.subscriptions.length = 0;
  }
}