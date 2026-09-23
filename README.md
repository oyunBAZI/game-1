# 🏓 Table Tennis Ultra

## Current playable build

This repository is an evolving Three.js table tennis game. Run `npm ci` and `npm run dev`, open the local URL, choose a serve spin and venue, select **Start session**, and press **Enter** to serve. Move with WASD, aim the paddle with the pointer, hold Space or the pointer button to swing, press C for camera modes, and Escape to pause or change the serve selection. The opponent serves automatically on its turn.

The scene includes articulated athletes with sculpted torsos and procedural sportswear, laminated rackets, a regulation table, a woven deformable net, textured competition flooring, arena seating and a live 3D scoreboard. Choose between the Training Lab, Club Hall, National Arena and Night Court; each changes the venue palette, crowd, lighting, signage and set dressing. Lighting uses room reflections, venue fixtures and soft shadows; the ball has a height-sensitive table shadow. The 240 Hz simulation resolves swept contacts in time order against the full tabletop, including rotating and translating rackets, top edges, vertical apron and the net cord. Brushing spin now comes from a tangential rubber friction impulse rather than directly modifying the ball's angular velocity. Apron hits lose the point rather than becoming legal bounces. Input is sampled immediately before physics in a single frame loop. Legal net serves replay as lets, and the AI predicts with the same physics as the live ball. `npm run typecheck`, `npm run test:simulation`, `npm run validate`, and `npm run build` are the project gates. Coefficients are gameplay approximations; scanned human models, authored animation and measured equipment calibration remain future work.

### Collision and rendering notes

- Racket contact follows the face while it translates **and** rotates during the fixed step. The first signed-distance crossing is refined with bisection, checked against the elliptical blade, and resolved with its contact-time normal and racket surface velocity.
- Player spin input represents a bounded brushing speed. Rubber friction limits tangential impulse and spin transfer, so a frictionless racket cannot add spin from input alone.
- Materials and venue details are generated locally: wood veneer, rubber grain, table paint, floor vinyl, fabric, skin grain, tournament signs, benches, training cart, lighting rigs and a broadcast camera. There are no runtime downloads for scene assets.
- These are detailed procedural assets, not photogrammetry or a production character pipeline. The visual target remains a long-term goal; this build does not claim native AAA fidelity.

### Latest improvements

- The National Arena now has instanced spectator galleries along both sidelines. Each venue has its own generated floor finish and backdrop: training lab panels, club wood slats, tournament seating, or a night-court light portal. Athlete jerseys have distinct woven prints, sculpted head silhouettes, shoe details and lateral footwork. The ball casts a soft, height-dependent contact shadow.
- Racket aim rotates at a bounded angular speed. A vertical drop onto the net tape now receives a cord collision. Trajectory forecasts disable both rackets after every reset and report the first actual tabletop impact; the AI no longer aims from ghost racket rebounds. Rollback snapshots retain the ball's last hitter and contact history. The rendered net now maps its upper row to the physical tape rather than to the floor edge.
- All four development gates (`npm run typecheck`, `npm run test:simulation`, `npm run validate`, `npm run build`) exercise this pass. There are no external 3D or texture requests. The characters and venues remain procedural game assets, not scanned models or an authored AAA animation pipeline.

> A high-fidelity, physics-driven 3D table tennis simulation built for the browser with **Three.js**, designed to push WebGL graphics, ball physics, animation, audio, AI, and player control as far as realistically possible.

[Three.js](https://img.shields.io/badge/Three.js-WebGL-black)
[JavaScript](https://img.shields.io/badge/JavaScript-ES2023-yellow)
[WebGL](https://img.shields.io/badge/WebGL-2.0-red)
[Physics](https://img.shields.io/badge/Physics-High%20Fidelity-blue)
[Status](https://img.shields.io/badge/Status-In%20Development-orange)

---

# Table of Contents

- [Overview](#overview)
- [Vision](#vision)
- [Core Principles](#core-principles)
- [Features](#features)
- [Graphics](#graphics)
- [Physics](#physics)
- [Ball Simulation](#ball-simulation)
- [Spin Simulation](#spin-simulation)
- [Paddle Physics](#paddle-physics)
- [Table and Net Physics](#table-and-net-physics)
- [Player Movement](#player-movement)
- [Animation](#animation)
- [Camera System](#camera-system)
- [Lighting](#lighting)
- [Materials](#materials)
- [Visual Effects](#visual-effects)
- [Audio](#audio)
- [AI Opponents](#ai-opponents)
- [Game Modes](#game-modes)
- [Controls](#controls)
- [Rules](#rules)
- [Difficulty System](#difficulty-system)
- [Performance Targets](#performance-targets)
- [Adaptive Graphics](#adaptive-graphics)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Suggested Folder Structure](#suggested-folder-structure)
- [Installation](#installation)
- [Development](#development)
- [Configuration](#configuration)
- [Physics Configuration](#physics-configuration)
- [Graphics Configuration](#graphics-configuration)
- [Debugging](#debugging)
- [Testing](#testing)
- [Accessibility](#accessibility)
- [Browser Support](#browser-support)
- [Development Rules](#development-rules)
- [Milestones](#milestones)
- [Future Features](#future-features)
- [License](#license)

---

# Overview

**Table Tennis Ultra** is an attempt to create an unusually realistic table tennis game entirely inside a modern web browser.

This is not intended to be a simple arcade Pong-style game.

The goal is to simulate actual table tennis.

The project focuses heavily on:

- realistic ball trajectories
- realistic paddle contact
- physically simulated spin
- topspin
- backspin
- sidespin
- mixed spin
- air resistance
- Magnus-force effects
- table friction
- paddle rubber friction
- ball deformation approximations
- realistic bounce behavior
- physically believable net collisions
- human-like opponent AI
- responsive player controls
- professional-quality rendering
- physically based materials
- cinematic lighting
- high-quality animation
- positional audio
- realistic indoor environments
- extremely low input latency

The objective is for rallies to feel fundamentally different depending on how the player strikes the ball.

A topspin forehand should not simply be a faster normal shot.

A chopped defensive ball should not simply travel more slowly.

Spin, speed, paddle angle, paddle velocity, contact location, incoming ball rotation, and rubber properties should all contribute to the resulting trajectory.

---

# Vision

The long-term goal is to create something visually closer to a high-end console sports game than a conventional browser game.

The desired experience is:

> **Virtua Tennis / Eleven Table Tennis / modern sports simulation quality — but implemented with Three.js and WebGL/WebGPU technologies.**

When the player hits the ball, the game should calculate a believable physical result rather than selecting from a small library of predefined trajectories.

Every rally should therefore be capable of developing differently.

The simulation should reward actual table-tennis concepts:

- timing
- positioning
- paddle angle
- shot preparation
- acceleration
- spin recognition
- footwork
- anticipation
- recovery
- placement
- tactical variation

---

# Core Principles

## 1. Physics before animation

Gameplay must never be built around fake animation-driven ball trajectories.

The ball exists inside the physical simulation.

Animations react to the simulation.

The simulation does not bend itself around animations.

---

## 2. Input must feel immediate

Input latency is one of the highest-priority engineering concerns.

Player input should be sampled every frame.

Avoid unnecessary interpolation between input and racket movement.

The visual paddle and physical paddle should remain tightly synchronized.

---

## 3. Spin must be real

Spin cannot be represented as a visual effect alone.

Angular velocity must influence:

- airflow
- trajectory curvature
- table bounce
- paddle collisions
- net interaction

---

## 4. No scripted rallies

The game should not secretly decide where the ball will land.

Ball trajectories emerge from physics.

---

## 5. Graphics must support gameplay

Visual fidelity matters, but gameplay clarity takes priority.

The ball must remain readable at:

- high velocity
- extreme spin
- long distance
- bright lighting
- dark environments

---

# Features

Planned core features include:

- full 3D gameplay
- regulation-sized table
- regulation-sized ball
- physically simulated paddles
- high-frequency collision detection
- continuous ball collision detection
- dynamic spin
- topspin
- backspin
- sidespin
- combination spin
- realistic table bounce
- realistic rubber interaction
- edge hits
- net clips
- let detection
- service detection
- configurable equipment
- realistic player movement
- procedural shot animation
- inverse kinematics
- motion blending
- advanced opponent AI
- practice mode
- rally mode
- match mode
- tournament mode
- replay system
- slow motion
- instant replay
- statistics
- shot telemetry
- physics debugger
- configurable graphics
- controller support
- mouse controls
- keyboard controls
- touch support where practical
- 3D spatial audio

---

# Graphics

The project targets a highly polished visual presentation.

The renderer should use the highest-quality pipeline supported by the user's hardware while gracefully scaling down.

Target rendering features include:

### Physically Based Rendering

Materials should use physically based properties whenever appropriate.

Examples:

- roughness
- metalness
- normal maps
- ambient occlusion
- clearcoat
- anisotropy
- transmission where needed

---

## High Dynamic Range Lighting

HDR environment maps should contribute to:

- reflections
- indirect lighting
- metallic surfaces
- floor reflections
- realistic paddle highlights

Tone mapping should preserve realistic contrast without crushing shadow detail.

Recommended tone mapping:

```js
renderer.toneMapping = THREE.ACESFilmicToneMapping;

```

---

# Physics

Physics is the core of the game.

The simulation should preferably run independently from rendering.

Recommended architecture:

```text
Rendering
60–240 FPS

        ↓

Game State

        ↓

Fixed Physics Simulation
240–1000 Hz

```

High-frequency simulation is especially important because a table-tennis ball can exceed:

```text
100 km/h

```

At these velocities, a conventional 60 Hz physics simulation can allow the ball to move several centimeters between simulation steps.

That is enough to produce:

- missed paddle collisions
- missed net collisions
- table tunneling
- inconsistent bounce behavior

Physics therefore uses:

- fixed timesteps
- continuous collision detection
- swept collision tests
- interpolation for rendering

---

# Ball Simulation

A regulation table-tennis ball has approximately:

```text
Diameter: 40 mm
Radius: 20 mm
Mass: 2.7 g

```

Internally use SI units whenever possible.

```js
const BALL = {
    radius: 0.02,
    mass: 0.0027
};

```

Ball state includes:

```js
{
    position,
    linearVelocity,
    angularVelocity,
    previousPosition,
    acceleration,
    spinAxis,
    spinRate
}

```

---

# Aerodynamic Drag

Air resistance should affect the ball.

A simplified drag model:

```text
Fd = ½ ρ Cd A v²

```

where:

```text
ρ  = air density
Cd = drag coefficient
A  = cross-sectional area
v  = ball velocity

```

Drag acts opposite the direction of motion.

Conceptually:

```js
const dragDirection = velocity.clone().normalize().negate();

const dragMagnitude =
    0.5 *
    AIR_DENSITY *
    DRAG_COEFFICIENT *
    BALL_AREA *
    velocity.lengthSq();

force.add(
    dragDirection.multiplyScalar(dragMagnitude)
);

```

---

# Spin Simulation

Spin is one of the defining mechanics of the game.

The simulation must track actual angular velocity.

```js
ball.angularVelocity = new THREE.Vector3();

```

Spin should affect flight through the Magnus effect.

Approximate Magnus force:

```text
Fm ∝ ω × v

```

where:

```text
ω = angular velocity
v = linear velocity

```

Conceptually:

```js
const magnus = new THREE.Vector3()
    .crossVectors(
        ball.angularVelocity,
        ball.velocity
    )
    .multiplyScalar(MAGNUS_COEFFICIENT);

```

---

## Topspin

Topspin should:

- pull the ball downward
- create a more aggressive arc
- allow harder shots to land on the table
- accelerate forward after bouncing
- react strongly to paddle angle

---

## Backspin

Backspin should:

- increase float
- reduce forward velocity after bounce
- occasionally cause very heavy chops to kick backward
- require upward paddle compensation

---

## Sidespin

Sidespin should:

- curve laterally during flight
- change sideways velocity after table contact
- alter return angles when striking the opponent's paddle

---

## Combined Spin

Spin must be represented as a 3D vector rather than simple labels.

A ball may simultaneously have:

```text
topspin + sidespin

```

or:

```text
backspin + sidespin

```

This allows serves such as:

```text
pendulum serve
reverse pendulum
tomahawk
hook serve
backspin serve
topspin serve
no-spin serve

```

to emerge naturally.

---

# Paddle Physics

The paddle should not act as a simple flat collider.

Collision calculations should account for:

```text
Paddle position
Paddle normal
Paddle velocity
Paddle angular velocity
Ball velocity
Ball angular velocity
Contact location
Rubber friction
Rubber elasticity
Collision duration approximation

```

The outgoing velocity should depend heavily on relative velocity.

```text
relativeVelocity =
    ballVelocity -
    paddleVelocityAtContact

```

The tangential component contributes to spin.

---

# Paddle Sweet Spot

Paddle contact may optionally include subtle differences across the racket face.

Center contact can produce:

- maximum consistency
- predictable rebound

Edge contact can create:

- weaker shots
- unusual trajectories
- higher error probability

This effect should remain subtle.

The game should not artificially punish players.

---

# Rubber Simulation

Different paddle rubber may expose parameters such as:

```js
{
    restitution: 0.82,
    friction: 0.91,
    spinTransfer: 1.0,
    dwellTime: 0.004,
    hardness: 47.5
}

```

Equipment differences should be physically meaningful but not exaggerated.

---

# Table and Net Physics

Regulation table dimensions:

```text
Length: 2.74 m
Width: 1.525 m
Height: 0.76 m
Net height: 0.1525 m

```

Use real dimensions inside the simulation.

---

## Table Bounce

Table collisions should consider:

- incoming linear velocity
- incoming spin
- surface friction
- restitution
- collision angle

The outgoing trajectory should therefore differ between:

- flat ball
- topspin
- backspin
- sidespin

---

# Edge Hits

The table must support edge collisions.

An edge hit should not be represented by checking only whether the ball touched the table rectangle.

Actual collision geometry should allow contact with:

- top surface
- side surface
- table edge

Edge hits should produce naturally unpredictable trajectories.

---

# Net Physics

The net should support several levels of simulation.

### Basic

Static collision plane.

### Advanced

Soft-body approximation.

### Ultra

Segmented deformable net.

The ideal implementation uses a grid of connected nodes:

```text
●—●—●—●—●
|  |  |  |  |
●—●—●—●—●
|  |  |  |  |
●—●—●—●—●

```

Ball contact transfers force into nearby nodes.

The net briefly deforms before returning to rest.

Net clips should occasionally:

- slow the ball
- redirect the ball
- allow the ball to cross
- drop the ball immediately

depending entirely on collision conditions.

---

# Player Movement

The player should never feel like a camera attached to a floating paddle.

Movement includes:

- lateral stepping
- forward/backward movement
- weight transfer
- body rotation
- crouching
- recovery
- foot planting

---

# Footwork

Possible procedural states:

```text
READY
FOREHAND_PREP
FOREHAND_SWING
BACKHAND_PREP
BACKHAND_SWING
PUSH
BLOCK
CHOP
LOOP
SMASH
SERVE
RECOVERY
SIDESTEP
CROSS_STEP

```

State transitions should remain responsive.

Animation should never prevent a valid player input simply because a previous animation has not completed.

---

# Animation

Player animation should combine:

- skeletal animation
- animation blending
- inverse kinematics
- procedural racket positioning
- physics-driven corrections

Recommended pipeline:

```text
Input
↓
Desired paddle pose
↓
Shot classification
↓
Animation selection
↓
Animation blending
↓
IK correction
↓
Final skeleton

```

---

# Inverse Kinematics

IK is especially important for:

- racket hand
- elbow
- shoulder
- torso
- non-racket arm

The racket must align with the actual gameplay paddle.

The animation system should follow the physical paddle instead of allowing visual and physical rackets to diverge.

---

# Camera System

Several camera modes should be available.

### Player Camera

A natural third-person perspective behind the player.

### Competitive Camera

Stable view optimized for gameplay.

### Broadcast Camera

Television-style presentation.

### Side Camera

Useful for analysis.

### Free Camera

Useful for debugging and replay.

### Ball Camera

Follows the ball during slow-motion sequences.

---

# Camera Dynamics

Subtle camera behavior may include:

- head movement
- acceleration response
- collision impulses
- smash impact
- dynamic FOV
- depth-of-field changes

These effects must remain subtle.

Competitive gameplay should never become difficult to read because of camera shake.

---

# Lighting

The primary environment should resemble a professional indoor table-tennis arena.

Potential lighting setup:

```text
Large overhead area lights
↓
Indirect venue lighting
↓
HDR environment contribution
↓
Localized spectator lighting
↓
Reflection probes

```

Lighting should accurately illuminate:

- player skin
- clothing
- paddle rubber
- ball
- painted table surface
- metallic table frame
- flooring

---

# Shadows

High quality mode should support:

- soft shadows
- contact shadows
- large shadow maps
- cascaded or optimized shadow systems where appropriate

Shadow quality must scale with graphics presets.

---

# Materials

Important materials include:

### Table

- painted composite surface
- subtle roughness
- microscopic texture
- printed boundary markings

### Paddle Rubber

- extremely subtle surface roughness
- low-intensity specular response
- red/black material options

### Wood

- layered paddle edge
- realistic wood grain
- normal mapping

### Ball

The ball must not look like a glowing white sphere.

It should contain:

- subtle roughness
- tiny surface texture
- printed logo
- realistic light response
- slight subsurface appearance where appropriate

---

# Visual Effects

Effects should remain physically believable.

Possible effects include:

- temporal antialiasing
- SMAA
- bloom
- screen-space ambient occlusion
- depth of field
- motion blur
- contact shadows
- color grading
- filmic tone mapping
- high-quality reflections

---

# Ball Motion Blur

A high-speed table-tennis ball may be difficult to visually track.

Motion blur should therefore combine:

```text
physical visibility
+
gameplay readability

```

An optional subtle ball trail can be available but should remain disabled in simulation mode.

---

# Particle Effects

Particles can be used sparingly for:

- floor dust
- sweat
- chalk
- atmospheric particles

Do **not** produce arcade particle explosions every time the ball is struck.

---

# Audio

Audio should communicate physics.

Different surfaces require different impulse responses.

Examples:

```text
Ball → paddle
Ball → table
Ball → table edge
Ball → floor
Ball → net
Ball → wall
Shoes → floor
Player breathing
Crowd
Room ambience

```

---

# Dynamic Impact Audio

Paddle impact volume and timbre should depend on:

```text
impact velocity
contact location
paddle type
spin
shot type

```

A gentle push should not sound like a smash.

---

# Positional Audio

Three-dimensional positional audio should be used whenever possible.

The player should perceive the ball moving through space.

Room acoustics should differ between:

- training room
- sports hall
- professional arena

---

# AI Opponents

AI should not simply aim perfectly at random coordinates.

Each AI player should simulate:

```text
perception
reaction
decision
movement
shot preparation
execution
recovery

```

---

## AI Perception

The AI sees approximate information about the ball.

Higher difficulty improves:

- reaction speed
- trajectory prediction
- spin interpretation
- tactical awareness

It should not gain supernatural knowledge of future physics states.

---

# AI Reaction Time

Example ranges:

```text
Beginner:
300–500 ms

Intermediate:
220–350 ms

Advanced:
160–260 ms

Professional:
120–220 ms

```

Variation is critical.

Humans do not react with exactly the same latency every time.

---

# AI Personality

Players may possess different tendencies.

Examples:

### Aggressive Looper

- strong forehand
- heavy topspin
- attacks early
- weaker defensive game

### Counter Attacker

- stays close to table
- blocks aggressively
- redirects speed

### Defender

- retreats
- chops heavily
- changes spin
- waits for mistakes

### All-Rounder

- balanced offense
- balanced defense

### Serve Specialist

- highly varied spin
- strong third-ball attacks

---

# Tactical AI

Higher-level opponents should analyze:

```text
player position
shot history
spin preference
weak side
distance from table
rally length
score
serve pattern

```

The AI can gradually identify tendencies without cheating.

For example:

```text
Player repeatedly misses heavy backspin
→
AI gradually uses more backspin

```

---

# Game Modes

## Training

Practice freely with:

- ball machine
- configurable speed
- configurable spin
- configurable placement
- frequency controls

---

## Rally

Keep the rally alive as long as possible.

Track:

- longest rally
- average shot speed
- spin
- accuracy

---

## Match

Standard competitive table tennis.

Configurable:

```text
Best of 3
Best of 5
Best of 7

```

---

## Tournament

Progress through a sequence of increasingly difficult opponents.

---

## Target Practice

Hit specific zones.

Useful for practicing:

- accuracy
- forehand
- backhand
- serve placement

---

## Spin Training

Player must identify and return:

- topspin
- backspin
- sidespin
- mixed spin

---

# Controls

Default keyboard and mouse layout:

```text
W       Move forward
S       Move backward
A       Move left
D       Move right

Mouse   Aim / paddle movement

LMB     Forehand / contextual strike
RMB     Backhand / alternate strike

Shift   Fast footwork
Space   Serve / toss

Q       Increase racket angle
E       Decrease racket angle

```

Exact controls may change during development.

---

# Mouse Paddle Mode

An advanced control option can map mouse movement directly to the racket.

Example:

```text
Mouse X
→
horizontal paddle position

Mouse Y
→
vertical paddle position

Mouse velocity
→
paddle speed

```

This provides a more physical interaction model.

---

# Gamepad

Planned support:

```text
Left stick   Player movement
Right stick  Paddle control
Triggers     Shot modifier
Buttons      Serve / tactical controls

```

---

# Rules

Standard ITTF-style scoring should be supported.

Core rules include:

```text
11 points per game
Win by two points
Serve changes every two points
At 10–10 serve changes every point

```

Serve detection should verify:

- legal toss state if simulation mode requires it
- server side bounce
- receiver side bounce

Rule strictness may be configurable.

---

# Difficulty System

Difficulty should not merely change ball speed.

Difficulty affects:

```text
Reaction latency
Movement prediction
Shot accuracy
Spin reading
Tactical intelligence
Error probability
Recovery speed
Shot selection
Serve complexity

```

---

# Performance Targets

Primary target:

```text
1080p
120 FPS
Mid/high-range desktop GPU

```

Minimum acceptable experience:

```text
1080p
60 FPS
Integrated graphics

```

High-end target:

```text
1440p / 4K
120–240 FPS
High-end discrete GPU

```

---

# Physics Frequency

Recommended physics:

```text
Minimum:
120 Hz

Recommended:
240 Hz

High Fidelity:
480 Hz

Extreme Simulation:
960 Hz

```

Physics frequency may adapt depending on ball conditions.

For example, extremely fast paddle proximity may temporarily trigger additional substeps.

---

# Adaptive Graphics

The engine should monitor performance.

If the framerate decreases substantially it may automatically adjust:

```text
shadow resolution
reflection quality
ambient occlusion
post-processing
render scale
spectator detail
environment detail

```

Physics quality should be preserved whenever possible.

Graphics degrade before gameplay physics.

---

# Technology Stack

Recommended stack:

```text
Three.js
JavaScript / TypeScript
Vite
WebGL 2
WebGPU where supported
Rapier.js or custom collision logic
GLTF / GLB
Web Audio API
Web Workers
WASM where beneficial

```

Optional libraries:

```text
@react-three/fiber
@react-three/drei
postprocessing
rapier
three-mesh-bvh
stats.js
lil-gui

```

React Three Fiber is optional.

For maximum low-level control, direct Three.js may be preferable.

---

# Project Architecture

Recommended architecture:

```text
Input
│
├── Keyboard
├── Mouse
├── Controller
└── Touch
        │
        ▼
Player Controller
        │
        ▼
Paddle Controller
        │
        ▼
Physics Engine
        │
├── Ball
├── Paddle
├── Table
├── Net
└── Player
        │
        ▼
Game Simulation
        │
├── Rules
├── Score
├── AI
├── Match State
└── Statistics
        │
        ▼
Renderer
        │
├── Scene
├── Lighting
├── Materials
├── Animation
├── VFX
└── UI

```

Systems should remain loosely coupled.

The rendering system should never become responsible for deciding physics outcomes.

---

# Suggested Folder Structure

```text
table-tennis-ultra/
│
├── public/
│   ├── models/
│   ├── textures/
│   ├── hdr/
│   ├── audio/
│   └── fonts/
│
├── src/
│   │
│   ├── core/
│   │   ├── Engine.js
│   │   ├── GameLoop.js
│   │   ├── Time.js
│   │   └── EventBus.js
│   │
│   ├── physics/
│   │   ├── PhysicsWorld.js
│   │   ├── BallPhysics.js
│   │   ├── PaddlePhysics.js
│   │   ├── TablePhysics.js
│   │   ├── NetPhysics.js
│   │   ├── Aerodynamics.js
│   │   ├── MagnusEffect.js
│   │   ├── CollisionSolver.js
│   │   └── PhysicsConstants.js
│   │
│   ├── entities/
│   │   ├── Ball.js
│   │   ├── Paddle.js
│   │   ├── Table.js
│   │   ├── Net.js
│   │   ├── Player.js
│   │   └── Arena.js
│   │
│   ├── player/
│   │   ├── PlayerController.js
│   │   ├── PaddleController.js
│   │   ├── MovementController.js
│   │   └── ShotController.js
│   │
│   ├── ai/
│   │   ├── AIController.js
│   │   ├── BallPredictor.js
│   │   ├── TacticalAI.js
│   │   ├── ShotSelection.js
│   │   └── AIProfiles.js
│   │
│   ├── animation/
│   │   ├── AnimationController.js
│   │   ├── IKController.js
│   │   ├── FootIK.js
│   │   └── RacketIK.js
│   │
│   ├── rendering/
│   │   ├── Renderer.js
│   │   ├── Lighting.js
│   │   ├── Shadows.js
│   │   ├── Materials.js
│   │   ├── PostProcessing.js
│   │   └── QualityManager.js
│   │
│   ├── camera/
│   │   ├── CameraManager.js
│   │   ├── PlayerCamera.js
│   │   ├── BroadcastCamera.js
│   │   └── ReplayCamera.js
│   │
│   ├── audio/
│   │   ├── AudioManager.js
│   │   ├── ImpactAudio.js
│   │   ├── Ambience.js
│   │   └── SpatialAudio.js
│   │
│   ├── game/
│   │   ├── MatchManager.js
│   │   ├── Rules.js
│   │   ├── ScoreManager.js
│   │   ├── ServeManager.js
│   │   └── RallyManager.js
│   │
│   ├── replay/
│   │   ├── ReplayRecorder.js
│   │   └── ReplayPlayer.js
│   │
│   ├── telemetry/
│   │   ├── ShotTelemetry.js
│   │   └── Statistics.js
│   │
│   ├── input/
│   │   ├── Keyboard.js
│   │   ├── Mouse.js
│   │   └── Gamepad.js
│   │
│   ├── ui/
│   │   ├── HUD.js
│   │   ├── Scoreboard.js
│   │   ├── MainMenu.js
│   │   └── Settings.js
│   │
│   ├── debug/
│   │   ├── PhysicsDebug.js
│   │   ├── TrajectoryDebug.js
│   │   └── PerformanceDebug.js
│   │
│   └── main.js
│
├── tests/
│   ├── physics/
│   ├── rules/
│   ├── ai/
│   └── integration/
│
├── index.html
├── package.json
├── vite.config.js
└── README.md

```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/table-tennis-ultra.git

```

Enter the directory:

```bash
cd table-tennis-ultra

```

Install dependencies:

```bash
npm install

```

Start development:

```bash
npm run dev

```

Vite will expose the application locally.

Usually:

```text
http://localhost:5173

```

---

# Production Build

```bash
npm run build

```

Preview the build:

```bash
npm run preview

```

---

# Development

Recommended Node version:

```text
Node.js 20+

```

Recommended browser:

```text
Chrome
Edge
Firefox
Safari

```

Chrome or Edge are recommended during development because of strong WebGL/WebGPU debugging support.

---

# Configuration

Example central configuration:

```js
export const GAME_CONFIG = {

    physics: {
        timestep: 1 / 240,
        maxSubSteps: 8,
        continuousCollisionDetection: true
    },

    ball: {
        radius: 0.02,
        mass: 0.0027
    },

    table: {
        length: 2.74,
        width: 1.525,
        height: 0.76
    },

    net: {
        height: 0.1525
    },

    graphics: {
        shadows: true,
        postProcessing: true,
        ambientOcclusion: true,
        reflections: true
    }

};

```

---

# Physics Configuration

Example:

```js
export const PHYSICS_CONFIG = {

    gravity: -9.81,

    airDensity: 1.225,

    ball: {
        dragCoefficient: 0.47,
        magnusCoefficient: 0.00015,
        angularDrag: 0.015
    },

    table: {
        restitution: 0.89,
        friction: 0.25
    },

    paddle: {
        restitution: 0.82,
        friction: 0.90,
        spinTransfer: 0.95
    }

};

```

These values should eventually be calibrated experimentally rather than treated as final constants.

---

# Physics Calibration

Physics should be validated against measurable table-tennis behavior.

Calibration tests should include:

### Drop Test

Drop a ball from a known height.

Measure:

```text
impact velocity
rebound height
restitution

```

---

### Topspin Test

Launch identical balls with:

```text
0 RPM
1000 RPM
3000 RPM
6000 RPM
9000 RPM

```

Measure their trajectories.

---

### Bounce Test

Launch identical balls with varying spin toward the table.

Measure:

```text
incoming angle
outgoing angle
horizontal acceleration
vertical rebound

```

---

### Paddle Test

Strike balls using repeatable paddle velocities.

Measure:

```text
outgoing speed
spin
trajectory

```

Tests should be deterministic.

---

# Graphics Configuration

Suggested presets:

## Low

```text
720p–1080p
Low shadows
No SSAO
Low environment detail
Reduced reflections

```

## Medium

```text
1080p
Medium shadows
SSAO
Basic reflections

```

## High

```text
1080p–1440p
High shadows
High-resolution environment
SSAO
Reflections
Advanced post-processing

```

## Ultra

```text
1440p–4K
Maximum shadow quality
High-quality reflections
Advanced AO
High-resolution textures
High-quality spectators
Maximum post-processing

```

---

# Debugging

Development builds should contain extensive visualization tools.

Pressing a debug shortcut could display:

```text
FPS
Frame time
Physics time
Physics substeps
Ball speed
Ball RPM
Ball angular velocity
Paddle speed
Paddle angle
Collision point
Contact normal
AI target
Predicted trajectory

```

---

# Trajectory Debugger

The trajectory debugger should draw the predicted ball path.

Example:

```text
●
 \
  ●
    \
      ●
        \
         ●
──────────●──────── Table
            \
              ●

```

Use distinct debug visualizations for:

```text
actual trajectory
predicted trajectory
collision normals
spin axis
velocity vector

```

Debug graphics must never ship enabled by default.

---

# Shot Telemetry

Every strike can generate data:

```js
{
    ballSpeed: 27.3,
    paddleSpeed: 14.8,

    spin: {
        x: 42,
        y: 185,
        z: -23
    },

    contactPosition: {
        x: 0.013,
        y: -0.008
    },

    shotType: "FOREHAND_LOOP",

    landingPosition: {
        x: 0.64,
        z: -1.1
    }
}

```

This can power:

- training feedback
- replay information
- statistics
- AI analysis
- development debugging

---

# Replay System

A replay should preferably store simulation state rather than rendered video.

Record:

```text
ball state
player state
paddle state
animation state
events
camera state

```

This permits:

- slow motion
- free camera movement
- cinematic replay
- shot analysis

---

# Slow Motion

Replay modes:

```text
1.0×
0.5×
0.25×
0.1×
0.05×

```

Extreme slow motion can expose:

- paddle contact
- ball deformation approximation
- spin
- net collision
- table contact

---

# Testing

Physics must be covered by automated tests.

Examples:

```text
ball affected by gravity
ball loses velocity from drag
topspin creates downward Magnus force
backspin creates upward Magnus force
table collision preserves expected energy
spin transfers during table collision
paddle collision changes velocity
net collision reduces velocity
score increments correctly
serve alternates correctly

```

---

# Deterministic Physics Tests

Where possible, physics tests should use deterministic initial state.

Example:

```js
test("topspin causes lower trajectory", () => {

    const flat = simulateBall({
        velocity: [0, 3, 15],
        spin: [0, 0, 0]
    });

    const topspin = simulateBall({
        velocity: [0, 3, 15],
        spin: [300, 0, 0]
    });

    expect(
        topspin.position.y
    ).toBeLessThan(
        flat.position.y
    );

});

```

---

# Performance Testing

Track:

```text
average FPS
1% low FPS
frame time
render time
physics time
AI time
draw calls
triangles
GPU memory
JS memory
garbage collection

```

Performance regressions should be treated as bugs.

---

# Asset Optimization

3D assets should use:

```text
glTF / GLB
Draco compression
Meshopt
KTX2 textures
Basis Universal
LOD models

```

Avoid shipping enormous uncompressed textures.

---

# Character Models

Character rendering may eventually support:

```text
high-detail body mesh
facial rig
skin shading
cloth simulation approximation
hair cards
sweat effects
LOD system

```

During gameplay, visual fidelity should scale based on camera distance.

---

# Crowd System

Large environments must not render hundreds of unique full-detail humans.

Possible techniques:

```text
instancing
impostors
LOD
animation sharing
GPU skinning
texture variations
procedural color variations

```

---

# Loading System

Assets should load progressively.

Suggested sequence:

```text
1. Core engine
2. Table
3. Ball
4. Paddle
5. Player
6. Gameplay becomes available
7. Arena details
8. Spectators
9. High-resolution textures

```

Never force players to wait for unnecessary background assets before gameplay starts.

---

# Accessibility

Options should include:

- configurable controls
- reduced motion
- camera shake toggle
- motion blur toggle
- high-contrast ball
- alternative ball colors
- UI scaling
- subtitles
- sound controls

Competitive visibility options should not alter physics.

---

# Browser Support

Primary:

```text
Chrome
Edge
Firefox
Safari

```

Required capabilities:

```text
WebGL 2
ES Modules
Web Audio API
Pointer Lock API
Gamepad API where available

```

WebGPU may be used as an optional accelerated renderer.

A WebGL fallback should remain available when practical.

---

# Development Rules

Every contributor should follow several strict rules.

## Never fake physics to hide bugs

Do not manually teleport the ball because collision detection failed.

Fix collision detection.

---

## Never bind physics to frame rate

Bad:

```js
position += velocity;

```

Correct principle:

```js
position += velocity * deltaTime;

```

Prefer fixed simulation steps.

---

## Never use visual geometry as authoritative physics data

Rendering and collision geometry should be separate when appropriate.

---

## Do not create giant manager classes

Avoid:

```text
GameManager.js
5000 lines

```

Keep systems separated.

---

## Avoid unnecessary allocations inside physics loops

Bad:

```js
function update() {
    const velocity = new THREE.Vector3();
}

```

Prefer reusable vectors in hot loops.

---

## Profile before optimizing

Performance work must be based on measurement.

Use:

```text
Chrome Performance
Three.js renderer.info
GPU profiling
custom frame timers
memory profiling

```

---

# Milestones

## Phase 1 — Foundation

- renderer
- game loop
- camera
- table
- ball
- basic lighting

---

## Phase 2 — Ball Physics

- gravity
- bounce
- drag
- continuous collision detection

---

## Phase 3 — Paddle

- paddle movement
- collision detection
- racket velocity
- responsive controls

---

## Phase 4 — Spin

- angular velocity
- Magnus effect
- friction
- spin transfer
- topspin
- backspin
- sidespin

---

## Phase 5 — Gameplay

- serving
- scoring
- rally detection
- match state
- rules

---

## Phase 6 — AI

- trajectory prediction
- positioning
- shot selection
- difficulty levels
- personalities

---

## Phase 7 — Character System

- player models
- animation
- IK
- footwork
- procedural racket alignment

---

## Phase 8 — Graphics

- PBR
- HDR
- improved lighting
- shadows
- reflections
- post-processing

---

## Phase 9 — Audio

- paddle sounds
- bounce sounds
- footsteps
- positional sound
- room ambience

---

## Phase 10 — Environments

- training room
- sports hall
- professional arena

---

## Phase 11 — Replay

- recording
- slow motion
- replay cameras
- telemetry

---

## Phase 12 — Optimization

- profiling
- LOD
- texture compression
- shader optimization
- worker threads
- WebAssembly where beneficial

---

## Phase 13 — Competitive Polish

- input latency
- physics tuning
- AI balancing
- animation refinement
- accessibility
- graphics presets
- browser compatibility

---

# Future Features

Possible long-term additions:

- online multiplayer
- rollback networking
- ranked matchmaking
- spectator mode
- tournaments
- player progression
- customizable paddles
- equipment simulation
- custom arenas
- training analytics
- shot heatmaps
- player career mode
- replay sharing
- VR
- mixed reality
- motion-controller support
- WebXR
- advanced coaching AI
- procedural opponent generation

---

# Multiplayer

If multiplayer is implemented, physics synchronization must be carefully designed.

A competitive implementation should investigate:

```text
client prediction
input buffering
authoritative server simulation
rollback
state reconciliation
lag compensation
deterministic simulation

```

A simple naive state-sync approach is unlikely to provide acceptable results for a ball moving at table-tennis speeds.

---

# Ultimate Target

The finished game should make a player forget that it is running inside a browser.

The experience should combine:

```text
Three.js rendering
+
high-frequency physics
+
real spin mechanics
+
responsive controls
+
human-like AI
+
cinematic presentation
+
professional audio
+
extreme attention to detail

```

A strong forehand loop should visibly and physically behave differently from a flat drive.

A heavy chop should change what the opponent must do with the paddle.

A side-spin serve should curve in flight, kick sideways after the bounce, and alter the return angle.

A net clip should emerge from actual contact with the net.

An edge ball should emerge from real edge geometry.

A smash should feel powerful because of its physical speed, animation, sound, camera response, and trajectory — not because the engine plays a canned effect.

The fundamental design rule is simple:

> **If something can be simulated properly, simulate it instead of faking it.**

---

# Philosophy

This project does not aim to make a table-tennis-themed browser demo.

It aims to answer a much more ambitious question:

> **How close can a modern browser get to a dedicated high-end 3D sports simulation?**

Every engineering decision should move the project closer to that goal.

---

# License

Choose the appropriate license before public distribution.

Example:

```text
MIT License

```

or keep the project proprietary if commercial development is intended.

---

# 🏓 Table Tennis Ultra

**High-speed physics. Real spin. Real reactions. Browser-native 3D.**

Built with Three.js.

Built to push the browser.

Built to make every rally different.

---

# Foundation implementation

The first continuation-ready implementation now lives under src/.

It includes:

- a 240 Hz fixed-step simulation clock;
- SI-unit ball flight, drag, Magnus force, spin decay, bounce, net, edge, and paddle contact seams;
- typed rally, serve, scoring, match, training, AI, and placement systems;
- procedural Three.js table, arena, lighting, paddle, ball, camera, and shader adapters;
- keyboard, pointer, and gamepad input;
- replay snapshots, telemetry, persistence, accessibility, plugins, rollback buffers, and worker protocols;
- ECS, animation, footwork, calibration, performance, and validation foundations.

Read docs/FOUNDATION_HANDOFF.md first when continuing the implementation. It states the coordinate contract, what is implemented, what remains intentionally approximate, and the recommended next sequence.

The procedural scene is deliberately asset-free so future developers can run and inspect the foundation before adding authored models, textures, audio, or online services.
