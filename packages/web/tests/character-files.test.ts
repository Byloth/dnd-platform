/**
 * Characters as files (docs/phase-1/05-print-and-export.md, M1.5a): the export document with its packages and,
 * on request, the player's own packages inside, never a private one; reading a file with a plain reason for a
 * refusal; what an import will do with each package; an id already taken; and the round trip, export → file →
 * import → derive equal to the original byte for byte, for every public fixture character.
 */

import "fake-indexeddb/auto";

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { afterEach, describe, expect, it } from "vitest";

import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";
import { stableStringify } from "@byloth/dnd-platform-schema";

import { exportFileName, useCharacterFiles } from "@/composables/character-files";
import type { ExportDocument, ExportRefusedException } from "@/composables/character-files";
import type { PackageFile } from "@/composables/packages";

import { bundleOf, clearBrowserStorage, FIXTURES, ROOT, serveSite, zipOf } from "./helpers";

serveSite();

afterEach(async () =>
{
    useContentStore().reset();
    useEngine().clear();
    await clearBrowserStorage();
});

const CHARACTERS = resolve(ROOT, "fixtures", "characters");
const character = (name: string): Character =>
    parse(readFileSync(join(CHARACTERS, name, "character.yaml"), "utf8")) as Character;
const fileOf = (text: string, name = "character.dnd.json"): PackageFile =>
{
    const bytes = new TextEncoder().encode(text);

    return { name: name, arrayBuffer: async () => bytes.slice().buffer };
};
const storeFeline = async (): Promise<void> =>
    useContentStore().loadFiles([zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline")]);

/** The public fixture characters: the SRD (or its excerpt, which the site's SRD stands for) and the homebrew. */
const PUBLIC = new Set([
    "fixtures/packages/srd51-excerpt",
    "fixtures/packages/homebrew-feline",
    "packages/content/srd51"
]);
const publicFixtures = readdirSync(CHARACTERS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) =>
    {
        const file = parse(readFileSync(join(CHARACTERS, name, "packages.yaml"), "utf8")) as { packages: string[] };

        return file.packages.every((p) => PUBLIC.has(p));
    })
    .sort();

describe("exporting", () =>
{
    it("writes the character unchanged with its packages, nothing inside unless asked", async () =>
    {
        const cleric = character("cleric-l5");
        const document = await useCharacterFiles().exportDocument(cleric);

        expect(document.format).toBe("dnd-platform-export/1");
        expect(document.character).toEqual(cleric);
        expect(document.packages)
            .toEqual([{ id: "srd51", version: cleric.packages[0]!.version, redistributable: true }]);
        expect(document.embedded).toBeUndefined();
        expect(exportFileName("Stone: Lantern?")).toBe("Stone- Lantern-.dnd.json");
    });

    it("puts the player's own package inside when asked, and never a private one", async () =>
    {
        await storeFeline();
        const stub = readPackageSource(join(FIXTURES, "phb14-stub"));
        const locked = { ...stub, manifest: { ...stub.manifest, visibility: "private", redistributable: false } };
        await useContentStore().loadFiles([bundleOf(locked as typeof stub, "phb14.json")]);
        const monk = {
            ...character("monk-l3-feline"),
            packages: [
                ...character("monk-l3-feline").packages,
                { id: stub.manifest.id, version: stub.manifest.version }
            ]

        } as Character;
        const document = await useCharacterFiles().exportDocument(monk, { embed: true });

        expect(document.embedded?.map((s) => s.manifest.id)).toEqual(["homebrew.byloth"]);
        expect(document.packages.find((p) => p.id === stub.manifest.id)?.redistributable).toBe(false);
        expect(document.packages.find((p) => p.id === "homebrew.byloth")?.redistributable).toBe(true);
    });
});

describe("reading a file", () =>
{
    const refusal = async (text: string): Promise<ExportRefusedException> =>
        useCharacterFiles().read(fileOf(text))
            .then(() => { throw new Error("read"); }, (e: unknown) =>
                e as ExportRefusedException);

    it("refuses what is not a character file, with the reason", async () =>
    {
        expect((await refusal("not json")).reason).toBe("unreadable");
        expect((await refusal("{\"format\":\"something\"}")).reason).toBe("not-a-character");
        expect((await refusal("{\"format\":\"dnd-platform-export/2\"}")).reason).toBe("newer");
        const invalid = await refusal("{\"format\":\"dnd-platform-export/1\",\"packages\":[]}");
        expect(invalid.reason).toBe("invalid");
        expect(invalid.problems.length).toBeGreaterThan(0);
    });

    it("reads back what it wrote", async () =>
    {
        const document = await useCharacterFiles().exportDocument(character("cleric-l5"));

        expect(await useCharacterFiles().read(fileOf(stableStringify(document)))).toEqual(document);
    });
});

describe("importing", () =>
{
    const planOf = async (document: ExportDocument) => useCharacterFiles().plan(document);

    it("says what happens to each package: on the site, here, in the file, missing", async () =>
    {
        await storeFeline();
        const files = useCharacterFiles();
        const withFeline = await files.exportDocument(character("monk-l3-feline"), { embed: true });
        const plan = await planOf({
            ...withFeline,
            packages: [...withFeline.packages, { id: "phb14", version: "0.1.0", redistributable: false }]
        });

        expect(plan.packages.map((p) => [p.id, p.status])).toEqual([
            ["srd51", "site"],
            ["homebrew.byloth", "stored"],
            ["phb14", "missing"]
        ]);
        expect(plan.packages[0]!.here).not.toBe(plan.packages[0]!.version);

        await clearBrowserStorage();
        expect((await planOf(withFeline)).packages[1]!.status).toBe("embedded");
    });

    it("loads the package the file carries, then stores the character", async () =>
    {
        await storeFeline();
        const document = await useCharacterFiles().exportDocument(character("monk-l3-feline"), { embed: true });
        await clearBrowserStorage();
        useContentStore().reset();

        const imported = await useCharacterFiles().importCharacter(await planOf(document));

        expect(imported).toEqual(document.character);
        const stored = await useBrowserStorage().packages.list();
        expect(stored.map((r) => r.source.manifest.id)).toEqual(["homebrew.byloth"]);
        expect(await useBrowserStorage().characters.get(imported.id)).toEqual(document.character);
    });

    it("replaces a character with the same id, or keeps both", async () =>
    {
        const cleric = character("cleric-l5");
        await useBrowserStorage().characters.put(cleric);
        const document = await useCharacterFiles().exportDocument({ ...cleric, name: "Renamed" });
        const plan = await planOf(document);

        expect(plan.conflict).toBe(true);
        const second = await useCharacterFiles().importCharacter(plan);
        expect(second.id).not.toBe(cleric.id);
        expect(second.name).toBe("Renamed (2)");
        expect((await useBrowserStorage().characters.get(cleric.id))?.name).toBe(cleric.name);

        await useCharacterFiles().importCharacter(plan, { replace: true });
        expect((await useBrowserStorage().characters.get(cleric.id))?.name).toBe("Renamed");
    });
});

describe("the round trip", () =>
{
    it("covers the public fixture characters", () =>
    {
        expect(publicFixtures.length).toBeGreaterThan(60);
    });

    it("derives every public fixture character identically after export and import, byte for byte", async () =>
    {
        await storeFeline();
        const content = useContentStore();
        const files = useCharacterFiles();
        const derived = async (c: Character): Promise<string> =>
        {
            const sources = await content.sources(c.packages.map((p) => p.id));
            const pins = Object.fromEntries(c.packages.map((p) => [p.id, p.version]));

            return stableStringify(derive(c, useEngine().packageSet(sources, pins)));
        };

        for (const name of publicFixtures)
        {
            const original = character(name);
            const text = stableStringify(await files.exportDocument(original, { embed: true }));
            const plan = await files.plan(await files.read(fileOf(text)));
            const imported = await files.importCharacter(plan, { replace: true });
            const stored = (await useBrowserStorage().characters.get(imported.id))!;

            expect(await derived(stored), name).toBe(await derived(original));
        }

    }, 120_000);
});
