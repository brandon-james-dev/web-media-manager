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
const sourceExamples = join(root, "examples", "sources");
const metadataExamples = join(root, "examples", "metadata");
const output = join(root, "public", "plugins");

const PLUGINS = ["aurora"];
/** Source plugins are declarative: a manifest and nothing else. */
const SOURCE_PLUGINS = ["webdav"];
/** Metadata plugins are declarative too. */
const METADATA_PLUGINS = ["itunes"];

mkdirSync(output, { recursive: true });

for (const id of METADATA_PLUGINS) {
  const directory = join(metadataExamples, id);
  const entries = {
    "manifest.json": new Uint8Array(
      readFileSync(join(directory, "manifest.json"))
    ),
  };

  const archive = zipSync(entries);
  const target = join(output, `${id}-metadata.zip`);
  writeFileSync(target, Buffer.from(archive));
  console.log(`built ${target} (${archive.byteLength} bytes)`);
}

for (const id of SOURCE_PLUGINS) {
  const directory = join(sourceExamples, id);
  const entries = {
    "manifest.json": new Uint8Array(
      readFileSync(join(directory, "manifest.json"))
    ),
  };

  const archive = zipSync(entries);
  const target = join(output, `${id}-source.zip`);
  writeFileSync(target, Buffer.from(archive));
  console.log(`built ${target} (${archive.byteLength} bytes)`);
}

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
