import { defineConfig } from "vitest/config";

// Two projects: the Node one for the library packages and the CLI, the Nuxt one for the web application
// (packages/web/vitest.config.ts). `pnpm test` runs both.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: [
            "packages/*/src/**/*.test.ts",
            "packages/*/test/**/*.test.ts",
            "tests/**/*.test.ts"
          ],
          exclude: ["packages/web/**"],
          passWithNoTests: false
        }
      },
      "packages/web/vitest.config.ts"
    ]
  }
});
