import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

/**
 * Packs every example visualizer into `public/plugins/<id>.zip` so the app can
 * install it from the plugin manager without a build step at runtime.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examples = join(root, "examples", "visualizers");
const output = join(root, "public", "plugins");

const PLUGINS = ["aurora"];

mkdirSync(output, { recursive: true });

for (const id of PLUGINS) {
  const directory = join(examples, id);
  const files = ["manifest.json", "index.ts", "thumbnail.png"];
  const entries = {};

  for (const file of files) {
    entries[file] = new Uint8Array(readFileSync(join(directory, file)));
  }

  const archive = zipSync(entries);
  const target = join(output, `${id}.zip`);
  writeFileSync(target, Buffer.from(archive));
  console.log(`built ${target} (${archive.byteLength} bytes)`);
}
