/**
 * The working folder of the last visit (docs/phase-1/02-content-and-character-stores.md, M1.8): connected again at
 * start when the browser still grants it, and read against the browser's store; otherwise the packages page and
 * the characters page offer to connect it again, which needs a click. Where the browser has no folders nothing
 * loads; elsewhere the code comes after the page is shown.
 */
export default defineNuxtPlugin((nuxtApp) =>
{
    const supported = typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
    if (!supported) { return; }

    nuxtApp.hook("app:mounted", () =>
    {
        void import("@/composables/working-directory")
            .then(({ useWorkingDirectory }) => useWorkingDirectory().restore())
            .catch(() => { /* The pages offer to connect it again. */ });
    });
});
