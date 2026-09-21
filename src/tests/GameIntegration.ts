import { EventBus } from "../core/EventBus";
import { Vec3 } from "../core/Vec3";
import type { CollisionContact, InputFrame, Side } from "../core/types";
import { GameSimulation } from "../game/GameSimulation";
import { RallyController } from "../game/RallyController";
import { Scoreboard } from "../game/Scoreboard";
import { TRAINING_RULES } from "../game/Rules";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { BALL, TABLE } from "../physics/constants";
import { Aerodynamics } from "../physics/Aerodynamics";
import { BallPredictor } from "../physics/Predictor";
import { PlayerVisual } from "../render/Player";
import { PaddleVisual } from "../render/Paddle";
import { TableVisual } from "../render/Table";
import { ArenaVisual } from "../render/Arena";
import { createMaterialPalette } from "../render/ProceduralMaterials";
import * as THREE from "three";
import { emptyInputFrame, mergeInputFrames } from "../input/InputMapper";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function contact(kind: CollisionContact["kind"], side: Side): CollisionContact & { tick: number } {
  return {
    kind, side: kind === "paddle" ? side : undefined,
    tick: 0, timeOfImpact: 0, point: { x: 0, y: TABLE.top, z: side === "home" ? 0.5 : -0.5 },
    normal: { x: 0, y: 1, z: 0 }, penetration: 0, relativeSpeed: 5,
    surfaceId: kind + side
  };
}

function testTableAndNet(): void {
  const world = new PhysicsWorld(new EventBus());
  const ball = world.state.ball;
  ball.reset(new Vec3(0, TABLE.top + BALL.radius + 0.06, 0.5), new Vec3(0, -24, 0));
  const result = world.fixedStep(1 / 120);
  assert(result.contacts.some((hit) => hit.kind === "table"), "fast ball must hit table, not tunnel through it");
  assert(ball.position.y >= TABLE.top + BALL.radius, "bounce must resolve above the playing surface");
  assert(ball.velocity.y > 0, "table must reverse the downward velocity");

  for (const sign of [-1, 1]) {
    ball.reset(new Vec3(0, TABLE.top + 0.08, sign * 0.15), new Vec3(0, 0, -sign * 28));
    const hit = world.fixedStep(1 / 120);
    assert(hit.contacts.some((item) => item.kind === "net"), "net must catch a fast ball from either side");
    assert(ball.velocity.z * sign > 0, "net must reflect toward the incoming half");
  }
  ball.reset(new Vec3(0, 1.1, 0), new Vec3(0, 0, -8));
  ball.angularVelocity.set(220, 0, 0);
  const lift = new Aerodynamics(world.tuning).forces(ball).magnus.length();
  assert(lift > 0 && lift < ball.mass * 20,
    "ordinary spin should create bounded aerodynamic lift");
}

function testOrderedContinuousContacts(): void {
  const world = new PhysicsWorld(new EventBus());
  const ball = world.state.ball;
  // The table is hit first; the same fast trajectory reaches the net later
  // within one fixed tick. Surface check order must not change the outcome.
  ball.reset(new Vec3(0, TABLE.top + BALL.radius + 0.024, 0.11), new Vec3(0, -12, -30));
  const result = world.fixedStep(1 / 120);
  assert(result.contacts.length >= 2, "ball must continue flying after a table bounce");
  assert(result.contacts[0].kind === "table" && result.contacts[1].kind === "net",
    "contacts must be resolved by time of impact, not by collider type");
  assert(ball.velocity.z > 0, "the later net impact must send the ball back");

  const paddle = world.state.paddles.away;
  paddle.previousPosition.set(0, 1, 0.25);
  paddle.position.set(0, 1, 0.55);
  paddle.normal.set(0, 0, 1);
  ball.reset(new Vec3(0, 1, 0.5));
  ball.previousPosition.set(0, 1, 0.5);
  ball.position.set(0, 1, 0.3);
  assert(world.paddles.detect(ball, paddle)?.kind === "paddle",
    "the moving blade must catch a ball swept through its earlier position");
  paddle.normal.negate();
  assert(world.paddles.detect(ball, paddle)?.kind === "paddle",
    "both rubber faces must be able to contact the ball");
}

function testPredictionAgreesWithFlight(): void {
  const world = new PhysicsWorld(new EventBus());
  world.state.paddles.home.active = false;
  world.state.paddles.away.active = false;
  world.state.ball.reset(new Vec3(0.14, 1.3, 0.5), new Vec3(0.4, 1.2, -2.9));
  world.state.ball.angularVelocity.set(100, 20, 0);
  const prediction = new BallPredictor(world.tuning).predict(world.state.ball, 1, 1 / 240);
  let actual: CollisionContact | undefined;
  for (let tick = 0; tick < 240 && !actual; tick += 1) {
    actual = world.fixedStep(1 / 240).contacts.find((hit) => hit.kind === "table");
  }
  assert(actual && prediction.valid, "a reachable spinning ball must have a predicted landing");
  assert(Math.abs(prediction.position.x - actual.point.x) < 0.04 &&
    Math.abs(prediction.position.z - actual.point.z) < 0.04,
    "AI landing prediction must agree with the game collision model");
}

function testRallyScoring(): void {
  const events = new EventBus();
  const world = new PhysicsWorld(events);
  const scoreboard = new Scoreboard(events, TRAINING_RULES);
  const rally = new RallyController(events, world, scoreboard);
  events.emit("rally:start", { server: "home" });
  events.emit("physics:contact", contact("table", "away"));
  assert(scoreboard.score("away") === 1, "a serve missing its own half awards receiver");

  events.emit("rally:start", { server: "home" });
  events.emit("physics:contact", contact("table", "home"));
  events.emit("physics:contact", contact("table", "away"));
  events.emit("physics:contact", contact("table", "away"));
  assert(scoreboard.score("home") === 1, "double bounce awards last hitter");
  events.emit("physics:out", { side: "home", reason: "floor" });
  assert(scoreboard.pointsPlayed === 2, "one rally must award exactly one point");

  events.emit("rally:start", { server: "home" });
  events.emit("physics:contact", contact("table", "home"));
  events.emit("physics:contact", contact("table", "away"));
  events.emit("physics:contact", contact("paddle", "away"));
  events.emit("physics:contact", contact("paddle", "home"));
  assert(scoreboard.score("away") === 2, "volley before bounce awards striker's opponent");
  rally.dispose();
}

function testPlayableSimulation(): void {
  const events = new EventBus();
  const simulation = new GameSimulation({}, events);
  const contacts: CollisionContact[] = [];
  let scoreChanges = 0;
  events.on("score:change", () => { scoreChanges += 1; });
  events.on("physics:contact", (hit) => contacts.push(hit));
  const input: InputFrame = {
    sequence: 0, time: 0, moveX: 0, moveY: 0,
    paddleX: 0, paddleY: 0, paddleZ: 0, swing: 0,
    spinX: 0, spinY: 0, spinZ: 0,
    serve: false, pause: false, cameraMode: 0
  };
  simulation.start();
  simulation.match.pause();
  const pausedTick = simulation.world.state.tick;
  simulation.fixedUpdate(1 / 240, 0);
  assert(simulation.world.state.tick === pausedTick, "pause must freeze the simulation");
  simulation.match.resume();
  assert(simulation.match.phase() === "serve", "resume must restore the awaiting-serve phase");
  const startY = simulation.world.state.ball.position.y;
  for (let tick = 0; tick < 30; tick += 1) simulation.fixedUpdate(1 / 240, tick);
  assert(simulation.world.state.ball.position.y === startY, "ball must stay put while waiting to serve");
  simulation.setInput({ ...input, serve: true });
  simulation.setInput(input);
  simulation.fixedUpdate(1 / 240, 30);
  for (let tick = 31; tick < 400; tick += 1) {
    simulation.fixedUpdate(1 / 240, tick);
  }
  const bounces = contacts.filter((hit) => hit.kind === "table");
  assert(bounces.length >= 2, "serve should bounce on both table halves");
  assert(bounces[0].point.z > 0, "first serve bounce must be on server's half");
  assert(bounces[1].point.z < 0, "second serve bounce must be on receiver's half");
  assert(contacts.some((hit) => hit.kind === "paddle"), "opponent should return a reachable serve");
  assert([simulation.world.state.ball.position.x, simulation.world.state.ball.position.y,
    simulation.world.state.ball.position.z].every(Number.isFinite), "ball position must remain finite");
  assert(scoreChanges > 0, "app event bus must receive simulation events");
  simulation.restart();
  assert(simulation.match.phase() === "serve" && simulation.match.scoreboard.score("home") === 0,
    "session restart must reset both match rules and ball state");
  contacts.length = 0;
  simulation.match.start("away");
  for (let tick = 0; tick < 400; tick += 1) simulation.fixedUpdate(1 / 240, tick);
  const awayBounces = contacts.filter((hit) => hit.kind === "table");
  assert(awayBounces.length >= 2 && awayBounces[0].point.z < 0 && awayBounces[1].point.z > 0,
    "AI serve must happen automatically and bounce on both halves in reverse order");

  simulation.restart();
  simulation.setInput({ ...input, serve: true });
  simulation.fixedUpdate(1 / 240, 401);
  assert(simulation.match.serve.isActive(), "starting a serve must create an active serve plan");
  simulation.restart(); // abort a serve while it is still in the toss phase
  assert(!simulation.match.serve.isActive() && !simulation.match.rally.state.active,
    "restart must discard the old toss and rally");
  simulation.setInput({ ...input, serve: true });
  simulation.fixedUpdate(1 / 240, 402);
  assert(simulation.match.serve.isActive(), "a fresh serve must be possible immediately after restart");
}

function testModelConstruction(): void {
  const context = {
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: () => {}, clearRect: () => {}, fillRect: () => {},
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
    ellipse: () => {}, fillText: () => {},
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "center"
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) }
  });
  const materials = createMaterialPalette();
  const table = new TableVisual(materials);
  const world = new PhysicsWorld(new EventBus());
  table.updateNet(world.net.positions());
  const net = table.group.getObjectByName("woven-net") as THREE.Mesh<THREE.PlaneGeometry> | undefined;
  assert(net?.geometry.getAttribute("position").count === 65, "net must track the deformable simulation grid");
  const firstNetVertex = net.geometry.getAttribute("position");
  assert(Math.abs(firstNetVertex.getX(0)) > TABLE.width * 0.4,
    "net mesh must span the table width, not face across the table");
  const racket = new PaddleVisual("home", materials);
  racket.sync(world.state.paddles.home, 1);
  assert(racket.group.children.some((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.ExtrudeGeometry),
    "racket must have a shaped laminated blade");
  const player = new PlayerVisual("home");
  player.sync(world.state.players.home, world.state.paddles.home, 1, 0);
  assert(player.group.children.length >= 12, "athlete rig must contain body and articulated limbs");
  const arena = new ArenaVisual(materials);
  assert(arena.group.children.some((child) => child instanceof THREE.InstancedMesh),
    "arena seating must use an instanced model");
  arena.dispose(); player.dispose(); racket.dispose(); table.dispose();
}

export function runGameTests(): void {
  const keyboard = mergeInputFrames(emptyInputFrame(), { swing: 1, serve: true });
  const pointer = mergeInputFrames(keyboard, { swing: 0, serve: false });
  assert(pointer.swing === 1 && pointer.serve, "inactive pointer must not cancel a keyboard stroke or serve");
  testTableAndNet();
  testOrderedContinuousContacts();
  testPredictionAgreesWithFlight();
  testRallyScoring();
  testPlayableSimulation();
  testModelConstruction();
  console.log("GAME INTEGRATION PASSED: contacts, rally rules, serve, AI return, and model construction");
}
