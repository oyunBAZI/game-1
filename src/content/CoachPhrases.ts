import type { ShotKind } from "../core/types";

export interface CoachPhrase {
  id: string;
  trigger: "contact" | "miss" | "streak" | "point" | "serve";
  shot?: ShotKind;
  minValue?: number;
  text: string;
  tone: "calm" | "positive" | "corrective" | "excited";
}

export const COACH_PHRASES: CoachPhrase[] = [
  { id: "contact-clean", trigger: "contact", minValue: 0.82, text: "Clean contact. Keep the racket path through the ball.", tone: "positive" },
  { id: "contact-edge", trigger: "contact", minValue: 0, text: "Move your feet first; the reach was late.", tone: "corrective" },
  { id: "loop-low", trigger: "contact", shot: "loop", minValue: 0, text: "Good brush. Let the topspin do the work.", tone: "positive" },
  { id: "smash-commit", trigger: "contact", shot: "smash", minValue: 0, text: "Commit to the finish and recover immediately.", tone: "excited" },
  { id: "push-soft", trigger: "contact", shot: "push", minValue: 0, text: "Soft hands. Keep the return low.", tone: "calm" },
  { id: "chop-open", trigger: "contact", shot: "chop", minValue: 0, text: "Open the face slightly more against heavy topspin.", tone: "corrective" },
  { id: "streak-three", trigger: "streak", minValue: 3, text: "Three in a row. Now place the next one with intent.", tone: "positive" },
  { id: "streak-eight", trigger: "streak", minValue: 8, text: "Excellent control. Do not rush the finish.", tone: "excited" },
  { id: "miss-recover", trigger: "miss", text: "Reset your stance before chasing the next ball.", tone: "calm" },
  { id: "serve-short", trigger: "serve", text: "Short serve: keep the second bounce near the end line.", tone: "corrective" },
  { id: "point-win", trigger: "point", text: "Point won. Breathe, then choose the next pattern.", tone: "positive" }
];

export function phrasesFor(trigger: CoachPhrase["trigger"], shot?: ShotKind): CoachPhrase[] {
  return COACH_PHRASES.filter((phrase) => phrase.trigger === trigger && (!phrase.shot || phrase.shot === shot));
}