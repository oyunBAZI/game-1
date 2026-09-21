import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const compiled = await build({
  entryPoints: [new URL("../src/tests/GameIntegration.ts", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent"
});
const directory = await mkdtemp(join(tmpdir(), "game-1-test-"));
try {
  const file = join(directory, "simulation.mjs");
  await writeFile(file, compiled.outputFiles[0].contents);
  const { runGameTests } = await import(pathToFileURL(file).href);
  runGameTests();
} finally {
  await rm(directory, { recursive: true, force: true });
}
