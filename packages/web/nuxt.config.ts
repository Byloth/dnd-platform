import { execSync } from "node:child_process";

// https://nuxt.com/docs/api/configuration/nuxt-config
//
// A static, client-rendered application (docs/phase-1/01-web-application.md): no server rendering, no server
// routes, published on GitHub Pages by `nuxt generate`. The site path comes from NUXT_APP_BASE_URL at generate time.
const baseURL = process.env["NUXT_APP_BASE_URL"] ?? "/dnd-platform/";

// The application's version as a character file records it (docs/phase-1/05-print-and-export.md): the latest tag
// and how far past it, from git at build time; `dev` outside a repository.
function appVersion(): string
{
  try
  {
    return execSync("git describe --tags --always", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  }
  catch
  {
    return "dev";
  }
}

export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: baseURL,
    // The name until the application sets the page's own title (app.vue); the favicon is the navigation bar's
    // d20 in the accent colour (the dark theme's accent under a dark system scheme), with PNG fallbacks.
    head: {
      title: "D&D Platform",
      link: [
        { rel: "icon", type: "image/svg+xml", href: `${baseURL}favicon.svg` },
        { rel: "icon", sizes: "48x48", href: `${baseURL}favicon.ico` },
        { rel: "apple-touch-icon", href: `${baseURL}apple-touch-icon.png` },
        // The installed application (M1.5c): the manifest the PWA module writes.
        { rel: "manifest", href: `${baseURL}manifest.webmanifest` }
      ],
      // The browser's bar in each look's own colour: the accent on parchment, the slate of the dark look.
      meta: [
        { name: "theme-color", content: "#8E2A1C", media: "(prefers-color-scheme: light)" },
        { name: "theme-color", content: "#13161C", media: "(prefers-color-scheme: dark)" }
      ]
    },
    pageTransition: { name: "page", mode: "out-in" }
  },
  compatibilityDate: "2026-09-22",
  runtimeConfig: {
    public: {
      appVersion: appVersion(),
      // Usage statistics (DEC-22): loaded only after the visitor's consent, reported only from the published
      // domain. An empty website id turns them off.
      analytics: {
        scriptUrl: "https://cloud.umami.is/script.js",
        websiteId: "46e2a043-e364-4c30-8561-45e4e4797398",
        domains: "byloth.github.io"
      }
    }
  },
  // A small normalize and the two bundled type families
  // (no font from a third party, docs/phase-1/01-web-application.md).
  css: [
    "modern-normalize/modern-normalize.css",
    "@fontsource/cinzel/600.css",
    "@fontsource/cinzel/700.css",
    "@fontsource/atkinson-hyperlegible/400.css",
    "@fontsource/atkinson-hyperlegible/400-italic.css",
    "@fontsource/atkinson-hyperlegible/700.css"
  ],
  components: [
    { path: "@/components" },
    {
      global: true,
      path: "@/components/globals",
      pathPrefix: false
    }
  ],
  devtools: { enabled: true },
  i18n: {
    defaultLocale: "en",
    strategy: "no_prefix",
    detectBrowserLanguage: false,
    locales: [
      { code: "en", language: "en-US", name: "English", file: "en.json" },
      { code: "it", language: "it-IT", name: "Italiano", file: "it.json" }
    ]
  },
  modules: [
    "@byloth/nuxt-vuert-module",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@vite-pwa/nuxt"
  ],
  // The site as a PWA (M1.5c, DEC-06 in part): the application shell precached, the public content cached as it
  // is fetched, installable. A new version waits and takes over at the next page change (plugins/pwa.client.ts),
  // never with a pop-up; development runs no worker.
  pwa: {
    strategies: "generateSW",
    registerType: "prompt",
    injectRegister: false,
    client: { registerPlugin: false },
    scope: baseURL,
    base: baseURL,
    // The Web App Manifest's own names are snake_case.
    /* eslint-disable camelcase */
    manifest: {
      name: "D&D Platform",
      short_name: "D&D Platform",
      description: "Create a D&D 5e character step by step, with a sheet that explains every number.",
      start_url: baseURL,
      scope: baseURL,
      display: "standalone",
      theme_color: "#8E2A1C",
      background_color: "#F7F1E4",
      // From pwa-assets.config.ts (npx pwa-assets-generator).
      icons: [
        { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    },
    /* eslint-enable camelcase */
    workbox: {
      // The shell only: the content is cached as it is fetched, below. The module adds the manifest and the
      // generated pages itself, under their route (`roadmap`, not `roadmap/index.html`).
      globPatterns: ["**/*.{js,css,html,svg,ico,png,woff2}"],
      globIgnores: ["content/**"],
      // Client-rendered: every page is the same shell, precached under the base itself.
      navigateFallback: baseURL,
      navigateFallbackDenylist: [/\/content\//],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // A release never changes (DEC-21): once fetched, it is kept.
          urlPattern: /\/content\/[^/]+@[^/]+\.json$/,
          handler: "CacheFirst",
          options: { cacheName: "content-releases", expiration: { maxEntries: 40 } }
        },
        {
          // The newest versions when online, the last known ones offline.
          urlPattern: /\/content\/index\.json$/,
          handler: "NetworkFirst",
          options: { cacheName: "content-index", networkTimeoutSeconds: 3 }
        },
        {
          urlPattern: /\/content\/(?:characters\/[^/]+\.json|[^/]+\.changelog\.md)$/,
          handler: "StaleWhileRevalidate",
          options: { cacheName: "content-pages" }
        }
      ]
    },
    devOptions: { enabled: false }
  },
  nitro: { preset: "github-pages" },
  vite: {
    // Font Awesome's stylesheets still use Sass features that Dart Sass deprecates; not our warnings to fix.
    css: { preprocessorOptions: { scss: { quietDeps: true } } },
    // The vuert module's plugin imports @byloth/vuert from its own file, which Vite does not pre-bundle, while
    // the application's imports would get the pre-bundled copy: two instances, two injection keys, and
    // useVuert() finds nothing (dev only; the generated site has one bundle). Serve the one file to both.
    optimizeDeps: { exclude: ["@byloth/vuert"] }
  },
  typescript: {
    typeCheck: true,
    tsConfig: {
      compilerOptions: { noUncheckedIndexedAccess: false }
    },
    nodeTsConfig: {
      compilerOptions: { lib: ["ESNext", "DOM", "DOM.Iterable", "WebWorker"] }
    }
  }
});
