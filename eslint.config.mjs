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
          regex: "^(?!\\.|@byloth/dnd-platform-(schema|loader|engine)($|/)).*",
          message: "The composer may import only relative modules and the schema, loader and engine packages."
        }]
      }]
    }
  },
  {
    // The rules engine is pure: no I/O, no platform modules, no runtime
    // dependencies. It may import only the schema package, the loader's
    // types (the package set it computes with) and itself.
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^(?!\\.|@byloth/dnd-platform-(schema|loader)$|@byloth/dnd-platform-schema/).*",
          message: "The engine may import only relative modules, @byloth/dnd-platform-schema and the loader's types."
        }]
      }]
    }
  },
  {
    // The loader is pure and browser-safe: the schema package, a YAML parser and an unzipper.
    // Only src/node.ts, the `./node` entry, reads the disk.
    files: ["packages/loader/src/**/*.ts"],
    ignores: ["packages/loader/src/node.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^(?!\\.|@byloth/dnd-platform-schema($|/)|yaml$|fflate$).*",
          message: "The loader may import only relative modules, @byloth/dnd-platform-schema, yaml and fflate."
        }]
      }]
    }
  }
];
