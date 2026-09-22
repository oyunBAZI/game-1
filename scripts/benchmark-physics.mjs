import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Pass a checkout path to compare revisions using the same harness.
const root = resolve(process.argv[2] ?? '.');
const compiled = await build({ stdin: { contents: `
import { PhysicsWorld } from ${JSON.stringify(root + '/src/physics/PhysicsWorld.ts')};
import { EventBus } from ${JSON.stringify(root + '/src/core/EventBus.ts')};
import { Vec3 } from ${JSON.stringify(root + '/src/core/Vec3.ts')};
const world = new PhysicsWorld(new EventBus());
world.state.paddles.home.active = false;
world.state.paddles.away.active = false;
function run() {
  for (let i = 0; i < 24000; i += 1) {
    if (i % 240 === 0) world.state.ball.reset(new Vec3(0, 1.1, 0.8), new Vec3(0, -1, -4));
    world.fixedStep(1 / 240);
  }
}
run();
const samples = [];
for (let n = 0; n < 5; n += 1) {
  const start = performance.now(); run();
  samples.push((performance.now() - start) / 24000);
}
samples.sort((a, b) => a - b);
console.log(JSON.stringify({ medianMillisecondsPerStep: samples[2], stepsPerSample: 24000 }));
`, resolveDir: root }, bundle: true, format: 'esm', platform: 'node', write: false });
const directory = await mkdtemp(join(tmpdir(), 'game-physics-bench-'));
try {
  const file = join(directory, 'benchmark.mjs');
  await writeFile(file, compiled.outputFiles[0].contents);
  await import(pathToFileURL(file).href);
} finally { await rm(directory, { recursive: true, force: true }); }
