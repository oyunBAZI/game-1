import { EventBus } from "../core/EventBus";
import { Vec3 } from "../core/Vec3";
import type { CollisionContact, InputFrame, Side } from "../core/types";
import { GameSimulation } from "../game/GameSimulation";
import { RallyController } from "../game/RallyController";
import { Scoreboard } from "../game/Scoreboard";
import { TRAINING_RULES } from "../game/Rules";
import { MatchController } from "../game/MatchController";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { BALL, TABLE } from "../physics/constants";
import { Aerodynamics } from "../physics/Aerodynamics";
import { resolvePaddleContact, resolveTableBounce } from "../physics/ContactModels";
import { BallState } from "../physics/State";
import { TableCollider } from "../physics/TableCollider";
import { AIBrain } from "../game/AIBrain";
import { createDefaultConfig } from "../config/GameConfig";
import { solveTwoBone } from "../render/TwoBoneIK";
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
  ball.reset(new Vec3(0, TABLE.top + TABLE.netHeight + 0.019, 0.1), new Vec3(0, -0.2, -10));
  const skim = world.fixedStep(1 / 120);
  assert(skim.contacts.some((item) => item.surfaceId === "net-cord"),
    "a grazing ball must hit the cord rather than the net mesh");
  assert(ball.velocity.y > 0, "the cord should deflect a grazing ball upward");
  ball.reset(new Vec3(0, 1.1, 0), new Vec3(0, 0, -8));
  ball.angularVelocity.set(220, 0, 0);
  const lift = new Aerodynamics(world.tuning).forces(ball).magnus.length();
  assert(lift > 0 && lift < ball.mass * 20,
    "ordinary spin should create bounded aerodynamic lift");
}

function testContinuousContactAndSpin(): void {
  const world = new PhysicsWorld(new EventBus());
  const ball = world.state.ball;
  ball.reset(new Vec3(0, TABLE.top + BALL.radius + 0.08, 0.07), new Vec3(0, -20, -30));
  const step = world.fixedStep(1 / 120);
  assert(step.contacts[0]?.kind === "net" && step.contacts[1]?.kind === "table",
    "a fast ball must resolve the net before its table bounce within one step");
  assert(step.contacts[0].timeOfImpact < step.contacts[1].timeOfImpact,
    "contact times must be ordered across the complete fixed step");

  const moving = new PhysicsWorld(new EventBus());
  moving.state.ball.reset(new Vec3(0.05, 1, 1.08), new Vec3());
  moving.state.paddles.home.position.set(0, 1, 1.2);
  const stroke = moving.fixedStep(1 / 120, () => {
    moving.state.paddles.home.position.z = 1;
    moving.state.paddles.home.normal.set(0.5, 0, -0.8660254).normalize();
  });
  assert(stroke.contacts.some((hit) => hit.kind === "paddle"),
    "a moving, angled racket must strike a near stationary ball");
  assert(moving.state.ball.velocity.z < -1 && moving.state.ball.velocity.x > 0,
    "the racket's face angle must steer its outgoing ball");

  const table = world.tuning.table;
  const backspin = new BallState().reset(new Vec3(), new Vec3(0, -3, -5));
  const topspin = backspin.clone();
  backspin.angularVelocity.x = 100;
  topspin.angularVelocity.x = -100;
  resolveTableBounce(backspin, new Vec3(0, 1, 0), table);
  resolveTableBounce(topspin, new Vec3(0, 1, 0), table);
  assert(topspin.velocity.z < backspin.velocity.z,
    "topspin should kick forward more than backspin after the table bounce");
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

  const letEvents = new EventBus();
  const letWorld = new PhysicsWorld(letEvents);
  const match = new MatchController(letEvents, letWorld, TRAINING_RULES);
  let lets = 0;
  letEvents.on("rally:let", () => { lets += 1; });
  match.start("home");
  assert(match.serveNow(), "the home server should start the point");
  match.update(0.13);
  letEvents.emit("physics:contact", contact("table", "home"));
  letEvents.emit("physics:contact", contact("net", "home"));
  letEvents.emit("physics:contact", contact("table", "away"));
  assert(lets === 1 && match.scoreboard.pointsPlayed === 0 && match.currentServer() === "home",
    "a legal net serve must replay with the same server and no point");
  assert(match.phase() === "serve", "a let must return the match to the serve phase");
  match.dispose();
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
  assert(contacts.some((hit) => hit.kind === "paddle" && hit.side === "away"),
    "opponent should return a reachable serve after the legal receiver bounce");
  assert([simulation.world.state.ball.position.x, simulation.world.state.ball.position.y,
    simulation.world.state.ball.position.z].every(Number.isFinite), "ball position must remain finite");
  assert(scoreChanges > 0, "app event bus must receive simulation events");
  simulation.restart();
  assert(simulation.stats.sides.home.pointsWon === 0 && simulation.stats.sides.away.hits === 0, "restart must clear statistics");
  assert(simulation.match.phase() === "serve" && simulation.match.scoreboard.score("home") === 0,
    "session restart must reset both match rules and ball state");
  assert(!simulation.match.serve.isActive() && !simulation.match.rally.state.active,
    "restarting during a rally must discard the previous serve and rally");
  contacts.length = 0;
  simulation.match.start("away");
  for (let tick = 0; tick < 400; tick += 1) simulation.fixedUpdate(1 / 240, tick);
  const awayBounces = contacts.filter((hit) => hit.kind === "table");
  assert(awayBounces.length >= 2 && awayBounces[0].point.z < 0 && awayBounces[1].point.z > 0,
    "AI serve must happen automatically and bounce on both halves in reverse order");
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
  assert(Boolean(arena.group.getObjectByName("arena-score-display")),
    "the court must show live match scores in the 3D arena");
  arena.updateScore(9, 10, 1, 1);
  arena.dispose(); player.dispose(); racket.dispose(); table.dispose();
}

function testSlabAndContactBudget(): void {
  const collider = new TableCollider();
  const ball = new BallState();
  // A lateral hit below the top was invisible to the old downward-only test.
  for (const sign of [-1, 1]) {
    ball.reset(new Vec3(sign * (TABLE.width / 2 + 0.10), TABLE.top - 0.014, 0.5), new Vec3(-sign * 20, 0, 0));
    ball.position.x -= sign * 0.20;
    const hit = collider.detect(ball);
    assert(hit?.surface === "side" && hit.normal.x * sign > 0.99,
      "horizontal ball must hit either vertical side of the slab");
    assert(Math.abs(hit.contact.timeOfImpact - 0.4) < 1e-6, "side TOI must match analytic distance");
  }
  ball.reset(new Vec3(TABLE.width / 2 + 0.015, TABLE.top + 0.08, 0.5), new Vec3(0, -10, 0));
  ball.position.y -= 0.12;
  const edge = collider.detect(ball);
  assert(edge?.surface === "edge" && edge.normal.x > 0.7 && edge.normal.y > 0.6,
    "a real rounded edge hit needs a geometric normal");
  ball.reset(new Vec3(TABLE.width / 2 + 0.019, TABLE.top + 0.08, TABLE.length / 2 + 0.019), new Vec3(0, -10, 0));
  ball.position.y -= 0.12;
  assert(collider.detect(ball) === null, "expanded box corners must not create phantom sphere hits");
  ball.reset(new Vec3(0, TABLE.top - 0.10, 0.5), new Vec3(0, 10, 0));
  ball.position.y += 0.12;
  assert(collider.detect(ball)?.normal.y === -1, "rising balls must hit the underside");

  const world = new PhysicsWorld(new EventBus());
  const paddle = world.state.paddles.home;
  paddle.normal.set(0, 0, -1);
  paddle.velocity.set(0, 0, 0); paddle.swingVelocity.set(0, 0, 0);
  for (let sample = 0; sample < 100; sample += 1) {
    ball.reset(new Vec3(0, 1, 1), new Vec3(Math.sin(sample) * 4, Math.cos(sample) * 3, 1 + sample / 10));
    ball.angularVelocity.set(Math.sin(sample * 3) * 300, Math.cos(sample * 2) * 200, 30);
    const response = resolvePaddleContact(ball, paddle, world.tuning.rubber, new Vec3());
    assert(response.energyAfter <= response.energyBefore + 1e-9,
      "passive stationary rubber cannot add total kinetic energy");
  }
  ball.reset(new Vec3(0, 1, 1), new Vec3(0, 0, 0.000001));
  resolvePaddleContact(ball, paddle, world.tuning.rubber, new Vec3(1000, 0, 0));
  assert(ball.angularVelocity.length() < 0.001,
    "spin control cannot inject large spin into a grazing, near-zero-force contact");
}

function testSideScoringAndAI(): void {
  const events = new EventBus();
  const world = new PhysicsWorld(events);
  const score = new Scoreboard(events, TRAINING_RULES);
  const rally = new RallyController(events, world, score);
  events.emit("rally:start", { server: "home" });
  events.emit("physics:contact", contact("table", "home"));
  const side = contact("edge", "away");
  side.normal = { x: 1, y: 0, z: 0 };
  events.emit("physics:contact", side);
  assert(score.score("away") === 1 && rally.state.pointReason === "service-table-side",
    "a serve into the receiver's vertical side is a fault");
  events.emit("rally:start", { server: "home" });
  events.emit("physics:contact", contact("table", "home"));
  events.emit("physics:contact", contact("table", "away"));
  events.emit("physics:contact", side);
  assert(score.score("home") === 1, "side hit after a legal bounce awards the last hitter");
  rally.dispose();

  const config = createDefaultConfig();
  const ai = new AIBrain("away", config.difficulty, world.tuning);
  world.state.ball.reset(new Vec3(0, 0.95, -0.70), new Vec3(0, 1.2, -3));
  const action = ai.update(1 / 240, world.state.ball, world.state.players.away, world.state.paddles.away, true);
  assert(action.swing > 0 && action.paddleTarget.z < -0.7,
    "AI must intercept an already-bounced ball before its next bounce");
  const root = new THREE.Vector3(0, 1, 0);
  const joint = new THREE.Vector3(), end = new THREE.Vector3();
  for (const target of [new THREE.Vector3(0.3, 0.7, 0.1), new THREE.Vector3(5, 5, 5), root.clone()]) {
    solveTwoBone(root, target, new THREE.Vector3(1, 1, 0), 0.34, 0.33, joint, end);
    assert(Math.abs(root.distanceTo(joint) - 0.34) < 1e-6 && Math.abs(joint.distanceTo(end) - 0.33) < 1e-6,
      "IK must preserve both limb lengths for reachable, distant and coincident targets");
  }
}

export function runGameTests(): void {
  const keyboard = mergeInputFrames(emptyInputFrame(), { swing: 1, serve: true });
  const pointer = mergeInputFrames(keyboard, { swing: 0, serve: false });
  assert(pointer.swing === 1 && pointer.serve, "inactive pointer must not cancel a keyboard stroke or serve");
  testSlabAndContactBudget();
  testSideScoringAndAI();
  testTableAndNet();
  testContinuousContactAndSpin();
  testRallyScoring();
  testPlayableSimulation();
  testModelConstruction();
  console.log("GAME INTEGRATION PASSED: contacts, rally rules, serve, AI return, and model construction");
}
