import { defineConfig } from "@vite-pwa/assets-generator/config";

// The installed application's icons (M1.5c), from the navigation bar's d20: transparent ones for the browsers, a
// maskable one on the parchment of the light look for Android's shapes. Generated once and committed:
//
//   npx pwa-assets-generator
//
// The favicon and the Apple touch icon already in public/ are left as they are.
export default defineConfig({
  images: ["public/favicon.svg"],
  preset: {
    transparent: { sizes: [192, 512], favicons: [] },
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background: "#F7F1E4" } },
    apple: { sizes: [] }
  }
});
