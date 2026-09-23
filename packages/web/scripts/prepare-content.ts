/**
 * Put the content the site ships into `public/content/` (DEC-21):
 * - `<id>@<version>.json`: every released version of every public package
 *   (`releases/content/`), never changed once published;
 * - `<id>.json`: the current build of each public package (`dnd build`), which
 *   CI checks to be its latest release;
 * - `<id>.changelog.md`: the package's changelog;
 * - `index.json`: `{ packages: { <id>: { latest, versions } } }`;
 * - `characters/<id>.json` and `characters/index.json`: the demo characters, SRD-only fixtures that give the
 *   sheet something to show until the user's own characters arrive (M1.5).
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
/**
 * The demo characters: a divine caster, a full caster, a martial class without resources, one with Rage, a
 * multiclass caster, the level 20 caster.
 */
const DEMOS = ["cleric-l5", "wizard-l5", "rogue-l5", "barbarian-l5", "multiclass-caster", "perf-caster-l20"];

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

// Demo characters: only fixtures that need nothing but the published SRD.
interface DemoCharacter
{
    readonly id: string;
    readonly name: string;
    readonly choices: { readonly classes?: readonly { readonly class: string, readonly levels: number }[] };
}
const srd = JSON.parse(readFileSync(resolve(OUT, "srd51.json"), "utf8")) as {
    entities: { id: string, data: { name?: { en?: string } } }[];
};
const className = (id: string): string => srd.entities.find((e) => e.id === id)?.data.name?.en ?? id;
const CHARACTERS = resolve(OUT, "characters");
mkdirSync(CHARACTERS, { recursive: true });
const demos = DEMOS.map((name) =>
{
    const dir = resolve(ROOT, "fixtures", "characters", name);
    const packages = (parse(readFileSync(resolve(dir, "packages.yaml"), "utf8")) as { packages: string[] }).packages;
    if (packages.length !== 1 || packages[0] !== "packages/content/srd51")
    {
        throw new Error(`${name}: a demo character may use only the published SRD, not ${packages.join(", ")}`);
    }

    const character = parse(readFileSync(resolve(dir, "character.yaml"), "utf8")) as DemoCharacter;
    writeFileSync(resolve(CHARACTERS, `${character.id}.json`), `${JSON.stringify(character, null, 2)}\n`);
    const summary = (character.choices.classes ?? []).map((c) => `${className(c.class)} ${c.levels}`).join(" / ");

    return { id: character.id, name: character.name, summary: summary };
});
writeFileSync(resolve(CHARACTERS, "index.json"), `${JSON.stringify(demos, null, 2)}\n`);
process.stdout.write(`demo characters → ${demos.map((d) => d.id).join(", ")}\n`);
