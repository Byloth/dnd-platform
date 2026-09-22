import { fileURLToPath } from "node:url";

import { defineVitestConfig } from "@nuxt/test-utils/config";

// The Nuxt environment for components and composables. rootDir is explicit because the root
// `pnpm test` runs this project from the repository root (docs/phase-1/07-testing-accessibility-performance.md).
export default defineVitestConfig({
  test: {
    name: "web",
    environment: "nuxt",
    include: ["tests/**/*.test.ts"],
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL("./", import.meta.url)),
        domEnvironment: "happy-dom"
      }
    }
  }
});
