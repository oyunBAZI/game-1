# Court, contact physics and opponent improvements

Base revision: `5a11332` on `main`.

## Physics and rules

The table collider now sweeps a sphere against the actual 28 mm slab: six
faces, twelve rounded edges and eight corners. Analytical candidate times are
validated against the closest point on the slab. This removes the old fixed
edge normal and catches lateral and underside impacts, including rising balls.
An early swept-bounds rejection limits work in free flight. Trial paths remain
linear within each fixed integration step; this is not an exact curved-flight solver.

Top edges remain valid bounces. Vertical sides and the underside terminate the
rally as an out, with the winner determined by whether a legal bounce already
occurred. Prediction excludes these contacts from its bounce count.

Racket spin input now contributes a finite tangential brushing velocity. Both
linear and angular changes come from one friction-limited impulse. Near-zero
normal contact cannot inject a large arbitrary spin. Zero-input stationary
rackets are checked for non-increasing total kinetic energy. Equipment values
remain gameplay approximations, not measured calibration.

## Opponent and session state

The AI receives the authoritative receiver-bounce state, allowing it to select
an intercept after a bounce that occurred before its prediction began. Restart
resets the AI seed/reaction timer and match statistics alongside the world.

## Presentation

Athletes use a shaped jersey profile, detailed gripping fingers, wristbands,
shoe laces, ball-tracking heads and an analytical two-bone striking arm. Limb
lengths stay fixed, including for unreachable targets. Targets beyond the
visual arm reach are clamped; the procedural rig does not constrain gameplay.

A separate competition mat, side spectator terraces and 72 seated spectators
extend the arena. Audience bodies use four instanced draw calls; static tier
and bench meshes add twelve. Racket rubber and wood have separate micro-surface
bump textures. Portrait camera distance now adapts to viewport aspect ratio. All visuals are procedural and work without external assets.

## Verification

- Repository validator, TypeScript, simulation integration tests and production build.
- Added side TOI, rounded edge, false-corner, underside and side-scoring cases.
- 100 deterministic passive-rubber energy cases plus grazing-contact spin limit.
- Already-bounced AI intercept, restart statistics and fixed-length IK regressions.
- Physics microbenchmark: 24,000 steps per sample, one warmup, median of five.
  In this environment baseline was 0.01389 ms/step and updated 0.01417 ms/step
  (about 2% higher). This measures headless world stepping, not browser FPS or AI.
  Reproduce with `node scripts/benchmark-physics.mjs [checkout-path]`.

The production build retains Vite's warning for the existing Three.js chunk
above 500 kB. This change does not introduce a new runtime dependency.

Browser checks used headless Chromium with software WebGL at 1440×900 and
390×844: session start, canvas rendering, no runtime errors, and no horizontal
page overflow. A second browser engine was unavailable in this environment;
Firefox/WebKit and real-device GPU performance remain unverified.
