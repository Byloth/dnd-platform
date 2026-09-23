import path from "node:path";
import { fileURLToPath } from "node:url";

import eslintTs from "@byloth/eslint-config-typescript";
import { includeIgnoreFile } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default [
  includeIgnoreFile(gitignorePath),
  // The web application lints itself with the Nuxt configuration (packages/web/eslint.config.mjs).
  { ignores: ["packages/web/**"] },
  ...eslintTs,
  {
    // Command-line scripts report through the console by design.
    files: ["tools/**/*.ts", "packages/*/scripts/**/*.ts", "packages/cli/src/**/*.ts"],
    rules: {
      "no-console": "off",
      // Generators of Markdown and YAML are made of long template strings.
      "@stylistic/max-len": ["error", {
        code: 120, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreUrls: true
      }]
    }
  },
  {
    // The composer is pure as well: it may import only the schema and engine packages and itself.
    files: ["packages/composer/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^(?!\\.|@byloth/dnd-platform-(schema|engine)($|/)).*",
          message: "The composer may import only relative modules and the schema and engine packages."
        }]
      }]
    }
  },
  {
    // The rules engine is pure: no I/O, no platform modules, no runtime
    // dependencies. It may import only the schema package and itself.
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^(?!\\.|@byloth/dnd-platform-schema($|/)).*",
          message: "The engine may import only relative modules and @byloth/dnd-platform-schema."
        }]
      }]
    }
  }
];
