# Simulation Contract

## Units

Use SI units:

- distance: meters;
- time: seconds;
- mass: kilograms;
- linear velocity: meters per second;
- angular velocity: radians per second.

The regulation ball is represented by a 20 mm radius and 2.7 g mass. The table uses a 2.74 m length, 1.525 m width, and 0.76 m top height.

## Fixed step

The default physics frequency is 240 Hz. A render frame may execute zero, one, or many fixed steps. Gameplay code must not multiply motion by render FPS.

The accumulator is bounded. When a device stalls, the simulation cannot run unbounded catch-up work in a single browser frame.

## Ball integration

Each ball step:

1. copy the previous position;
2. clear force and torque;
3. evaluate gravity, drag, and Magnus force at the start and midpoint of the segment;
4. integrate linear position with midpoint velocity and integrate velocity with midpoint acceleration;
5. integrate angular velocity with exponential air damping;
6. sweep the trial motion against the moving racket, net mesh, cord and posts, and the full finite tabletop (top, rounded edge, vertical apron);
7. resolve the earliest contact and integrate the unused fraction of the step, up to eight contacts;
8. clamp impossible runaway values;
9. restore the start position for render interpolation and emit contacts in impact order.

## Contact priority

The earliest time of impact wins, independent of the order in which colliders are queried. A fast net hit and table bounce may both happen in one fixed step. The moving racket is swept in its own frame and checked against an elliptical face in the racket plane. A separation offset and an eight-contact cap protect against numerical loops. The latter is a safety bound, not a substitute for a general rigid-body engine.

## Spin

Spin is a vector. It is not a string label. Topspin, backspin, and sidespin are interpretations of vector components.

Magnus force is approximated from angular velocity cross linear velocity. Contact models then transfer tangential impulse into angular velocity. Calibration should be driven by measured drop, bounce, and paddle tests rather than arbitrary visual tuning.

## Table and net

TableCollider solves first contact against the actual distance to the tabletop box. A broad expanded-box rejection keeps distant flights cheap; a closest-distance search removes false positives at corners. The normal distinguishes a legal top bounce, a playable top edge and a vertical apron or underside strike. The rules end the point on apron contact. NetCollider owns the mesh, a rounded top cord, swept finite post capsules and a deformable 13 × 5 node grid. The top row and side columns are fixed to the cord and posts. Each interior node is pulled toward rest and coupled to its neighbors with damping. Impulses move interior nodes only along the table length, and the weave is bounded to 75 mm of displacement. Swept ball contacts sample the displaced surface by bilinear interpolation, estimate its local normal and account for strand velocity in the rebound. The posts use a different rebound from the textile net. A ball that clips the top cord can continue across the table; a legal receiver bounce after a net touch during service is a let and replays without a point. Presentation reads those same nodes without deciding whether a ball is legal.

The AI trajectory predictor advances a separate PhysicsWorld with both rackets disabled. It receives a snapshot of the live net before forecasting so its next net collision uses the current shape and motion. It therefore uses the same drag, Magnus, net and table responses as live play. When a prediction begins after the ball has bounced on the AI's half, the AI retains that historical contact so it chooses an intercept before the next bounce. Its paddle target is kept above the table surface while the player's body is constrained behind the end line. Predictive trajectories and contact coefficients remain gameplay approximations, not measured equipment calibration.

## Out and points

Physics can report an out reason. RallyController decides the rally winner and Scoreboard decides game and match progression. This separation is intentional: changing a training rule must not require rewriting collision code.

## Determinism

Use Random for seeded decisions. Avoid Math.random in simulation code. A replay or server step should be able to provide the same seed, inputs, and starting snapshot and receive the same result.

PhysicsWorld snapshots include the 65 net displacements and velocities because the live collider uses them. Restore validates lengths and finite values, and older snapshots without net data restore a resting net. WorldState alone has no net; use PhysicsWorld.snapshot() for replays or rollback that need complete collision state.

Floating-point determinism across different browsers and architectures is not guaranteed at the bit level. Use quantized digests for regression checks and investigate divergence at the first differing tick.
