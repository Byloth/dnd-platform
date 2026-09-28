import { ValueException } from "@byloth/core";
import { bundleText } from "@byloth/dnd-platform-loader";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";
import { stableStringify } from "@byloth/dnd-platform-schema";

import type { PackageFile } from "./packages";

/**
 * A character as a file (docs/phase-1/05-print-and-export.md, M1.5): the document unchanged, the packages it uses
 * by id and version, and, when the player asks, the bundles of their own packages the site does not publish. A
 * private package is never written into the file. Importing reads the file, says what each package will be (on
 * the site, already here, in the file, missing), loads the embedded ones through the usual checks and stores the
 * character.
 */

export const EXPORT_FORMAT = "dnd-platform-export/1";

export interface ExportedPackage
{
    readonly id: string;
    readonly version: string;
    readonly redistributable: boolean;
}
export interface ExportDocument
{
    readonly format: typeof EXPORT_FORMAT;
    readonly exportedAt: string;
    readonly application: { readonly version: string };
    readonly character: Character;
    readonly packages: readonly ExportedPackage[];
    readonly embedded?: readonly PackageSource[];
}

/** Why a file is not a character this application can import, in a word the page turns into a sentence. */
export type ExportRefusal = "unreadable" | "not-a-character" | "newer" | "invalid";

export class ExportRefusedException extends ValueException
{
    public constructor(
        public readonly fileName: string,
        public readonly reason: ExportRefusal,
        public readonly problems: readonly string[] = []
    )
    {
        super(`${fileName}: ${reason}.`, undefined, "ExportRefusedException");
    }
}

/** What importing does with each package the character uses. */
export type ImportStatus = "site" | "stored" | "embedded" | "missing";
export interface ImportPackage
{
    readonly id: string;
    /** The version the file records. */
    readonly version: string;
    /** The version this device has, when it has one. */
    readonly here?: string;
    readonly status: ImportStatus;
}
export interface ImportPlan
{
    readonly document: ExportDocument;
    readonly packages: readonly ImportPackage[];
    /** A stored character already has this id. */
    readonly conflict: boolean;
}

// ---- the validator, loaded with the first file ------------------------------------------------------

let _validate: Promise<(value: unknown) => readonly string[]> | undefined;
function _validator(): Promise<(value: unknown) => readonly string[]>
{
    _validate ??= import("@byloth/dnd-platform-schema/validate").then(({ createAjv, validatorFor }) =>
    {
        const check = validatorFor(createAjv(), "export");

        return (value: unknown): readonly string[] =>
            (check(value) ? [] : (check.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? ""}`.trim()));
    });

    return _validate;
}

// ---- helpers -----------------------------------------------------------------------------------------

/** A file name from a character's name: readable, without the characters a file system refuses. */
export function exportFileName(name: string): string
{
    // eslint-disable-next-line no-control-regex
    const safe = name.replace(/[\u0000-\u001f\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ")
        .trim();

    return `${safe || "character"}.dnd.json`;
}

export function useCharacterFiles()
{
    const content = useContentStore();
    const storage = useBrowserStorage();

    const _published = async (): Promise<ReadonlySet<string>> =>
        new Set(Object.keys((content.index ?? await useContent().fetchIndex()).packages));

    /** The stored bundles of the character's own packages the site does not publish, never a private one. */
    const embeddable = async (character: Character): Promise<PackageSource[]> =>
    {
        const published = await _published();
        const uses = new Set(character.packages.map((p) => p.id));

        return (await storage.packages.list())
            .map((r) => r.source)
            .filter((s) => uses.has(s.manifest.id) && !published.has(s.manifest.id) &&
                (s.manifest.redistributable !== false));
    };

    /** The export document of a character; with `embed`, its own packages go inside. */
    const exportDocument = async (character: Character, options: { embed?: boolean } = {}): Promise<ExportDocument> =>
    {
        const published = await _published();
        const stored = new Map((await storage.packages.list()).map((r) => [r.source.manifest.id, r.source.manifest]));
        // Unknown here means not published and not stored: flagged private, the safe side.
        const packages = character.packages.map((p): ExportedPackage => ({
            id: p.id,
            version: p.version,
            redistributable: published.has(p.id) ||
                (stored.has(p.id) && (stored.get(p.id)!.redistributable !== false))
        }));
        const embedded = options.embed ? await embeddable(character) : [];

        return {
            format: EXPORT_FORMAT,
            exportedAt: new Date().toISOString(),
            application: { version: String(useRuntimeConfig().public["appVersion"] ?? "dev") },
            character: character,
            packages: packages,
            ...(embedded.length ? { embedded: embedded } : {})
        };
    };

    /** Downloads the document as `<name>.dnd.json`. */
    const download = (document: ExportDocument): void =>
    {
        const blob = new Blob([stableStringify(document)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = exportFileName(document.character.name);
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    /** Reads a file as an export document, or refuses it with the reason. */
    const read = async (file: PackageFile): Promise<ExportDocument> =>
    {
        let value: unknown;
        try { value = JSON.parse(new TextDecoder().decode(await file.arrayBuffer())); }
        catch { throw new ExportRefusedException(file.name, "unreadable"); }

        const format = (value as { format?: unknown } | null)?.format;
        if ((typeof format !== "string") || !format.startsWith("dnd-platform-export/"))
        {
            throw new ExportRefusedException(file.name, "not-a-character");
        }
        if (format !== EXPORT_FORMAT) { throw new ExportRefusedException(file.name, "newer"); }

        const problems = (await _validator())(value);
        if (problems.length) { throw new ExportRefusedException(file.name, "invalid", problems); }

        return value as ExportDocument;
    };

    /** What importing the document will do: each package's status, and whether the id is taken. */
    const plan = async (document: ExportDocument): Promise<ImportPlan> =>
    {
        const index = content.index ?? await useContent().fetchIndex();
        const stored = new Map((await storage.packages.list()).map((r) => [r.source.manifest.id, r.source.manifest]));
        const inFile = new Set((document.embedded ?? []).map((s) => s.manifest.id));

        const packages = document.packages.map((p): ImportPackage =>
        {
            const site = index.packages[p.id];
            if (site) { return { id: p.id, version: p.version, here: site.latest, status: "site" }; }
            const local = stored.get(p.id);
            if (local) { return { id: p.id, version: p.version, here: local.version, status: "stored" }; }

            return { id: p.id, version: p.version, status: inFile.has(p.id) ? "embedded" : "missing" };
        });

        return {
            document: document,
            packages: packages,
            conflict: (await storage.characters.get(document.character.id)) !== undefined
        };
    };

    /**
     * Imports a planned document: the embedded packages first, through the checks of any loaded file (a refusal
     * stops the import), then the character. With a conflict, `replace` overwrites the stored one; otherwise the
     * import becomes a second character with its own id.
     */
    const importCharacter = async (planned: ImportPlan, options: { replace?: boolean } = {}): Promise<Character> =>
    {
        const { load } = usePackageLoader();
        for (const p of planned.packages.filter((x) => x.status === "embedded"))
        {
            const bundle = planned.document.embedded!.find((s) => s.manifest.id === p.id)!;
            const bytes = new TextEncoder().encode(bundleText(bundle));
            await load({ name: `${p.id}.json`, arrayBuffer: async () => bytes.slice().buffer });
        }

        const original = planned.document.character;
        const character: Character = (planned.conflict && !options.replace) ?
            { ...original, id: `character-${crypto.randomUUID()}`, name: `${original.name} (2)` } :
            original;
        await storage.characters.put(character);
        await content.refresh();

        return character;
    };

    return { embeddable, exportDocument, download, read, plan, importCharacter };
}
