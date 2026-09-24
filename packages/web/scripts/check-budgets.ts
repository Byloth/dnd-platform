/**
 * The size budgets of the generated site (docs/phase-1/07-testing-accessibility-performance.md), gzip-compressed
 * as GitHub Pages serves them:
 * - first load without content, under 300 KB: `index.html`, the stylesheets and modules it links (entry and
 *   modulepreloads), and the latin files of the bundled type families (already compressed woff2, counted as they
 *   are; the other subsets are fetched only for the characters they cover);
 * - the SRD bundle, `content/srd51.json`, under 500 KB.
 * Every JavaScript and CSS file of the site is reported too, not budgeted. No tolerance: exit code 1 when a
 * budget is exceeded. Run after `nuxt generate`.
 *
 *   node scripts/check-budgets.ts
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const PUBLIC = resolve(import.meta.dirname, "..", ".output", "public");
const ASSETS = resolve(PUBLIC, "_nuxt");
const KB = 1024;

const BUDGETS = { firstLoad: 300 * KB, srd: 500 * KB };

function gzipped(path: string): number
{
    const bytes = readFileSync(path);

    return path.endsWith(".woff2") ? bytes.length : gzipSync(bytes).length;
}

function kilobytes(bytes: number): string
{
    return `${(bytes / KB).toFixed(1)} KB`;
}

const html = readFileSync(resolve(PUBLIC, "index.html"), "utf8");
const linked = [...html.matchAll(/<link rel="(?:stylesheet|modulepreload)"[^>]*href="[^"]*\/_nuxt\/([^"]+)"/g)]
    .map(([, file]) => file!);
const fonts = readdirSync(ASSETS).filter((file) => /-latin-\d+-(?:normal|italic)\.[\w-]+\.woff2$/.test(file));
const files = [...new Set([...linked, ...fonts])];

const firstLoad = gzipped(resolve(PUBLIC, "index.html")) +
    files.reduce((total, file) => total + gzipped(resolve(ASSETS, file)), 0);
const srd = gzipped(resolve(PUBLIC, "content", "srd51.json"));
const everything = readdirSync(ASSETS).filter((file) => /\.(?:js|css)$/.test(file))
    .reduce((total, file) => total + gzipped(resolve(ASSETS, file)), 0);

const rows: [string, number, number | undefined][] = [
    [`First load (index.html and ${files.length} files)`, firstLoad, BUDGETS.firstLoad],
    ["SRD bundle (content/srd51.json)", srd, BUDGETS.srd],
    ["Every JavaScript and CSS file of the site", everything, undefined]
];

let exceeded = false;
for (const [name, size, budget] of rows)
{
    const over = budget !== undefined && size > budget;
    exceeded ||= over;

    const limit = budget === undefined ? "(reported)" : `/ ${kilobytes(budget)}`;
    // eslint-disable-next-line no-console -- the report is the output.
    console.log(`${over ? "✗" : "✓"} ${name.padEnd(48)} ${kilobytes(size).padStart(10)} ${limit}`);
}

if (exceeded) { process.exitCode = 1; }
