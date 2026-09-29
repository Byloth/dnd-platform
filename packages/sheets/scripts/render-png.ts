/**
 * PDF → PNG through pdf.js in a headless Chromium (docs/phase-1/05-print-and-export.md): the preview loop of the
 * sheet templates. The Chromium is `CHROME_PATH`, or Playwright's when it is installed.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const PDFJS = dirname(require.resolve("pdfjs-dist/build/pdf.mjs"));

function chromePath(): string
{
    if (process.env.CHROME_PATH) { return process.env.CHROME_PATH; }

    const cache = join(homedir(), ".cache", "ms-playwright");
    const dir = existsSync(cache) ? readdirSync(cache).find((d) => d.startsWith("chromium-")) : undefined;
    if (!dir) { throw new Error("No Chromium: set CHROME_PATH."); }

    return join(cache, dir, "chrome-linux64", "chrome");
}

interface Renderer { renderPdf: (url: string, scale: number) => Promise<string[]> }

const PAGE = `<!doctype html><html><body style="margin:0;background:#888">
<script type="module">
import * as pdfjs from "/pdfjs/pdf.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.mjs";
window.renderPdf = async (url, scale) => {
    const doc = await pdfjs.getDocument({ url }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i += 1)
    {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport, annotationMode: pdfjs.AnnotationMode.ENABLE }).promise;
        out.push(canvas.toDataURL("image/png"));
    }
    return out;
};
window.ready = true;
</script></body></html>`;

/** Renders every page of every PDF to `<pdf without .pdf>-<n>.png`; returns the PNG paths. */
export async function renderPngs(pdfs: readonly string[], scale = 2): Promise<string[]>
{
    const server = createServer((request, response) =>
    {
        const url = decodeURIComponent(request.url ?? "/");
        if (url === "/")
        {
            response.setHeader("content-type", "text/html");
            response.end(PAGE);

            return;
        }
        if (url.startsWith("/pdfjs/"))
        {
            response.setHeader("content-type", "text/javascript");
            response.end(readFileSync(join(PDFJS, url.slice("/pdfjs/".length))));
            return;
        }
        if (url.startsWith("/file/"))
        {
            response.setHeader("content-type", "application/pdf");
            response.end(readFileSync(url.slice("/file".length)));
            return;
        }
        response.statusCode = 404;
        response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;

    const browser = await puppeteer.launch({ executablePath: chromePath(), args: ["--no-sandbox", "--headless=new"] });
    const written: string[] = [];
    try
    {
        const page = await browser.newPage();
        await page.goto(`http://127.0.0.1:${port}/`);
        await page.waitForFunction("window.ready === true");
        for (const pdf of pdfs)
        {
            const images = await page.evaluate(
                (url: string, s: number) => (window as unknown as Renderer).renderPdf(url, s),
                `/file${pdf}`, scale
            );
            images.forEach((data, i) =>
            {
                const file = `${pdf.replace(/\.pdf$/, "")}-${i + 1}.png`;
                writeFileSync(file, Buffer.from(data.split(",")[1] ?? "", "base64"));
                written.push(file);
            });
        }
    }
    finally
    {
        await browser.close();
        server.close();
    }

    return written;
}
