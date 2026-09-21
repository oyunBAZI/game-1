import type { InputFrame, ReplayFrame, Side, WorldSnapshot } from "../core/types";

export type NetworkMessage =
  | HelloMessage
  | InputMessage
  | SnapshotMessage
  | ConfirmMessage
  | PingMessage
  | EventMessage;

export interface HelloMessage {
  type: "hello";
  protocol: number;
  clientId: string;
  name: string;
}

export interface InputMessage {
  type: "input";
  clientId: string;
  tick: number;
  side: Side;
  input: InputFrame;
}

export interface SnapshotMessage {
  type: "snapshot";
  serverTick: number;
  acknowledgedInput: number;
  snapshot: WorldSnapshot;
}

export interface ConfirmMessage {
  type: "confirm";
  serverTick: number;
  accepted: boolean;
  reason?: string;
}

export interface PingMessage {
  type: "ping";
  sentAt: number;
}

export interface EventMessage {
  type: "event";
  name: string;
  tick: number;
  payload: Record<string, unknown>;
}

export const PROTOCOL_VERSION = 1;

export function encode(message: NetworkMessage): string {
  return JSON.stringify(message);
}

export function decode(raw: string): NetworkMessage | null {
  try {
    const value = JSON.parse(raw) as NetworkMessage;
    if (!value || typeof value.type !== "string") return null;
    return value;
  } catch {
    return null;
  }
}

export function createInputMessage(clientId: string, tick: number, side: Side, input: InputFrame): InputMessage {
  return { type: "input", clientId, tick, side, input: { ...input } };
}

export function createReplayFrame(snapshot: WorldSnapshot, input: InputFrame): ReplayFrame {
  return {
    tick: snapshot.tick,
    inputs: { home: input, away: input },
    snapshot,
    events: []
  };
}