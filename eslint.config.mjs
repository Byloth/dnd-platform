import path from "node:path";
import { fileURLToPath } from "node:url";

import eslintTs from "@byloth/eslint-config-typescript";
import { includeIgnoreFile } from "@eslint/compat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default [
  includeIgnoreFile(gitignorePath),
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
