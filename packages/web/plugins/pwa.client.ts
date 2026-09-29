/// <reference types="vite-plugin-pwa/client" />

import { createAppUpdate, watchForUpdates } from "@/composables/app-update";

/**
 * Registers the service worker of the published site (M1.5c) and applies a new version at the next page change,
 * without a pop-up (composables/app-update.ts). Development and browsers without service workers skip it.
 */
export default defineNuxtPlugin(() =>
{
    if (import.meta.dev || !("serviceWorker" in navigator)) { return; }

    let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
    const controlled = (timeout: number): Promise<void> => new Promise((resolve) =>
    {
        const done = (): void =>
        {
            clearTimeout(timer);
            navigator.serviceWorker.removeEventListener("controllerchange", done);
            resolve();
        };
        const timer = setTimeout(done, timeout);
        navigator.serviceWorker.addEventListener("controllerchange", done);
    });
    const appUpdate = createAppUpdate({
        activate: async () => updateSW?.(false),
        controlled: controlled,
        assign: (url) => window.location.assign(url)

    }, useRuntimeConfig().app.baseURL);

    void import("virtual:pwa-register").then(({ registerSW }) =>
    {
        updateSW = registerSW({
            immediate: true,
            onNeedRefresh: () => appUpdate.markWaiting(),
            onRegisteredSW: (_url, registration) =>
            {
                if (registration) { watchForUpdates(() => void registration.update()); }
            }
        });
    });

    useRouter().beforeEach(async (to, from) =>
        ((await appUpdate.beforeNavigate(from.path, to.path, to.fullPath)) ? undefined : false));
});
