import { EventBus } from "../core/EventBus";
import { FixedStepLoop } from "../core/FixedStepLoop";
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
import { BallIntegrator } from "../physics/Integrator";
import { resolveNetContact, resolvePaddleContact, resolveTableBounce } from "../physics/ContactModels";
import { BallState } from "../physics/State";
import { BallPredictor } from "../physics/Predictor";
import { NetCollider } from "../physics/NetCollider";
import { PlayerVisual } from "../render/Player";
import { PaddleVisual } from "../render/Paddle";
import { TableVisual } from "../render/Table";
import { ArenaVisual } from "../render/Arena";
import { createMaterialPalette } from "../render/ProceduralMaterials";
import { getArena } from "../content/ArenaCatalog";
import { ContactEffects } from "../render/ContactEffects";
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

  ball.reset(new Vec3(TABLE.width / 2 + BALL.radius + 0.025, TABLE.top - 0.012, 0.5), new Vec3(-12, 0, 0));
  const apron = world.fixedStep(1 / 120);
  assert(apron.contacts.some((hit) => hit.surfaceId === "table-side"),
    "a fast horizontal ball must strike the vertical apron");
  assert(ball.velocity.x > 0, "side contact must reflect out from the table");

  ball.reset(new Vec3(TABLE.width / 2 + 0.012, TABLE.top + 0.05, 0.5), new Vec3(0, -12, 0));
  const edge = world.fixedStep(1 / 120);
  assert(edge.contacts.some((hit) => hit.surfaceId === "table-edge"),
    "a grazing ball must reach the rounded top edge");
  assert(ball.velocity.x > 0 && ball.velocity.y > 0, "top edge should deflect in both axes");

  ball.reset(new Vec3(TABLE.width / 2 + BALL.radius + 0.03, TABLE.top + 0.05, 0.5), new Vec3(0, -12, 0));
  const miss = world.fixedStep(1 / 120);
  assert(!miss.contacts.some((hit) => hit.kind === "table" || hit.kind === "edge"),
    "a ball outside the edge radius must miss the table");
  ball.reset(new Vec3(TABLE.width / 2 + 0.016, TABLE.top + 0.016, 0.5), new Vec3(0, 0, -12));
  const cornerMiss = world.fixedStep(1 / 120);
  assert(!cornerMiss.contacts.some((hit) => hit.kind === "table" || hit.kind === "edge"),
    "the expanded box must not produce a false hit at a rounded corner");

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
  ball.reset(new Vec3(0, TABLE.top + TABLE.netHeight + 0.07, 0), new Vec3(0, -15, 0));
  const vertical = world.fixedStep(1 / 120);
  assert(vertical.contacts.some((item) => item.surfaceId === "net-cord"),
    "a vertical drop must still hit the top tape");
  ball.reset(new Vec3(world.net.width / 2, TABLE.top + 0.12, 0.15), new Vec3(0, 0, -35));
  const post = world.fixedStep(1 / 120);
  assert(post.contacts.some((item) => item.surfaceId === "net-post-right"),
    "the fixed post must stop a fast ball at the outside of the net");
  assert(ball.velocity.z > 0, "a post strike must reflect away from the post");
  ball.reset(new Vec3(world.net.width / 2 + BALL.radius + 0.052, TABLE.top + 0.12, 0.15),
    new Vec3(0, 0, -35));
  const outsidePost = world.fixedStep(1 / 120);
  assert(!outsidePost.contacts.some((item) => item.surfaceId.startsWith("net-post")),
    "a ball beyond the post radius must miss it");
  ball.reset(new Vec3(0, 1.1, 0), new Vec3(0, 0, -8));
  ball.angularVelocity.set(220, 0, 0);
  const lift = new Aerodynamics(world.tuning).forces(ball).magnus.length();
  assert(lift > 0 && lift < ball.mass * 20,
    "ordinary spin should create bounded aerodynamic lift");
}

function testWovenNet(): void {
  const net = new NetCollider();
  const height = TABLE.top + TABLE.netHeight * 0.43;
  net.applyImpulse(new Vec3(0, height, 0), new Vec3(0, 0, 0.025));
  for (let index = 0; index < 8; index += 1) net.step(1 / 240);
  const nodes = net.positions();
  const center = nodes[2 * 13 + 6];
  assert(center.z > 0.015 && nodes[2 * 13 + 8].z > 0,
    "an impact must displace the weave and propagate to neighboring strands");
  assert(nodes[4 * 13 + 6].z === 0 && nodes[2 * 13].z === 0,
    "the top tape and post edges must stay anchored");
  const ball = new BallState().reset(new Vec3(0, height, 0.13), new Vec3(0, 0, -25));
  ball.position.z = -0.13;
  const hit = net.detect(ball);
  const flatTime = (0.13 - BALL.radius - TABLE.netThickness * 0.5) / 0.26;
  assert(hit?.surfaceId === "net-mesh" && hit.timeOfImpact < flatTime - 0.02,
    "a ball must meet the displaced mesh earlier than the old flat collider");
  const resting = new BallState().reset(new Vec3(), new Vec3(0, 0, -10));
  const moving = resting.clone();
  resolveNetContact(resting, new Vec3(0, 0, 1), 0.22);
  resolveNetContact(moving, new Vec3(0, 0, 1), 0.22, net.velocityAt(0, height));
  assert(moving.velocity.z > resting.velocity.z,
    "moving net strands must transfer some of their velocity to the rebound");
  const world = new PhysicsWorld(new EventBus());
  world.net.restore(net.snapshot());
  const restored = new PhysicsWorld(new EventBus());
  restored.restore(world.snapshot());
  assert(JSON.stringify(restored.net.snapshot()) === JSON.stringify(world.net.snapshot()),
    "rollback must preserve both displacement and velocity of the collision net");
  world.fixedStep(1 / 240, undefined, false);
  restored.fixedStep(1 / 240, undefined, false);
  assert(JSON.stringify(restored.net.snapshot()) === JSON.stringify(world.net.snapshot()),
    "a restored net must propagate its next physics step identically");
  const forecast = new BallPredictor(world.tuning);
  const incoming = new BallState().reset(new Vec3(0, height, 0.13), new Vec3(0, 0, -25));
  const flat = forecast.predict(incoming, 0.02, 1 / 240);
  const bowed = forecast.predict(incoming, 0.02, 1 / 240, net);
  assert(Math.abs(flat.points.at(-1)!.position.z - bowed.points.at(-1)!.position.z) > 0.002,
    "the AI forecast must account for the live net's current deformation");
  net.reset();
  assert(net.positions().every((node) => node.z === 0), "net reset must remove prior rally deformation");
}

function testFlightConvergence(): void {
  const world = new PhysicsWorld(new EventBus());
  const integrator = new BallIntegrator(world.tuning);
  const flight = (steps: number): BallState => {
    const ball = new BallState().reset(new Vec3(0, 1.3, 1), new Vec3(4, 3.4, -10));
    ball.angularVelocity.set(170, 85, -25);
    for (let index = 0; index < steps; index += 1) integrator.integrate(ball, 0.3 / steps);
    return ball;
  };
  const reference = flight(960);
  const coarse = flight(18);
  const fine = flight(72);
  assert(fine.position.distanceTo(reference.position) < coarse.position.distanceTo(reference.position) * 0.25,
    "midpoint aerodynamic integration must converge as the flight step shrinks");
  assert(fine.position.distanceTo(reference.position) < 0.003,
    "a 240 Hz ball trajectory must stay close to a refined reference");
  assert(fine.angularVelocity.length() < 200,
    "free-flight spin must decay without spontaneous energy gain");
}

function testContinuousContactAndSpin(): void {
  const world = new PhysicsWorld(new EventBus());
  const held = world.state.paddles.home;
  world.paddles.placeForInput(held, held.position.clone(), new Vec3(0.8, 0, -0.6), 1 / 240);
  const turn = Math.acos(Math.max(-1, Math.min(1, held.normal.dot(new Vec3(0, 0, -1)))));
  assert(turn > 0 && turn <= 24 / 240 + 1e-6,
    "racket aim must rotate at a bounded angular rate rather than snapping instantly");
  const beforeReverse = held.normal.clone();
  world.paddles.placeForInput(held, held.position.clone(), beforeReverse.clone().negate(), 1 / 240);
  const reverseTurn = held.normal.angleTo(beforeReverse);
  assert(reverseTurn > 0 && reverseTurn <= 24 / 240 + 1e-6,
    "opposite aim directions must keep rotating without a singularity");
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

  const rotating = new PhysicsWorld(new EventBus());
  rotating.state.ball.reset(new Vec3(0.05, 1, 0.95), new Vec3());
  const rotationHit = rotating.fixedStep(1 / 120, () => {
    rotating.state.paddles.home.normal.set(-0.6, 0, -0.8);
  });
  assert(rotationHit.contacts.some((hit) => hit.kind === "paddle"),
    "a rotating face must sweep into a stationary ball");
  const opening = new PhysicsWorld(new EventBus());
  opening.state.ball.reset(new Vec3(-0.05, 1, 0.95), new Vec3());
  const openingStep = opening.fixedStep(1 / 120, () => {
    opening.state.paddles.home.normal.set(-0.6, 0, -0.8);
  });
  assert(!openingStep.contacts.some((hit) => hit.kind === "paddle"),
    "an opening racket must not invent a collision");

  const racket = moving.state.paddles.home;
  racket.position.set(0, 1, 1);
  racket.previousPosition.copy(racket.position);
  racket.normal.set(0, 0, -1);
  racket.angularVelocity.set(0, 0, 0);
  racket.velocity.set(0, 0, 0);
  racket.swingVelocity.set(0, 0, 0);
  const brushed = new BallState().reset(new Vec3(0, 1, 0.98), new Vec3(0, 0, 4));
  const frictionless = brushed.clone();
  resolvePaddleContact(brushed, racket, world.tuning.rubber, new Vec3(240, 0, 0));
  resolvePaddleContact(frictionless, racket, { ...world.tuning.rubber, friction: 0 }, new Vec3(240, 0, 0));
  assert(brushed.angularVelocity.length() > 1 && frictionless.angularVelocity.length() < 1e-6,
    "brushing spin must come from a friction impulse, not an unconditional spin bonus");

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

function testForecastAndRestoration(): void {
  const world = new PhysicsWorld(new EventBus());
  const ball = world.state.ball;
  // This trajectory crosses the home racket's idle position before the table.
  // The prediction is for free flight, so the stationary racket cannot reflect it.
  ball.reset(new Vec3(0, 1.12, 0.45), new Vec3(0, 0, 3.5));
  const predictor = new BallPredictor(world.tuning);
  const forecast = predictor.predict(ball, 0.32, 1 / 240);
  assert(forecast.points.some((point) => point.position.z > 1.1 && point.velocity.z > 0),
    "trajectory prediction must disable both rackets after resetting its world");
  const again = predictor.predict(ball, 0.32, 1 / 240);
  assert(Math.abs(forecast.points.at(-1)!.position.z - again.points.at(-1)!.position.z) < 1e-9,
    "repeat forecasts must start from the same independent physics state");

  ball.lastContactSide = "away";
  ball.lastHitTick = 17;
  ball.contactCount = 4;
  const restored = new PhysicsWorld(new EventBus());
  restored.restore(world.snapshot());
  assert(restored.state.ball.lastContactSide === "away" && restored.state.ball.lastHitTick === 17 &&
    restored.state.ball.contactCount === 4,
    "rollback must preserve the ball's contact history used by rally logic");
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
  events.emit("physics:contact", {
    ...contact("edge", "away"), surfaceId: "table-side"
  });
  assert(scoreboard.score("away") === 2,
    "a vertical apron strike must not count as a legal service bounce");

  events.emit("rally:start", { server: "home" });
  events.emit("physics:contact", contact("table", "home"));
  events.emit("physics:contact", contact("table", "away"));
  events.emit("physics:contact", contact("paddle", "away"));
  events.emit("physics:contact", contact("paddle", "home"));
  assert(scoreboard.score("away") === 3, "volley before bounce awards striker's opponent");
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
  assert(simulation.ai.predictionPoints().length === 0 &&
    simulation.world.state.paddles.away.position.z < -0.8,
    "the opponent should wait behind its baseline without forecasting an idle ball");
  const footWorld = new PhysicsWorld(new EventBus());
  footWorld.state.players.away.velocity.set(0, 0, 10);
  footWorld.fixedStep(0.2, undefined, false);
  assert(footWorld.state.players.away.position.z <= -TABLE.length / 2 - 0.13,
    "an athlete's body must stop behind the far table edge while the racket reaches in");
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
  assert(simulation.match.phase() === "serve" && simulation.match.scoreboard.score("home") === 0,
    "session restart must reset both match rules and ball state");
  assert(simulation.ai.predictionPoints().length === 0,
    "a new session must discard the previous rally's AI prediction");
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
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
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
  assert(firstNetVertex.getY(0) > firstNetVertex.getY(firstNetVertex.count - 1),
    "the visual net's top row must follow the simulation's top row");
  const racket = new PaddleVisual("home", materials);
  racket.sync(world.state.paddles.home, 1);
  assert(racket.group.children.some((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.ExtrudeGeometry),
    "racket must have a shaped laminated blade");
  const player = new PlayerVisual("home");
  player.sync(world.state.players.home, world.state.paddles.home, 1, 0);
  world.state.ball.position.set(0.65, 1.13, 0.25);
  player.sync(world.state.players.home, world.state.paddles.home, 1, 0.05, world.state.ball);
  const head = player.group.getObjectByName("athlete-head-rig");
  assert(head && head.children.length > 8 && Math.abs(head.rotation.y) > 0.02,
    "the athlete's face, hair and eyes must track the live ball as one articulated rig");
  assert(player.group.children.length >= 12 && Boolean(player.group.getObjectByName("athlete-torso")),
    "athlete rig must contain a sculpted torso and articulated limbs");
  const torso = player.group.getObjectByName("athlete-torso") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  assert(torso.material.map instanceof THREE.CanvasTexture,
    "the athlete's jersey must use its own woven uniform texture");
  const arena = new ArenaVisual(materials);
  let instancedSeats = false;
  arena.group.traverse((child) => { instancedSeats ||= child instanceof THREE.InstancedMesh; });
  assert(instancedSeats,
    "arena seating must use an instanced model");
  assert(Boolean(arena.group.getObjectByName("broadcast-camera")),
    "arena must include broadcast production detail");
  arena.setProfile(getArena("training-lab"));
  const gallery = arena.group.getObjectByName("arena-side-stands");
  const floor = arena.group.getObjectByName("arena-floor") as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  assert(gallery?.visible === false && floor.material.map instanceof THREE.CanvasTexture,
    "training must switch to its own textured court without a competition gallery");
  const trainingFloor = floor.material.map;
  arena.setProfile(getArena("club-hall"));
  assert(floor.material.map !== trainingFloor && gallery?.visible === false,
    "club hall must use a separate wood finish");
  arena.setProfile(getArena("national-arena"));
  assert(arena.group.getObjectByName("arena-side-stands")?.visible === true,
    "the national arena must enable its instanced side galleries");
  assert(arena.dressing.national.visible && !arena.dressing.club.visible &&
    arena.group.getObjectByName("ceiling-coffers") instanceof THREE.InstancedMesh,
    "competition architecture and instanced ceiling panels must follow the venue");
  arena.setProfile(getArena("night-court"));
  assert(arena.dressing.night.visible && Boolean(arena.group.getObjectByName("night-portal")),
    "the night venue must have its own architectural silhouette");
  assert(Boolean(arena.group.getObjectByName("arena-score-display")),
    "the court must show live match scores in the 3D arena");
  assert(Boolean(arena.group.getObjectByName("venue-display")) &&
    arena.group.getObjectsByProperty("name", "court-light-pool").length === 9,
    "venues must include their shared architectural displays and floor lighting");
  arena.updateScore(9, 10, 1, 1);
  const effects = new ContactEffects();
  effects.record(contact("table", "home"));
  assert(effects.group.children.some((child) => child.visible),
    "a real table impact must briefly show its contact cue");
  effects.update(0.26);
  assert(effects.group.children.every((child) => !child.visible),
    "table contact cues must expire without accumulating visible objects");
  arena.dispose(); player.dispose(); racket.dispose(); table.dispose();
}

export function runGameTests(): void {
  const loop = new FixedStepLoop(new EventBus(), 120);
  let sampled = false;
  loop.onBeforeStep(() => { sampled = true; });
  loop.add({ fixedUpdate: () => assert(sampled, "input must be sampled before simulation") });
  assert(loop.step(1 / 60) === 2, "fixed update should run twice at 120 Hz for a 60 Hz frame");
  loop.dispose();
  const keyboard = mergeInputFrames(emptyInputFrame(), { swing: 1, serve: true });
  const pointer = mergeInputFrames(keyboard, { swing: 0, serve: false });
  assert(pointer.swing === 1 && pointer.serve, "inactive pointer must not cancel a keyboard stroke or serve");
  testTableAndNet();
  testWovenNet();
  testContinuousContactAndSpin();
  testFlightConvergence();
  testForecastAndRestoration();
  testRallyScoring();
  testPlayableSimulation();
  testModelConstruction();
  console.log("GAME INTEGRATION PASSED: contacts, rally rules, serve, AI return, and model construction");
}
