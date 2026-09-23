export type Id = string;
export type Timestamp = number;
export type Scalar = number;
export type Side = "home" | "away";
export type Axis = "x" | "y" | "z";
export type GameMode = "practice" | "match" | "drill" | "replay";
export type GamePhase = "boot" | "menu" | "serve" | "rally" | "point" | "paused" | "finished";
export type ContactKind = "table" | "edge" | "net" | "paddle" | "floor" | "out";
export type ShotKind =
  | "serve"
  | "drive"
  | "loop"
  | "smash"
  | "push"
  | "chop"
  | "block"
  | "lob"
  | "unknown";

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface QuatLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PoseLike {
  position: Vec3Like;
  rotation: QuatLike;
}

export interface InputFrame {
  sequence: number;
  time: number;
  moveX: number;
  moveY: number;
  paddleX: number;
  paddleY: number;
  paddleZ: number;
  swing: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  serve: boolean;
  pause: boolean;
  cameraMode: number;
}

export interface CollisionContact {
  kind: ContactKind;
  timeOfImpact: number;
  point: Vec3Like;
  normal: Vec3Like;
  penetration: number;
  relativeSpeed: number;
  surfaceId: string;
  crossedNet?: boolean;
  side?: Side;
}

export interface BallSnapshot {
  position: Vec3Like;
  velocity: Vec3Like;
  angularVelocity: Vec3Like;
  previousPosition: Vec3Like;
  grounded: boolean;
  lastContact: ContactKind | null;
  lastContactSide?: Side | null;
  lastHitTick?: number;
  contactCount?: number;
  age: number;
}

export interface PaddleSnapshot {
  side: Side;
  position: Vec3Like;
  velocity: Vec3Like;
  normal: Vec3Like;
  swingVelocity: Vec3Like;
  contactRadius: number;
  active: boolean;
}

export interface PlayerSnapshot {
  side: Side;
  position: Vec3Like;
  velocity: Vec3Like;
  energy: number;
  ready: boolean;
  stance: "neutral" | "forehand" | "backhand" | "serve";
}

export interface WorldSnapshot {
  tick: number;
  time: number;
  ball: BallSnapshot;
  paddles: Record<Side, PaddleSnapshot>;
  players: Record<Side, PlayerSnapshot>;
}

export interface SimulationEvent {
  type: string;
  tick: number;
  time: number;
  payload: Record<string, unknown>;
}

export interface GameEventMap {
  "simulation:step": { tick: number; dt: number };
  "physics:contact": CollisionContact & { tick: number };
  "physics:out": { side: Side; reason: string };
  "shot:hit": { side: Side; kind: ShotKind; speed: number; spin: Vec3Like };
  "rally:start": { server: Side };
  "rally:let": { server: Side };
  "rally:end": { winner: Side; reason: string };
  "score:change": { home: number; away: number; gamesHome: number; gamesAway: number };
  "match:phase": { from: GamePhase; to: GamePhase };
  "input:frame": InputFrame;
  "replay:frame": { index: number; total: number };
  "ui:toast": { message: string; level: "info" | "success" | "warning" | "error" };
}

export type EventKey = keyof GameEventMap;

export interface Disposable {
  dispose(): void;
}

export interface Updatable {
  update(dt: number): void;
}

export interface FixedUpdatable {
 fixedUpdate(dt: number): void;
}

export interface Serializable<T> {
  serialize(): T;
  restore(value: T): void;
}

export interface Seeded {
  seed: number;
}

export interface NumericRange {
  min: number;
  max: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface DifficultyProfile {
  id: string;
  label: string;
  reactionSeconds: number;
  movementSpeed: number;
  predictionConfidence: number;
  placementError: number;
  spinRead: number;
  aggression: number;
  recovery: number;
}

export interface RubberProfile {
  id: string;
  label: string;
  color: "red" | "black";
  restitution: number;
  friction: number;
  spinTransfer: number;
  dwellTime: number;
  hardness: number;
}

export interface TableProfile {
  id: string;
  label: string;
  restitution: number;
  friction: number;
  edgeRestitution: number;
  clothRoughness: number;
}

export interface CameraBookmark {
  id: string;
  position: Vec3Like;
  target: Vec3Like;
  fov: number;
}

export interface TelemetryRecord {
  id: string;
  tick: number;
  category: string;
  name: string;
  values: Record<string, number | string | boolean>;
}

export interface ReplayHeader {
  version: number;
  createdAt: string;
  seed: number;
  mode: GameMode;
  physicsHz: number;
  playerNames: Record<Side, string>;
}

export interface ReplayFrame {
  tick: number;
  inputs: Record<Side, InputFrame>;
  snapshot: WorldSnapshot;
  events: SimulationEvent[];
}

export interface ReplayData {
  header: ReplayHeader;
  frames: ReplayFrame[];
}

export function oppositeSide(side: Side): Side {
  return side === "home" ? "away" : "home";
}

export function isContactEvent(event: SimulationEvent): boolean {
  return event.type === "physics:contact";
}
