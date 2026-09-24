/**
 * Serve the generated site (`.output/public`) under its base path, as GitHub Pages does: a file when it exists,
 * a directory's `index.html`, and `200.html` for any other route of the application; gzip-compressed for a client
 * that accepts it, fonts excepted (woff2 is compressed already). For Lighthouse
 * (lighthouserc.json), not for development.
 *
 *   node scripts/serve-site.ts [port]
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const PUBLIC = resolve(import.meta.dirname, "..", ".output", "public");
const BASE = process.env["NUXT_APP_BASE_URL"] ?? "/dnd-platform/";
const PORT = Number(process.argv[2] ?? 4173);

const TYPES: Readonly<Record<string, string>> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2"
};

function file(pathname: string): string
{
    const relative = normalize(decodeURIComponent(pathname.slice(BASE.length))).replace(/^(\.\.[/\\])+/, "");
    const path = join(PUBLIC, relative);
    if (existsSync(path) && statSync(path).isFile()) { return path; }
    if (existsSync(join(path, "index.html"))) { return join(path, "index.html"); }

    return join(PUBLIC, "200.html");
}

createServer((request, response) =>
{
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    if (!pathname.startsWith(BASE))
    {
        response.writeHead(302, { location: BASE }).end();

        return;
    }

    const path = file(pathname);
    const type = TYPES[extname(path)] ?? "application/octet-stream";
    const gzip = type !== "font/woff2" && /\bgzip\b/.test(request.headers["accept-encoding"] ?? "");
    const body = gzip ? gzipSync(readFileSync(path)) : readFileSync(path);

    response.writeHead(200, { "content-type": type, ...(gzip ? { "content-encoding": "gzip" } : {}) });
    response.end(body);
}).listen(PORT, () =>
{
    // eslint-disable-next-line no-console -- Lighthouse waits for this line.
    console.log(`Serving the site on http://localhost:${PORT}${BASE}`);
});
