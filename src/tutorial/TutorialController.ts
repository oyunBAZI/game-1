import type { EventBus } from "../core/EventBus";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  target: "movement" | "aim" | "swing" | "spin" | "serve" | "rally";
  completeWhen: (signals: TutorialSignals) => boolean;
}

export interface TutorialSignals {
  moved: boolean;
  aimed: boolean;
  swung: boolean;
  spun: boolean;
  served: boolean;
  rallyHits: number;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: "move", title: "Find your stance", body: "Use A and D to move laterally. Stay balanced before the ball arrives.", target: "movement", completeWhen: (s) => s.moved },
  { id: "aim", title: "Aim the racket", body: "Move the pointer to position the racket face in front of the ball.", target: "aim", completeWhen: (s) => s.aimed },
  { id: "swing", title: "Meet the ball", body: "Press Space as the ball arrives. Timing changes the outgoing speed.", target: "swing", completeWhen: (s) => s.swung },
  { id: "spin", title: "Add brush", body: "Move while swinging to create tangential racket velocity and spin.", target: "spin", completeWhen: (s) => s.spun },
  { id: "serve", title: "Start a point", body: "Press Enter to serve. The simulation owns the ball after release.", target: "serve", completeWhen: (s) => s.served },
  { id: "rally", title: "Build a rally", body: "Keep your feet moving and return the ball before the bounce.", target: "rally", completeWhen: (s) => s.rallyHits >= 5 }
];

export class TutorialController {
  private index = 0;
  private completed = new Set<string>();
  private signals: TutorialSignals = { moved: false, aimed: false, swung: false, spun: false, served: false, rallyHits: 0 };

  constructor(private readonly events: EventBus) {}

  signal(patch: Partial<TutorialSignals>): void {
    this.signals = { ...this.signals, ...patch };
    this.evaluate();
  }

  current(): TutorialStep | null {
    return TUTORIAL_STEPS[this.index] ?? null;
  }

  progress(): { index: number; total: number; completed: number } {
    return { index: this.index, total: TUTORIAL_STEPS.length, completed: this.completed.size };
  }

  reset(): void {
    this.index = 0;
    this.completed.clear();
    this.signals = { moved: false, aimed: false, swung: false, spun: false, served: false, rallyHits: 0 };
  }

  private evaluate(): void {
    const step = this.current();
    if (!step || !step.completeWhen(this.signals)) return;
    this.completed.add(step.id);
    this.events.emit("ui:toast", { message: step.title + " complete", level: "success" });
    this.index += 1;
  }
}