/**
 * A file the site made, handed to the player: downloaded, or, on a phone that can share files, offered through
 * the system's share sheet (save to Files, send it, open it in another app). Not every phone browser can save a
 * page as a PDF by itself; every one can take a file this way.
 */

export interface SaveOptions
{
    /** Offer the share sheet on a touch device that can share this file (default: download only). */
    readonly share?: boolean;
    /** The title the share sheet shows. */
    readonly title?: string;
}

/** Saves `blob` as `name`. Resolves when the file is handed over (or the player closes the share sheet). */
export async function saveFile(blob: Blob, name: string, options: SaveOptions = {}): Promise<void>
{
    if (options.share && window.matchMedia?.("(pointer: coarse)").matches)
    {
        const file = new File([blob], name, { type: blob.type });
        if (navigator.canShare?.({ files: [file] }))
        {
            try
            {
                await navigator.share({ files: [file], ...(options.title ? { title: options.title } : {}) });

                return;
            }
            catch (error)
            {
                // Closing the sheet is the player's choice; anything else falls back to the download.
                if ((error as { name?: string } | null)?.name === "AbortError") { return; }
            }
        }
    }

    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A file name from a character's name: characters a file system refuses become dashes. */
export function safeFileName(name: string, extension: string, fallback = "character"): string
{
    // eslint-disable-next-line no-control-regex
    const safe = name.replace(/[\u0000-\u001f\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ")
        .trim();

    return `${safe || fallback}.${extension}`;
}
