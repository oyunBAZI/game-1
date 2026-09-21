import type { InputFrame, WorldSnapshot } from "../core/types";

export type PhysicsWorkerRequest =
  | { type: "initialize"; seed: number }
  | { type: "step"; dt: number; input: InputFrame }
  | { type: "restore"; snapshot: WorldSnapshot }
  | { type: "snapshot" }
  | { type: "dispose" };

export type PhysicsWorkerResponse =
  | { type: "ready"; tick: number }
  | { type: "step-complete"; tick: number; snapshot: WorldSnapshot }
  | { type: "snapshot"; snapshot: WorldSnapshot }
  | { type: "error"; message: string };

export function isPhysicsRequest(value: unknown): value is PhysicsWorkerRequest {
  return Boolean(value && typeof value === "object" && "type" in value);
}

export function makeStepRequest(dt: number, input: InputFrame): PhysicsWorkerRequest {
  return { type: "step", dt, input: { ...input } };
}

export function postResponse(target: { postMessage(value: PhysicsWorkerResponse): void }, response: PhysicsWorkerResponse): void {
  target.postMessage(response);
}