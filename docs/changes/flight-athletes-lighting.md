# Flight, athletes, and lighting improvements

Based on main commit 5a11332.

## Changes

- Replace first-order ball flight with midpoint integration of velocity-dependent drag and Magnus lift. Reintegrate velocity/spin over the actual impact interval instead of interpolating a complete trial step.
- Use hollow-shell ball inertia consistently in integration and energy reporting. Reject invalid world time steps before changing simulation state.
- Clear stale contact suppression when restoring a physics snapshot so resimulation can collide again at the restored tick.
- Supply the rally's existing bounce state to the AI predictor. The opponent can target an incoming ball after its legal bounce instead of waiting for another bounce. It recovers when the ball moves away and clears cached actions on restart.
- Add contoured jersey geometry, procedural woven cloth, wood grain, and rubber microtexture. Materials are generated locally without downloaded assets.
- Replace the striking arm's variable-length segments with a two-bone solver, torso reach compensation, and a racket-orientation-aware grip target. Extreme unreachable strokes clamp to the arm's reach and may still separate the hand from the racket; full-body foot placement remains future work.
- Add half-resolution screen-space ambient occlusion, multisampled HDR scene rendering, and a final color-management pass. Disabling shadows before renderer construction retains the direct rendering path. Use the configured shadow-map resolution and reduce excessive shadow detachment.

## Verification

Passed locally: `npm run test:simulation`, `npm run typecheck`, `npm run validate`, `npm run build`, and `git diff --check`.

New regression coverage includes an analytical gravity-only trajectory, second-order drag/spin convergence, 100 passive-contact energy checks, shell-inertia reporting, invalid-step rejection, resimulated collisions after snapshot restore, AI recovery and post-bounce returns, and fixed limb lengths for reachable, coincident, and unreachable targets. Existing serve, net, paddle, rally scoring, and model-construction checks also pass.

Browser visual verification and GPU performance measurement were not completed: Chromium installation returned an invalid download in this environment. The new postprocessing requires an on-device visual/performance review. The production build retains a warning about the Three.js bundle exceeding 500 kB uncompressed.

This is a targeted improvement of the existing procedural game, not a photorealistic asset replacement or a physically calibrated sports simulator. Existing paddle shot assistance and approximate swept collision geometry remain.
