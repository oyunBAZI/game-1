# Architecture

The project is intentionally split into simulation, presentation, and platform layers.

## Dependency direction

core
  ↓
physics / game / ecs
  ↓
input / replay / telemetry / persistence
  ↓
render / audio / ui
  ↓
app

The physics and rules layers do not import Three.js. This is the most important long-term seam in the repository. A future headless server, deterministic replay runner, training evaluator, or network authority can reuse them without starting a browser renderer.

## Main runtime

1. GameApp owns browser lifecycle.
2. InputManager samples keyboard, pointer, and gamepad state.
3. FixedStepLoop advances the simulation at the configured physics frequency.
4. GameSimulation applies player and AI intent, runs MatchController, and advances PhysicsWorld.
5. RenderBridge interpolates authoritative simulation state for Three.js.
6. GameHud, AudioBus, telemetry, and replay listeners react to events.

## Authoritative state

WorldState is the authoritative local simulation state. Rendering objects are projections. Never make a mesh position authoritative for a gameplay decision.

WorldSnapshot is the stable serialization boundary for replays, rollback, debugging, and future multiplayer.

## Events

The typed EventBus is for domain events that cross layer boundaries. Prefer events for contact and shot notifications, scoring and phase changes, UI notifications, replay markers, and telemetry.

Keep high-frequency vector math inside the owning system. Do not emit a new event for every intermediate arithmetic operation.

## Adding a system

A new system should answer four questions:

- Which layer owns the rule?
- What is its fixed-step versus presentation-step work?
- What event or snapshot boundary does it expose?
- How can it run without a browser?

If the answer depends on a Three.js mesh, the system probably belongs in render, not physics or game.

## ECS

The ECS package is an extension seam for future entity-heavy modes such as spectators, equipment, crowds, training targets, and multiplayer avatars. The current ball/paddle path is explicit and allocation-conscious; moving everything into ECS is deliberately not required.

## Performance

The fixed simulation avoids frame-rate coupling. The renderer interpolates previousPosition to position with the accumulator alpha. Hot physics paths reuse vectors and clamp runaway state. Profiler, FrameBudgetTracker, QualityScaler, and PerformanceRenderer provide measurement points before optimization work begins.
