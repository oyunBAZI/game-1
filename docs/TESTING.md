# Testing and Verification

## Local checks

npm run validate
npm run typecheck
npm run test:simulation
npm run build

`validate` checks the repository line budget, balanced delimiters, required entry points, and relative imports. `typecheck` checks all TypeScript sources. `test:simulation` bundles the actual TypeScript simulation for Node and exercises high-speed collisions, serve bounce order, AI racket contact, and rally scoring. Run `npm ci` before these checks.

## Physics checks

Add tests for gravity, drag, Magnus direction, angular damping, table restitution, table friction, edge contact, net contact, paddle contact, continuous collision time, maximum-speed clamps, and deterministic replay digest.

Every bug found in a rally should become a small reproducible test.

## Rules checks

Add tests for point progression, win by two, deuce service cadence, game reset, match winner, server rotation, let handling, and training rules versus competition rules.

## Presentation checks

The renderer should be manually checked at a narrow laptop viewport, a high-DPI desktop, a device-pixel-ratio of 1, a slow device with reduced quality, a browser without Gamepad API, and a browser with audio initially locked.

Gameplay must remain usable when UI panels or audio cannot initialize.

## Replay checks

A replay test should create a seeded simulation, feed a fixed input sequence, record snapshots, restore the first snapshot, re-run the same inputs, and compare quantized digests at every important event.

## Performance checks

Measure before changing hot loops. Track physics milliseconds, render milliseconds, fixed-step backlog, draw calls, triangles, geometry and texture counts, allocations in long rallies, and replay buffer size.

A visual feature that removes the game from its frame budget needs a quality fallback.
