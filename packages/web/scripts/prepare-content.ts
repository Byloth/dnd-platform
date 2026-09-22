/**
 * Put the content the site ships into `public/content/`: the SRD bundle
 * written by `dnd build` and the sample character (an SRD-only fixture)
 * as JSON. Run before `nuxt dev` and `nuxt generate`; the directory is
 * git-ignored.
 *
 *   node scripts/prepare-content.ts
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

const WEB = resolve(import.meta.dirname, "..");
const ROOT = resolve(WEB, "..", "..");
const OUT = resolve(WEB, "public", "content");
const SAMPLE = resolve(ROOT, "fixtures", "characters", "cleric-l5", "character.yaml");

mkdirSync(OUT, { recursive: true });
const cli = resolve(ROOT, "packages", "cli", "dist", "index.js");
const srd51 = resolve(ROOT, "packages", "content", "srd51");
execFileSync("node", [cli, "build", "--out", OUT, srd51], { cwd: ROOT, stdio: "inherit" });
const character = parse(readFileSync(SAMPLE, "utf8")) as unknown;
writeFileSync(resolve(OUT, "sample-character.json"), `${JSON.stringify(character, null, 2)}\n`);
process.stdout.write(`sample character → ${resolve(OUT, "sample-character.json")}\n`);
