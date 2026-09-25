// https://nuxt.com/docs/api/configuration/nuxt-config
//
// A static, client-rendered application (docs/phase-1/01-web-application.md): no server rendering, no server
// routes, published on GitHub Pages by `nuxt generate`. The site path comes from NUXT_APP_BASE_URL at generate time.
const baseURL = process.env["NUXT_APP_BASE_URL"] ?? "/dnd-platform/";

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
        { rel: "apple-touch-icon", href: `${baseURL}apple-touch-icon.png` }
      ]
    },
    pageTransition: { name: "page", mode: "out-in" }
  },
  compatibilityDate: "2026-09-22",
  runtimeConfig: {
    public: {
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
    "@vueuse/nuxt"
  ],
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
