# Foundation Handoff

This commit is the continuation point for the game.

## What is implemented

The repository now contains a browser application shell, a fixed-step simulation, a regulation-sized table coordinate system, ball aerodynamics, spin state, table and net collision seams, paddle contact response, match rules, scoring, serve state, rally state, an opponent brain, procedural visuals, browser inputs, UI, audio, replay, telemetry, persistence, accessibility, extension APIs, and future networking boundaries.

The scene is intentionally asset-free. That lets a future developer run the simulation immediately after installing dependencies, inspect the entire foundation in source control, and replace individual visual adapters with authored models later.

## What is not claimed

This is not a finished commercial sports game. It is a large, coherent starting codebase. The contact coefficients are tunable approximations, the player is represented by a paddle/player state rather than a final character rig, and multiplayer is a protocol seam rather than a shipped online service.

Those boundaries are explicit so future work can improve fidelity without rewriting the project.

## Recommended next sequence

1. Install dependencies and run validate, smoke, and build.
2. Open the Vite scene and calibrate table/ball readability.
3. Add headless unit tests around the physics response.
4. Replace the procedural table and paddle materials with authored assets while retaining the same adapters.
5. Calibrate contact coefficients against recorded real-world trajectories.
6. Add a proper continuous-collision coordinator that orders multiple contacts by time of impact.
7. Add a richer player body and IK target bridge.
8. Add replay capture to the UI and inspect frame-by-frame contacts.
9. Only then begin online authority and rollback integration.

## Coordinate contract

- x is table width, left to right;
- y is up;
- z is table length;
- home occupies positive z;
- away occupies negative z;
- the table top is y = 0.76;
- the net is centered at z = 0.

When adding a feature, write this contract into its tests.

## Useful seams for future developers

- PhysicsWorld.fixedStep: authoritative simulation entry point.
- WorldState.snapshot and restore: state boundary.
- EventBus: cross-layer event boundary.
- BallPredictor: AI and training prediction boundary.
- PlacementModel: target-selection boundary.
- PlayerPoseController: body-animation boundary.
- RenderBridge: simulation-to-Three.js boundary.
- PluginHost: opt-in feature boundary.
- ReplayRecorder and ReplayPlayer: temporal-debugging boundary.
- RollbackBuffer and PredictionBuffer: multiplayer boundary.
- TelemetryBuffer and AnalyticsRecorder: measurement boundary.

## Verification

The repository includes a dependency-free smoke script and a structural validator. The GitHub workflow runs them alongside the Vite build on pushes and pull requests.

Do not interpret a green build as physics certification. A build proves packaging and syntax. Physics certification requires deterministic tests, calibration data, and measured behavior.
