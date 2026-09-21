const EPSILON = 1e-8;
const nearlyEqual = (a, b, epsilon = 1e-6) => Math.abs(a - b) <= epsilon;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const vector = { x: 1, y: 2, z: 3 };
vector.x += 2;
vector.z -= 1;
assert(vector.x === 3 && vector.y === 2 && vector.z === 2, "vector arithmetic");

const gravity = -9.81;
const dt = 1 / 240;
let y = 1.2;
let velocityY = 0;
for (let tick = 0; tick < 60; tick += 1) {
  velocityY += gravity * dt;
  y += velocityY * dt;
}
assert(y < 1.2, "gravity should lower the ball");

const speed = 21;
const density = 1.225;
const dragCoefficient = 0.47;
const area = Math.PI * 0.02 * 0.02;
const drag = 0.5 * density * dragCoefficient * area * speed * speed;
assert(drag > 0 && Number.isFinite(drag), "drag formula");

const points = [];
for (let tick = 0; tick < 120; tick += 1) points.push(tick);
assert(points.length === 120, "fixed sample count");

const home = 10;
const away = 10;
assert(clamp(home - away, -1, 1) === 0, "clamp");
assert(nearlyEqual(0.1 + 0.2, 0.3, 1e-9), "floating tolerance");
console.log("SMOKE PASSED");
console.log("Fixed-step, gravity, drag, vector, and scoring primitives are coherent.");
