/* Syntax-checks the frontend.
 *
 * There is no bundler and no TypeScript, so nothing else would catch a typo in
 * a module before the page fails to render. Node parses each file as an ES
 * module and reports the first error, which is the whole build step this
 * frontend has.
 *
 * Usage:  node scripts/check-frontend.mjs
 */

import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "frontend", "js");
const staging = join(tmpdir(), "cokpyt-frontend-check");

async function modulesIn(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await modulesIn(path)));
    else if (entry.name.endsWith(".js")) found.push(path);
  }
  return found;
}

const files = await modulesIn(source);
await rm(staging, { recursive: true, force: true });

let failed = 0;
for (const file of files) {
  /* --check parses by extension, so the copy has to be .mjs to be read as a
     module. Specifiers are never resolved, so the rewrite is safe. */
  const copy = join(staging, relative(source, file).replace(/\.js$/, ".mjs"));
  await mkdir(dirname(copy), { recursive: true });
  await writeFile(copy, await readFile(file));

  const result = spawnSync(process.execPath, ["--check", copy], { encoding: "utf8" });
  if (result.status === 0) {
    console.log(`ok    ${relative(root, file)}`);
    continue;
  }
  failed += 1;
  console.error(`FAIL  ${relative(root, file)}`);
  console.error(result.stderr.trim());
}

await rm(staging, { recursive: true, force: true });

console.log(`\n${files.length - failed}/${files.length} modules parsed`);
process.exit(failed === 0 ? 0 : 1);
