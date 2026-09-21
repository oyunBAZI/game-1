# Extending the Foundation

## Add a new shot

1. Add the shot label and telemetry shape to core/types.ts if it is a new semantic kind.
2. Add a recipe to content/ShotLibrary.ts.
3. Add a rule-aware classifier branch in game/ShotClassifier.ts.
4. Add an animation clip in animation/ShotAnimationLibrary.ts.
5. Add coaching/commentary text only if it improves feedback.
6. Add a deterministic test for its contact response.

Do not encode a shot as a hard-coded ball teleport.

## Add equipment

Put authored equipment in content/EquipmentCatalog.ts. Keep physical parameters separate from art materials. The rubber profile changes contact response; the renderer only needs the visual identity.

## Add a game mode

Create a controller that consumes GameSimulation events. Reuse PhysicsWorld, Scoreboard, and WorldSnapshot. A mode should own its own win condition rather than placing branches throughout the integrator.

## Add an AI behavior

AIBrain returns intent. It does not move a mesh directly. A future tactic system can select a ShotRecipe, a PlacementModel target, and a recovery location, then leave the player/paddle controllers to apply those targets.

## Add a browser feature

Browser-only code belongs in app, input, render, audio, ui, or a clearly named platform package. Do not import window, document, or THREE into the core physics/rules modules.

## Add a plugin

Use PluginHost and PluginApi. Plugins can observe typed domain events, read snapshots, announce UI messages, and register features. Keep plugin APIs additive and versioned.

## Add multiplayer

Start with a headless simulation boundary:

- serialize InputFrame;
- store WorldSnapshot in RollbackBuffer;
- attach server acknowledgements to input ticks;
- compare quantized state digests;
- reconcile from the earliest divergent tick.

Do not start by synchronizing Three.js transforms. Those are presentation projections.

## Add assets

The procedural arena is an intentional baseline and test harness. Replace individual visuals behind TableVisual, PaddleVisual, BallVisual, and ArenaVisual without changing gameplay. Keep a procedural fallback for tests and offline development.
