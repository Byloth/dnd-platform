/**
 * The accessibility pass in a real browser (docs/phase-1/07-testing-accessibility-performance.md, M1.8b): what the
 * component tests cannot check without layout. Every screen of the generated site, served as GitHub Pages serves it
 * (`scripts/serve-site.ts`), in Chromium:
 * - axe, WCAG 2.1 A and AA with layout (colour contrast as rendered), in both languages and in the light, dark and
 *   more-contrast themes, on a phone and on a computer; `target-size` (WCAG 2.2, 24 px) too;
 * - reflow at 320 CSS pixels (WCAG 1.4.10, the 400 % zoom of a 1280 px screen): no horizontal scroll;
 * - the keyboard: Tab through the whole screen; every control reached, visible when focused, with a focus
 *   indicator, nothing else taking focus; the order is reported where it jumps back up the page, for review;
 * - Escape closes the explanation drawer, the dialogs and the bar's dropdowns, focus back on what opened them; a
 *   click outside a dropdown closes it too.
 * The findings go to `.output/accessibility.json` and a summary to the console; exit code 1 on any failure.
 * Run after `nuxt generate` (and `prepare-content`). The browser: `CHROME_PATH`, else an installed Chrome or
 * Chromium (chrome-launcher), as Lighthouse finds it.
 *
 *   node scripts/check-accessibility.ts [--quick] [--language=en|it]
 *
 * `--quick` checks the light theme on a phone only, in English unless `--language` says otherwise.
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { Launcher } from "chrome-launcher";
import puppeteer from "puppeteer-core";
import type { Browser, Page } from "puppeteer-core";
import { parse } from "yaml";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PORT = 4174;
const BASE = `http://localhost:${PORT}/dnd-platform`;
const OUTPUT = resolve(import.meta.dirname, "..", ".output", "accessibility.json");
const QUICK = process.argv.includes("--quick");
const LANGUAGE = process.argv.find((a) => a.startsWith("--language="))?.slice("--language=".length);

type Language = "en" | "it";
type Theme = "light" | "dark" | "more";
interface Viewport { readonly name: string, readonly width: number, readonly height: number }

const PHONE: Viewport = { name: "phone", width: 360, height: 740 };
const DESKTOP: Viewport = { name: "desktop", width: 1280, height: 800 };
const NARROW: Viewport = { name: "320", width: 320, height: 640 };

/** A stored character, for the screens that need one: the level 1 fighter of the fixtures, under its own id. */
const FIGHTER = resolve(ROOT, "fixtures", "characters", "plain-fighter-l1", "character.yaml");
const STORED = {
    ...(parse(readFileSync(FIGHTER, "utf8")) as Record<string, unknown>),
    id: "character-a11y",
    name: "Iron Sparrow"
};

/** One screen: where it is, and what to do to reach the state checked (open a drawer, a dialog). */
interface Screen
{
    readonly name: string;
    readonly path: string;
    /** One stored character, or two (the demo characters then fold). */
    readonly stored?: boolean | 2;
    /** Clicks the control that opens an overlay, marking it for the Escape check; `false` when not found. */
    readonly open?: (page: Page) => Promise<boolean>;
    /** A dropdown: after the Escape check, opened again and closed by a click outside it. */
    readonly outside?: boolean;
}

/** Clicks the first button or link whose name matches. */
function clickButton(pattern: RegExp): (page: Page) => Promise<boolean>
{
    return (page) => page.evaluate((source: string) =>
    {
        const re = new RegExp(source, "i");
        const button = [...document.querySelectorAll<HTMLElement>("button, a")]
            .find((b) => re.test((b.getAttribute("aria-label") ?? b.textContent ?? "").trim()));
        if (!button) { return false; }

        button.dataset["a11yOpener"] = "opener";
        button.focus();
        button.click();

        return true;

    }, pattern.source);
}

/** Opens the explanation of the first value of a sheet. */
function openExplanation(page: Page): Promise<boolean>
{
    return page.evaluate(() =>
    {
        const tile = document.querySelector<HTMLButtonElement>("button.value-tile__face");
        if (!tile) { return false; }

        tile.dataset["a11yOpener"] = "opener";
        tile.focus();
        tile.click();

        return true;
    });
}

const WIZARD_STEPS = [
    "content", "concept", "species", "class", "background", "abilities", "choices", "equipment", "personality", "review"

] as const;

const SCREENS: readonly Screen[] = [
    { name: "characters", path: "/" },
    { name: "characters, a stored one", path: "/", stored: true },
    { name: "characters, two stored", path: "/", stored: 2 },
    { name: "export dialog", path: "/", stored: true, open: clickButton(/^(Export|Esporta) Iron Sparrow/) },
    { name: "demo sheet", path: "/characters/fixture-cleric-l5" },
    { name: "explanation drawer", path: "/characters/fixture-cleric-l5", open: openExplanation },
    { name: "stored sheet", path: "/characters/character-a11y", stored: true },
    {
        name: "delete dialog",
        path: "/characters/character-a11y",
        stored: true,
        open: clickButton(/^(Delete|Elimina)$/)
    },
    ...WIZARD_STEPS.map((step): Screen => ({ name: `wizard: ${step}`, path: `/characters/new?step=${step}` })),
    { name: "edit: class", path: "/characters/character-a11y/edit?step=class", stored: true },
    { name: "packages", path: "/packages" },
    { name: "compendium", path: "/compendium" },
    { name: "compendium: spells", path: "/compendium/spells?level=3" },
    { name: "compendium: an entry", path: "/compendium/spells/srd51.spell.fireball" },
    { name: "changelog", path: "/changelog/srd51" },
    { name: "credits", path: "/credits" },
    { name: "privacy", path: "/privacy" },
    { name: "roadmap", path: "/roadmap" },
    { name: "settings", path: "/settings" },
    { name: "theme switch", path: "/", open: clickButton(/^(Theme|Tema):/), outside: true },
    { name: "language switch", path: "/", open: clickButton(/^(Language|Lingua):/), outside: true }
];

// ---- findings -------------------------------------------------------------------------------------------------

type Kind = "axe" | "target" | "reflow" | "focus-unreached" | "focus-hidden" | "focus-indicator" | "focus-stray" |
    "escape" | "order";

interface Finding
{
    readonly screen: string;
    readonly setting: string;
    readonly kind: Kind;
    readonly severity: "failure" | "review";
    readonly message: string;
    readonly targets?: readonly string[];
}

const findings: Finding[] = [];

function fail(screen: Screen, setting: string, kind: Kind, message: string, targets?: readonly string[]): void
{
    findings.push({
        screen: screen.name,
        setting: setting,
        kind: kind,
        severity: "failure",
        message: message,
        ...(targets ? { targets: targets } : {})
    });
}

// ---- the browser --------------------------------------------------------------------------------------------

function chromePath(): string
{
    const fromEnvironment = process.env["CHROME_PATH"];
    if (fromEnvironment) { return fromEnvironment; }

    const installed = Launcher.getInstallations()[0];
    if (!installed) { throw new Error("No Chrome or Chromium found: set CHROME_PATH."); }

    return installed;
}

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

const pause = (milliseconds: number): Promise<void> => new Promise((done) => setTimeout(done, milliseconds));

/** Waits until the page has stopped changing: its content computed, its fonts loaded. */
async function settle(page: Page): Promise<void>
{
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    let previous = "";
    for (let attempt = 0; attempt < 40; attempt += 1)
    {
        const now = await page.evaluate(() => `${document.body.innerHTML.length}:` +
            `${document.querySelectorAll("[role=status]").length}`);
        if (now === previous) { return; }

        previous = now;
        await pause(150);
    }
}

/**
 * Puts the stored character into the page's own IndexedDB (the site opened it on its first page); with `count` 2,
 * a second one beside it.
 */
async function storeCharacter(page: Page, count = 1): Promise<void>
{
    for (let i = 0; i < count; i += 1)
    {
        const copy = i === 0 ? STORED : { ...STORED, id: `${STORED.id}-${i + 1}`, name: `${STORED.name} ${i + 1}` };
        await putCharacter(page, JSON.stringify(copy));
    }
}

async function putCharacter(page: Page, text: string): Promise<void>
{
    await page.evaluate(async (document: string) =>
    {
        const character = JSON.parse(document) as { id: string };
        await new Promise<void>((done, failed) =>
        {
            const request = indexedDB.open("dnd-platform");
            request.onerror = () => failed(request.error);
            request.onsuccess = () =>
            {
                const database = request.result;
                const transaction = database.transaction("characters", "readwrite");
                transaction.objectStore("characters").put(character);
                transaction.oncomplete = () =>
                {
                    database.close();
                    done();
                };
                transaction.onerror = () => failed(transaction.error);
            };
        });

    }, text);
}

/** A fresh page: the language and theme as preferences, the statistics declined, a stored character if asked. */
async function open(
    browser: Browser, screen: Screen, language: Language, theme: Theme, viewport: Viewport
): Promise<Page>
{
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

    const preferences = {
        language: language,
        helpLevel: "newcomer",
        theme: theme === "dark" ? "dark" : "light",
        contrast: theme === "more" ? "more" : "system",
        pageSize: "a4",
        hand: "handwriting"
    };
    const consent = { analytics: "denied", decidedAt: "2026-10-06T00:00:00.000Z" };
    await page.evaluateOnNewDocument((prefs: string, decided: string) =>
    {
        localStorage.setItem("preferences", prefs);
        localStorage.setItem("consent", decided);

    }, JSON.stringify(preferences), JSON.stringify(consent));

    if (screen.stored)
    {
        await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
        await storeCharacter(page, screen.stored === 2 ? 2 : 1);
    }

    await page.goto(`${BASE}${screen.path}`, { waitUntil: "networkidle0" });
    await settle(page);

    return page;
}

// ---- the checks ---------------------------------------------------------------------------------------------

interface AxeViolation
{
    readonly id: string;
    readonly help: string;
    readonly impact: string;
    readonly nodes: readonly { target: string[] }[];
}

interface AxeRunner
{
    run(context: Document, options: unknown): Promise<{ violations: AxeViolation[] }>;
}

async function checkAxe(page: Page, screen: Screen, setting: string): Promise<void>
{
    await page.addScriptTag({ content: AXE });
    const violations = await page.evaluate(async (): Promise<AxeViolation[]> =>
    {
        const axe = (window as unknown as { axe: AxeRunner }).axe;
        const results = await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
            resultTypes: ["violations"]
        });

        return results.violations;
    });

    for (const violation of violations)
    {
        fail(
            screen,
            setting,
            violation.id === "target-size" ? "target" : "axe",
            `${violation.id}: ${violation.help} (${violation.impact})`,
            violation.nodes.slice(0, 8).map((n) => n.target.join(" "))
        );
    }
}

async function checkReflow(page: Page, screen: Screen, setting: string): Promise<void>
{
    const overflow = await page.evaluate(() =>
    {
        const width = document.documentElement.clientWidth;
        const scrolling = (element: HTMLElement): boolean =>
        {
            for (let parent = element.parentElement; parent; parent = parent.parentElement)
            {
                const style = getComputedStyle(parent);
                if (style.overflowX === "auto" || style.overflowX === "scroll") { return true; }
            }

            return false;
        };
        // Inside a horizontally scrolling region, overflow is the region's business (a wide table, WCAG 1.4.10).
        const wide = [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((element) =>
            {
                const rect = element.getBoundingClientRect();

                return (rect.width > 0) && (rect.height > 0) && (rect.right > width + 1) && !scrolling(element);
            })
            .slice(0, 5)
            .map((element) => `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`);

        return { width: width, scroll: document.documentElement.scrollWidth, wide: wide };
    });

    if (overflow.scroll > overflow.width + 1)
    {
        fail(screen, setting, "reflow", `horizontal scroll at 320 px: ${overflow.scroll} px wide`, overflow.wide);
    }
}

interface Focused
{
    readonly id: string;
    readonly label: string;
    readonly interactive: boolean;
    readonly visible: boolean;
    readonly indicator: boolean;
    readonly top: number;
    readonly fixed: boolean;
}

/** What the focus is on after a Tab; `undefined` when it left the page for the browser's own controls. */
function focusedNow(page: Page): Promise<Focused | undefined>
{
    return page.evaluate((): Focused | undefined =>
    {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) { return undefined; }

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const outline = (style.outlineStyle !== "none") && (parseFloat(style.outlineWidth) > 0);
        const roles = ["button", "link", "checkbox", "radio", "tab", "switch", "menuitem", "option", "slider",
            "textbox", "combobox", "spinbutton", "dialog", "region"];
        const controls = "a[href], button, input, select, textarea, summary, [contenteditable=true], dialog, iframe";
        let fixed = false;
        for (let node: HTMLElement | null = element; node && !fixed; node = node.parentElement)
        {
            const position = getComputedStyle(node).position;
            fixed = (position === "fixed") || (position === "sticky");
        }
        const name = (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40);
        const kind = element.className ? `.${String(element.className).split(" ")[0]}` : "";

        return {
            id: element.dataset["a11yId"] ?? "",
            label: `${element.tagName.toLowerCase()}${kind} "${name}"`,
            interactive: element.matches(controls) || roles.includes(element.getAttribute("role") ?? ""),
            visible: (rect.width > 0) && (rect.height > 0) && (rect.bottom > 0) && (rect.right > 0) &&
                (rect.top < innerHeight) && (rect.left < innerWidth) && (style.visibility !== "hidden"),
            indicator: outline || (style.boxShadow !== "none"),
            top: rect.top + scrollY,
            fixed: fixed
        };
    });
}

/** The visible controls Tab did not reach (a dialog keeps the focus inside itself: then only its controls). */
function unreachedControls(page: Page, reached: readonly string[]): Promise<string[]>
{
    return page.evaluate((reachedIds: string[]) =>
    {
        const scope: ParentNode = document.querySelector("dialog[open]") ?? document;
        const selector = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), " +
            "select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";
        const hidden = (element: HTMLElement): boolean =>
        {
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height || getComputedStyle(element).visibility === "hidden") { return true; }
            if (element.closest("[inert], [aria-hidden=true]") || (element.tabIndex < 0)) { return true; }
            // The content of a closed disclosure is not shown: only its summary takes the focus.
            const closed = element.closest("details:not([open])");

            return (closed !== null) && (closed.querySelector(":scope > summary") !== element);
        };
        // One radio of a group takes the Tab (the checked one, else the first); the arrows reach the others.
        const otherRadio = (element: HTMLElement): boolean =>
        {
            if (!(element instanceof HTMLInputElement) || (element.type !== "radio") || element.checked)
            {
                return false;
            }
            const group = [...document.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${element.name}"]`)];

            return group.some((r) => r.checked) || (group[0] !== element);
        };

        return [...scope.querySelectorAll<HTMLElement>(selector)]
            .filter((element) => !hidden(element) && !otherRadio(element) &&
                !reachedIds.includes(element.dataset["a11yId"] ?? ""))
            .slice(0, 8)
            .map((element) =>
            {
                const name = (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40);

                return `${element.tagName.toLowerCase()} "${name}"`;
            });

    }, [...reached]);
}

/** Tabs through the screen until the focus comes back to a control already reached. */
async function checkKeyboard(page: Page, screen: Screen, setting: string): Promise<void>
{
    await page.evaluate(() =>
    {
        (document.activeElement as HTMLElement | null)?.blur();
        window.scrollTo(0, 0);
        let index = 0;
        for (const element of document.querySelectorAll<HTMLElement>("*"))
        {
            element.dataset["a11yId"] = String(index);
            index += 1;
        }
    });

    const reached: Focused[] = [];
    let outside = 0;
    for (let press = 0; (press < 400) && (outside <= 3); press += 1)
    {
        await page.keyboard.press("Tab");
        const focused = await focusedNow(page);
        // Out of the page (the browser's own controls) between the last control and the first: go on.
        if (!focused) { outside += 1; }
        else if (reached.some((r) => r.id === focused.id)) { break; }
        else { reached.push(focused); }
    }

    for (const focused of reached)
    {
        if (!focused.interactive) { fail(screen, setting, "focus-stray", `not a control: ${focused.label}`); }
        if (!focused.visible) { fail(screen, setting, "focus-hidden", `focused but not visible: ${focused.label}`); }
        if (!focused.indicator) { fail(screen, setting, "focus-indicator", `no focus indicator: ${focused.label}`); }
    }

    // The order: a jump back up the page, outside fixed bars, is worth a look.
    const flowing = reached.filter((r) => !r.fixed);
    for (let i = 1; i < flowing.length; i += 1)
    {
        if (flowing[i]!.top < flowing[i - 1]!.top - 250)
        {
            findings.push({
                screen: screen.name,
                setting: setting,
                kind: "order",
                severity: "review",
                message: `focus goes back up from ${flowing[i - 1]!.label} to ${flowing[i]!.label}`
            });
        }
    }

    for (const label of await unreachedControls(page, reached.map((r) => r.id)))
    {
        fail(screen, setting, "focus-unreached", `never reached with Tab: ${label}`);
    }
}

async function checkEscape(page: Page, screen: Screen, setting: string): Promise<void>
{
    await page.keyboard.press("Escape");
    await pause(300);
    const state = await page.evaluate(() => ({
        open: document.querySelector("dialog[open], .dropdown-menu__button[aria-expanded='true']") !== null,
        back: (document.activeElement as HTMLElement | null)?.dataset["a11yOpener"] === "opener"
    }));

    if (state.open) { fail(screen, setting, "escape", "Escape leaves the overlay open"); }
    else if (!state.back) { fail(screen, setting, "escape", "after Escape, focus is not on what opened it"); }
}

/** A dropdown opened again closes when the player clicks elsewhere on the page. */
async function checkOutside(page: Page, screen: Screen, setting: string, viewport: Viewport): Promise<void>
{
    await screen.open!(page);
    await pause(150);
    await page.mouse.click(Math.round(viewport.width / 2), viewport.height - 20);
    await pause(300);

    if (await page.evaluate(() => document.querySelector(".dropdown-menu__button[aria-expanded='true']") !== null))
    {
        fail(screen, setting, "escape", "a click outside leaves the dropdown open");
    }
}

// ---- the run ------------------------------------------------------------------------------------------------

async function checkScreen(
    browser: Browser, screen: Screen, language: Language, theme: Theme, viewport: Viewport
): Promise<number>
{
    const setting = `${language}, ${theme}, ${viewport.name}`;
    const page = await open(browser, screen, language, theme, viewport);
    const opened = screen.open ? await screen.open(page) : false;
    if (screen.open && !opened) { fail(screen, setting, "escape", "the control that opens it was not found"); }
    if (opened) { await settle(page); }

    await checkAxe(page, screen, setting);
    // The keyboard and Escape do not depend on the colours: once per language and viewport.
    if (theme === "light")
    {
        await checkKeyboard(page, screen, setting);
        if (opened) { await checkEscape(page, screen, setting); }
        if (opened && screen.outside) { await checkOutside(page, screen, setting, viewport); }
    }
    await page.browserContext().close();

    if ((theme !== "light") || (viewport !== PHONE)) { return 1; }

    const narrow = await open(browser, screen, language, theme, NARROW);
    if (screen.open && (await screen.open(narrow))) { await settle(narrow); }
    await checkReflow(narrow, screen, `${language}, ${theme}, 320`);
    await narrow.browserContext().close();

    return 2;
}

function report(runs: number): void
{
    writeFileSync(OUTPUT, `${JSON.stringify({ runs: runs, findings: findings }, null, 2)}\n`);

    const failures = findings.filter((f) => f.severity === "failure");
    const reviews = findings.filter((f) => f.severity === "review");
    const byKind = new Map<string, number>();
    for (const f of failures) { byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1); }

    const lines = [`\n${runs} screens checked: ${failures.length} failure(s), ${reviews.length} to review.`];
    for (const [kind, count] of byKind) { lines.push(`  ${kind}: ${count}`); }

    const unique = new Map<string, Finding>();
    for (const f of failures) { unique.set(`${f.screen}|${f.kind}|${f.message}`, f); }
    for (const f of unique.values())
    {
        lines.push(`✗ ${f.screen} [${f.setting}] ${f.message}`);
        for (const target of f.targets ?? []) { lines.push(`    ${target}`); }
    }
    lines.push(`Details: ${OUTPUT}`);
    process.stdout.write(`${lines.join("\n")}\n`);

    process.exitCode = failures.length ? 1 : 0;
}

async function main(): Promise<void>
{
    const stop = await serve();
    const browser = await puppeteer.launch({
        executablePath: chromePath(),
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });

    const languages: readonly Language[] = LANGUAGE ? [LANGUAGE as Language] : (QUICK ? ["en"] : ["en", "it"]);
    const themes: readonly Theme[] = QUICK ? ["light"] : ["light", "dark", "more"];
    const viewports: readonly Viewport[] = QUICK ? [PHONE] : [PHONE, DESKTOP];
    let runs = 0;

    try
    {
        for (const screen of SCREENS)
        {
            for (const language of languages)
            {
                for (const theme of themes)
                {
                    for (const viewport of viewports)
                    {
                        runs += await checkScreen(browser, screen, language, theme, viewport);
                    }
                }
            }
            process.stdout.write(`· ${screen.name}\n`);
        }
    }
    finally
    {
        await browser.close();
        stop();
    }

    report(runs);
}

await main();
