/**
 * Put the content the site ships into `public/content/` (DEC-21):
 * - `<id>@<version>.json`: every released version of every public package
 *   (`releases/content/`), never changed once published;
 * - `<id>.json`: the current build of each public package (`dnd build`), which
 *   CI checks to be its latest release;
 * - `<id>.changelog.md`: the package's changelog;
 * - `index.json`: `{ packages: { <id>: { latest, versions } } }`;
 * - `sample-character.json`: the sample character (an SRD-only fixture).
 * Run before `nuxt dev` and `nuxt generate`; the directory is git-ignored.
 *
 *   node scripts/prepare-content.ts
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

import { compareVersions } from "@byloth/dnd-platform-loader";

const WEB = resolve(import.meta.dirname, "..");
const ROOT = resolve(WEB, "..", "..");
const OUT = resolve(WEB, "public", "content");
const SAMPLE = resolve(ROOT, "fixtures", "characters", "cleric-l5", "character.yaml");

mkdirSync(OUT, { recursive: true });
const cli = resolve(ROOT, "packages", "cli", "dist", "index.js");
const srd51 = resolve(ROOT, "packages", "content", "srd51");
execFileSync("node", [cli, "build", "--out", OUT, srd51], { cwd: ROOT, stdio: "inherit" });

// Every release, and an index of the versions per package.
const RELEASES = resolve(ROOT, "releases", "content");
const RELEASE_FILE = /^(.+)@(\d+(?:\.\d+)*)\.json$/;
const versions = new Map<string, string[]>();
for (const file of existsSync(RELEASES) ? readdirSync(RELEASES) : [])
{
    const match = RELEASE_FILE.exec(file);
    if (!match) { continue; }

    copyFileSync(resolve(RELEASES, file), resolve(OUT, file));
    versions.set(match[1]!, [...(versions.get(match[1]!) ?? []), match[2]!]);
}
const index: Record<string, { latest: string, versions: string[] }> = {};
for (const [id, list] of [...versions].sort(([a], [b]) => (a < b ? -1 : 1)))
{
    const sorted = list.sort(compareVersions);
    index[id] = { latest: sorted.at(-1)!, versions: sorted };

    const changelog = resolve(ROOT, "packages", "content", id, "CHANGELOG.md");
    if (existsSync(changelog)) { copyFileSync(changelog, resolve(OUT, `${id}.changelog.md`)); }
}
writeFileSync(resolve(OUT, "index.json"), `${JSON.stringify({ packages: index }, null, 2)}\n`);
const published = Object.entries(index).map(([id, entry]) => `${id} ${entry.versions.join(", ")}`);
process.stdout.write(`releases → ${published.join("; ")}\n`);

const character = parse(readFileSync(SAMPLE, "utf8")) as unknown;
writeFileSync(resolve(OUT, "sample-character.json"), `${JSON.stringify(character, null, 2)}\n`);
process.stdout.write(`sample character → ${resolve(OUT, "sample-character.json")}\n`);
