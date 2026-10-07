import { workingDirectoryRemembered } from "@/composables/storage";

/**
 * The working folder of the last visit (docs/phase-1/02-content-and-character-stores.md, M1.8): connected again at
 * start when the browser still grants it, and read against the browser's store; otherwise the packages page and
 * the characters page offer to connect it again, which needs a click. The code loads after the page is shown,
 * and only when a folder was connected before: most players never do, and the loader and YAML it brings cost the
 * first load half a second on a slow phone (the Lighthouse regression of 2026-10-06).
 */
export default defineNuxtPlugin((nuxtApp) =>
{
    nuxtApp.hook("app:mounted", async () =>
    {
        if (!(await workingDirectoryRemembered())) { return; }

        void import("@/composables/working-directory")
            .then(({ useWorkingDirectory }) => useWorkingDirectory().restore())
            .catch(() => { /* The pages offer to connect it again. */ });
    });
});
