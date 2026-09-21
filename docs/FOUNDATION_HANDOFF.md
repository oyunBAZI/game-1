# Foundation Handoff

This commit is the continuation point for the game.

## What is implemented

The repository now contains a browser application shell, a fixed-step simulation, a regulation-sized table coordinate system, ball aerodynamics, spin state, table and net collision seams, paddle contact response, match rules, scoring, serve state, rally state, an opponent brain, procedural visuals, browser inputs, UI, audio, replay, telemetry, persistence, accessibility, extension APIs, and future networking boundaries.

The scene uses procedural geometry and generated canvas textures, so no external assets are needed to run it. `RenderBridge` connects the simulated table, ball, net, rackets and athlete rigs to Three.js. These adapters can be replaced with authored assets later.

## What is not claimed

This is not a finished commercial sports game. The contact coefficients and serve recipes are tunable approximations, the athletes are procedural rather than motion-captured characters, and multiplayer is a protocol seam rather than a shipped online service.

Those boundaries are explicit so future work can improve fidelity without rewriting the project.

## Recommended next sequence

1. Run `npm ci`, then `npm run validate`, `npm run typecheck`, `npm run test:simulation`, and `npm run build`.
2. Visually inspect court framing, net texture and player rigs on target GPUs and viewports.
3. Calibrate serves, contact coefficients and spin against measured trajectories.
4. Order paddle, net and table contacts by time of impact in one collision coordinator.
5. Add replay capture to the UI and compare deterministic trajectories frame by frame.
6. Replace procedural player anatomy and textures with authored assets when ready.
7. Begin online authority and rollback integration after the local simulation is stable.

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

The workflow runs a structural validator, full TypeScript checking, simulation integration tests and a Vite build. The simulation test exercises high-speed table and net contacts, serve bounce order, AI racket contact and rally scoring. The old standalone numeric smoke script remains for reference; `test:simulation` now runs the actual source code.

Do not interpret a green build as physics certification. A build proves packaging and syntax. Physics certification requires deterministic tests, calibration data, and measured behavior.
