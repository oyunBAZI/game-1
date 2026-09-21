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
3. add gravity, drag, and Magnus forces;
4. integrate linear velocity and position;
5. integrate angular velocity;
6. sweep the ball against the moving paddle faces, net, and table;
7. select the earliest time of impact and resolve that contact;
8. integrate the remaining portion of the fixed step and repeat if it hits another surface;
9. clamp impossible runaway values;
10. restore the frame-start position for render interpolation and emit ordered contact events after state is coherent.

## Contact priority

PhysicsWorld compares all candidate contact times, resolves the earliest, and continues through the remaining time. A surface may fire once per fixed tick. PaddleCollider works in the moving blade's frame and accepts either rubber face. Edge contacts use the table's lower edge restitution. Contact position and order are authoritative for RallyController.

BallPredictor uses the same integrator and table/net contact responses for AI planning. It does not include future paddle strokes or player movement, so its path remains an estimate. Calibration of coefficients against measured shots is still needed.

## Spin

Spin is a vector. It is not a string label. Topspin, backspin, and sidespin are interpretations of vector components.

Magnus force is approximated from angular velocity cross linear velocity. Contact models then transfer tangential impulse into angular velocity. Calibration should be driven by measured drop, bounce, and paddle tests rather than arbitrary visual tuning.

## Table and net

TableCollider owns table geometry. NetCollider owns the net plane and a lightweight deformable node grid. Presentation can consume node positions without deciding whether a ball is legal.

## Out and points

Physics can report an out reason. RallyController decides the rally winner and Scoreboard decides game and match progression. This separation is intentional: changing a training rule must not require rewriting collision code.

## Determinism

Use Random for seeded decisions. Avoid Math.random in simulation code. A replay or server step should be able to provide the same seed, inputs, and starting snapshot and receive the same result.

Floating-point determinism across different browsers and architectures is not guaranteed at the bit level. Use quantized digests for regression checks and investigate divergence at the first differing tick.
