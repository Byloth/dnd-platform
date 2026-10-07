/**
 * The repeat visit (docs/phase-1/07-testing-accessibility-performance.md, the owner's decision at M1.3d, measured
 * at M1.8d): the sheet interactive under two seconds when the player comes back. Lighthouse CI opens every run in
 * a fresh profile, so this script shares one browser instead: a first visit installs the service worker and lets
 * it cache the shell and the SRD's release, then Lighthouse measures the sheet three times with the storage kept,
 * on the phone preset of `lighthouserc.json`. It prints the median time to interactive and fails above two seconds.
 * Run after `nuxt generate` (and `prepare-content`). The browser: `CHROME_PATH`, else an installed Chrome or
 * Chromium (chrome-launcher). Lighthouse 12 may log a `TypeError` from its trace engine's insights on requests the
 * service worker answers; the insights are not used and the metrics are unaffected.
 *
 *   node scripts/check-repeat-visit.ts
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import puppeteer from "puppeteer-core";

const PORT = 4175;
const URL = `http://localhost:${PORT}/dnd-platform/characters/fixture-perf-caster-l20`;
const RUNS = 3;
const LIMIT = 2000;

const config = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "lighthouserc.json"), "utf8")) as {
    ci: { collect: { settings: Record<string, unknown> } };
};
const { chromeFlags: _flags, ...settings } = config.ci.collect.settings;

function serve(): Promise<() => void>
{
    const server = spawn(process.execPath, [resolve(import.meta.dirname, "serve-site.ts"), String(PORT)], {
        stdio: ["ignore", "pipe", "inherit"]
    });

    return new Promise((started, reject) =>
    {
        server.on("error", reject);
        server.stdout.on("data", (chunk: Buffer) =>
        {
            if (chunk.toString().includes("Serving the site")) { started(() => server.kill()); }
        });
    });
}

const stop = await serve();
// A profile of its own: under WSL, chrome-launcher's default one lands in the working directory. Chrome still
// writes two small caches there under a mangled path; the package script removes them, as `lighthouse` does.
const profile = mkdtempSync(join(tmpdir(), "repeat-visit-"));
const chrome = await launch({
    chromePath: process.env["CHROME_PATH"],
    userDataDir: profile,
    chromeFlags: ["--headless=new", "--no-sandbox"]
});

try
{
    const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
    const page = await browser.newPage();

    // The first visit: the service worker installs and takes control, the sheet fetches the SRD through it.
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload({ waitUntil: "networkidle0" });
    const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
    if (!controlled) { throw new Error("The service worker did not take control of the page."); }

    const times: number[] = [];
    for (let run = 0; run < RUNS; run += 1)
    {
        const result = await lighthouse(URL, {
            port: chrome.port,
            disableStorageReset: true,
            onlyCategories: ["performance"],
            logLevel: "error"

        }, { extends: "lighthouse:default", settings: { ...settings, disableStorageReset: true } }, page);
        const interactive = result?.lhr.audits["interactive"]?.numericValue;
        if (interactive === undefined) { throw new Error("Lighthouse returned no time to interactive."); }

        times.push(interactive);
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)]!;
    const list = times.map((t) => `${(t / 1000).toFixed(2)} s`).join(", ");
    const seconds = (median / 1000).toFixed(2);
    // eslint-disable-next-line no-console -- the report is the output.
    console.log(`${median > LIMIT ? "✗" : "✓"} Repeat visit, the sheet of the level 20 caster: time to interactive ` +
        `${seconds} s (median of ${list}; limit ${LIMIT / 1000} s).`);

    if (median > LIMIT) { process.exitCode = 1; }
    await browser.disconnect();
}
finally
{
    chrome.kill();
    stop();
    rmSync(profile, { recursive: true, force: true });
}

