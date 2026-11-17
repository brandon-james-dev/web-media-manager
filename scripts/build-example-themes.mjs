import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

/**
 * Packs every example theme into `public/themes/<id>.zip` so the app can
 * install it from the theme picker without a build step at runtime.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examples = join(root, "examples", "themes");
const output = join(root, "public", "themes");

const THEMES = ["classic-blue"];

/**
 * Lists every file under `directory` as package paths with `/` separators.
 *
 * @param {string} directory Absolute folder to walk.
 * @param {string} [base] Folder the returned paths are relative to.
 * @returns {string[]} Relative paths, sorted.
 */
function walk(directory, base = directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path, base));
    } else {
      found.push(relative(base, path).split(sep).join("/"));
    }
  }
  return found.sort();
}

mkdirSync(output, { recursive: true });

for (const id of THEMES) {
  const directory = join(examples, id);
  const entries = {};

  for (const file of walk(directory)) {
    entries[file] = new Uint8Array(readFileSync(join(directory, file)));
  }

  const archive = zipSync(entries);
  const target = join(output, `${id}.zip`);
  writeFileSync(target, Buffer.from(archive));
  console.log(`built ${target} (${archive.byteLength} bytes)`);
}
