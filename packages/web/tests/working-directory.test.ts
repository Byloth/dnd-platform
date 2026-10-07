/**
 * The working directory (docs/phase-1/02-content-and-character-stores.md, M1.8), on a folder in memory: connecting
 * writes the READMEs and mirrors what the browser has; every write here reaches the folder; reconciliation takes
 * what changed on either side (newest wins when both did), imports new files, refuses unreadable ones without
 * touching them, and deletes from the folder only what was deleted here; package folders load through the usual
 * checks, a broken one is reported and skipped; a sync counts its items for the progress bar; the permission of a
 * later visit needs a click.
 */

import "fake-indexeddb/auto";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse, stringify } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { watch } from "vue";

import type { Character } from "@byloth/dnd-platform-engine";

import { usePackageLoader } from "@/composables/packages";
import { useBrowserStorage } from "@/composables/storage";
import {
    resetWorkingDirectory,
    setWorkingDirectoryEnvironment,
    useWorkingDirectory
} from "@/composables/working-directory";

import type { MemoryFile } from "./folder";
import { copyInto, MemoryFolder, memoryEnvironment } from "./folder";
import { clearBrowserStorage, FIXTURES, ROOT, serveSite, zipOf } from "./helpers";

const site = serveSite();

const FIGHTER = parse(
    readFileSync(join(ROOT, "fixtures", "characters", "plain-fighter-l1", "character.yaml"), "utf8")
) as Character;
const character = (id: string, name: string): Character => ({ ...FIGHTER, id: id, name: name });

/** Lets the clock move, so that a write after a sync is later than it. */
const later = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

let folder: MemoryFolder;
beforeEach(() =>
{
    site.publish(true);
    folder = new MemoryFolder("my-characters");
    setWorkingDirectoryEnvironment(memoryEnvironment(folder));
});
afterEach(async () =>
{
    resetWorkingDirectory();
    setWorkingDirectoryEnvironment(undefined);
    await clearBrowserStorage();
});

const fileOf = (id: string): MemoryFile => folder.at(`characters/${id}.yaml`) as MemoryFile;
const actions = (): string[] =>
    (useWorkingDirectory().report.value?.changes ?? []).map((c) => `${c.action} ${c.name}`);

describe("connecting a folder", () =>
{
    it("writes the READMEs and the characters and packages the browser has", async () =>
    {
        const storage = useBrowserStorage();
        await storage.characters.put(character("hero-1", "Iron Sparrow"));

        expect(await useWorkingDirectory().connect()).toBe(true);

        expect(useWorkingDirectory().status.value).toBe("connected");
        expect(useWorkingDirectory().folder.value).toBe("my-characters");
        expect(folder.paths()).toEqual([
            "README.txt",
            "characters/README.txt",
            "characters/hero-1.yaml",
            "exports/README.txt",
            "packages/README.txt"
        ]);
        expect(parse(fileOf("hero-1").text)).toEqual(character("hero-1", "Iron Sparrow"));
        expect(actions()).toEqual(["written Iron Sparrow"]);
    });

    it("does nothing when the player closes the picker", async () =>
    {
        setWorkingDirectoryEnvironment(memoryEnvironment(undefined));

        expect(await useWorkingDirectory().connect()).toBe(false);
        expect(useWorkingDirectory().status.value).toBe("none");
    });

    it("leaves the files in the folder on disconnecting, and stops writing there", async () =>
    {
        const directory = useWorkingDirectory();
        await directory.connect();
        await useBrowserStorage().characters.put(character("hero-1", "Iron Sparrow"));
        await directory.disconnect();
        await useBrowserStorage().characters.put(character("hero-2", "Second"));

        expect(directory.status.value).toBe("none");
        expect(fileOf("hero-1")).toBeDefined();
        expect(fileOf("hero-2")).toBeUndefined();
    });
});

describe("the mirror", () =>
{
    it("writes a character saved here and deletes the file of one deleted here", async () =>
    {
        await useWorkingDirectory().connect();
        const storage = useBrowserStorage();

        await storage.characters.put(character("hero-1", "Iron Sparrow"));
        expect(parse(fileOf("hero-1").text).name).toBe("Iron Sparrow");

        await storage.characters.put(character("hero-1", "Iron Sparrow II"));
        expect(parse(fileOf("hero-1").text).name).toBe("Iron Sparrow II");

        await storage.characters.remove("hero-1");
        expect(fileOf("hero-1")).toBeUndefined();
    });

    it("writes a loaded package unpacked, and removes its folder when the package is removed", async () =>
    {
        await useWorkingDirectory().connect();
        await usePackageLoader().load(zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline"));

        const paths = folder.paths().filter((p) => p.startsWith("packages/homebrew.byloth/"));
        expect(paths).toContain("packages/homebrew.byloth/package.yaml");
        expect(paths.some((p) => p.startsWith("packages/homebrew.byloth/species/"))).toBe(true);
        const manifest = folder.at("packages/homebrew.byloth/package.yaml") as MemoryFile;
        expect(parse(manifest.text).id).toBe("homebrew.byloth");

        await useBrowserStorage().packages.remove("homebrew.byloth", parse(
            (folder.at("packages/homebrew.byloth/package.yaml") as MemoryFile).text
        ).version);
        expect(folder.at("packages/homebrew.byloth")).toBeUndefined();
    });

    it("saves a character file into exports/", async () =>
    {
        const directory = useWorkingDirectory();
        await directory.connect();

        const name = await directory.saveExport({
            format: "dnd-platform-export/1",
            exportedAt: "2026-10-06T00:00:00.000Z",
            application: { version: "test" },
            character: character("hero-1", "Iron Sparrow"),
            packages: [{ id: "srd51", version: "0.9.0", redistributable: true }]
        });

        expect(name).toBe("Iron Sparrow.dnd.json");
        expect(JSON.parse((folder.at("exports/Iron Sparrow.dnd.json") as MemoryFile).text).character.id).toBe("hero-1");
    });
});

describe("reading the folder again", () =>
{
    it("imports a new character file and takes a file changed in the folder", async () =>
    {
        const directory = useWorkingDirectory();
        await useBrowserStorage().characters.put(character("hero-1", "Iron Sparrow"));
        await directory.connect();

        folder.put("characters/hero-2.yaml", stringify(character("hero-2", "From Disk")));
        fileOf("hero-1").edit(stringify(character("hero-1", "Edited By Hand")));
        await directory.reload();

        const stored = await useBrowserStorage().characters.list();
        expect(stored.map((c) => c.name).sort()).toEqual(["Edited By Hand", "From Disk"]);
        expect(actions().sort()).toEqual(["imported From Disk", "updated-here Edited By Hand"]);
    });

    it("counts the items before it starts and only goes forward, to the end", async () =>
    {
        const directory = useWorkingDirectory();
        await useBrowserStorage().characters.put(character("hero-1", "Iron Sparrow"));
        await directory.connect();
        folder.put("characters/hero-2.yaml", stringify(character("hero-2", "From Disk")));

        const seen: { done: number, total: number }[] = [];
        const stop = watch(directory.progress, (value) => { seen.push({ ...value }); }, { flush: "sync" });
        await directory.reload();
        stop();

        // Two files in the folder, one character here; no package anywhere.
        const counted = seen.filter((p) => p.total > 0);
        expect(counted.every((p) => p.total === 3)).toBe(true);
        expect(counted.map((p) => p.done)).toEqual([...counted.map((p) => p.done)].sort((a, b) => a - b));
        expect(directory.progress.value).toEqual({ done: 3, total: 3 });
    });

    it("writes to the folder a character changed here while disconnected", async () =>
    {
        const directory = useWorkingDirectory();
        await useBrowserStorage().characters.put(character("hero-1", "Iron Sparrow"));
        await directory.connect();
        await directory.disconnect();
        setWorkingDirectoryEnvironment(memoryEnvironment(folder));
        await directory.connect();

        await later();
        // Saved here without the mirror, as during a visit where the folder was not connected.
        await useBrowserStorage().characters.put(character("hero-1", "Changed Here"), { mirror: false });
        await directory.reload();

        expect(parse(fileOf("hero-1").text).name).toBe("Changed Here");
        expect(actions()).toEqual(["updated-folder Changed Here"]);
    });

    it("keeps the newest when both sides changed", async () =>
    {
        const directory = useWorkingDirectory();
        await useBrowserStorage().characters.put(character("hero-1", "Iron Sparrow"));
        await directory.connect();

        await later();
        await useBrowserStorage().characters.put(character("hero-1", "Changed Here"), { mirror: false });
        await later();
        fileOf("hero-1").edit(stringify(character("hero-1", "Changed There, Later")));
        await directory.reload();

        expect((await useBrowserStorage().characters.get("hero-1"))?.name).toBe("Changed There, Later");
        expect(actions()).toEqual(["updated-here Changed There, Later"]);
    });

    it("refuses an invalid file and leaves it as the player wrote it", async () =>
    {
        const directory = useWorkingDirectory();
        await useBrowserStorage().characters.put(character("hero-1", "Iron Sparrow"));
        await directory.connect();

        fileOf("hero-1").edit("name: [unfinished\n");
        folder.put("characters/broken.yaml", stringify({ id: "broken", name: "No Choices" }));
        await directory.reload();

        expect(fileOf("hero-1").text).toBe("name: [unfinished\n");
        expect((await useBrowserStorage().characters.get("hero-1"))?.name).toBe("Iron Sparrow");
        expect(await useBrowserStorage().characters.get("broken")).toBeUndefined();
        expect(actions().sort()).toEqual(["refused broken.yaml", "refused hero-1.yaml"]);
        expect(directory.report.value?.changes.every((c) => (c.problems ?? []).length > 0)).toBe(true);
    });

    it("removes from the folder a character deleted here while disconnected, never one missing from it", async () =>
    {
        const directory = useWorkingDirectory();
        const storage = useBrowserStorage();
        await storage.characters.put(character("hero-1", "Deleted Here"));
        await storage.characters.put(character("hero-2", "Deleted There"));
        await directory.connect();

        await storage.characters.remove("hero-1", { mirror: false });
        await (folder.at("characters") as MemoryFolder).removeEntry("hero-2.yaml");
        await directory.reload();

        expect(fileOf("hero-1")).toBeUndefined();
        expect((await storage.characters.get("hero-2"))?.name).toBe("Deleted There");
        expect(fileOf("hero-2")).toBeDefined();
        expect(actions().sort()).toEqual(["removed-folder Deleted Here", "written Deleted There"]);
    });

    it("loads a package folder, reports a broken one and loads the others", async () =>
    {
        const directory = useWorkingDirectory();
        copyInto(folder, "packages/homebrew-feline", join(FIXTURES, "homebrew-feline"));
        copyInto(folder, "packages/unknown-kind", join(FIXTURES, "invalid", "unknown-kind"));
        await directory.connect();

        const stored = (await useBrowserStorage().packages.list()).map((r) => [r.source.manifest.id, r.origin]);
        expect(stored).toEqual([["homebrew.byloth", "directory"]]);
        expect(actions()).toEqual(["imported Byloth's homebrew", "refused packages/unknown-kind"]);

        // Nothing changed: reading again checks nothing and reports nothing.
        await directory.reload();
        expect(actions()).toEqual(["refused packages/unknown-kind"]);
    });
});

describe("a later visit", () =>
{
    it("connects again by itself when the browser still grants the folder", async () =>
    {
        const environment = memoryEnvironment(folder);
        setWorkingDirectoryEnvironment(environment);
        await useWorkingDirectory().connect();
        resetWorkingDirectory();
        setWorkingDirectoryEnvironment(environment);

        folder.put("characters/hero-9.yaml", stringify(character("hero-9", "Waiting")));
        await useWorkingDirectory().restore();

        expect(useWorkingDirectory().status.value).toBe("connected");
        expect((await useBrowserStorage().characters.get("hero-9"))?.name).toBe("Waiting");
    });

    it("waits for a click when the browser asks again", async () =>
    {
        const environment = memoryEnvironment(folder);
        setWorkingDirectoryEnvironment(environment);
        await useWorkingDirectory().connect();
        resetWorkingDirectory();
        setWorkingDirectoryEnvironment(environment);
        folder.permission = "prompt";

        await useWorkingDirectory().restore();
        expect(useWorkingDirectory().status.value).toBe("needs-permission");
        expect(useWorkingDirectory().folder.value).toBe("my-characters");

        await useBrowserStorage().characters.put(character("hero-1", "Not Yet"));
        expect(fileOf("hero-1")).toBeUndefined();

        expect(await useWorkingDirectory().reconnect()).toBe(true);
        expect(useWorkingDirectory().status.value).toBe("connected");
        expect(fileOf("hero-1")).toBeDefined();
    });
});
