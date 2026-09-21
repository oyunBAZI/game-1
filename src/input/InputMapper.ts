import type { InputFrame } from "../core/types";

export interface InputSource {
  sample(time: number): Partial<InputFrame>;
  dispose?(): void;
}

export const DEFAULT_BINDINGS = {
  left: "KeyA",
  right: "KeyD",
  forward: "KeyW",
  back: "KeyS",
  swing: "Space",
  serve: "Enter",
  pause: "Escape",
  camera: "KeyC"
} as const;

export function mergeInputFrames(base: InputFrame, patch: Partial<InputFrame>): InputFrame {
  return {
    ...base,
    ...patch,
    moveX: patch.moveX ?? base.moveX,
    moveY: patch.moveY ?? base.moveY,
    paddleX: patch.paddleX ?? base.paddleX,
    paddleY: patch.paddleY ?? base.paddleY,
    paddleZ: patch.paddleZ ?? base.paddleZ,
    swing: Math.max(base.swing, patch.swing ?? 0),
    spinX: patch.spinX ?? base.spinX,
    spinY: patch.spinY ?? base.spinY,
    spinZ: patch.spinZ ?? base.spinZ,
    serve: base.serve || Boolean(patch.serve),
    pause: base.pause || Boolean(patch.pause),
    cameraMode: Math.max(base.cameraMode, patch.cameraMode ?? 0)
  };
}

export function emptyInputFrame(sequence = 0, time = 0): InputFrame {
  return {
    sequence,
    time,
    moveX: 0,
    moveY: 0,
    paddleX: 0,
    paddleY: 0,
    paddleZ: 0,
    swing: 0,
    spinX: 0,
    spinY: 0,
    spinZ: 0,
    serve: false,
    pause: false,
    cameraMode: 0
  };
}
