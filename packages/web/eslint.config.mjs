import path from "node:path";
import { fileURLToPath } from "node:url";

import eslintNuxt from "@byloth/eslint-config-nuxt";
import { includeIgnoreFile } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The repository's .gitignore already lists .nuxt/, .output/ and public/content/.
const gitignorePath = path.resolve(__dirname, "..", "..", ".gitignore");

export default [includeIgnoreFile(gitignorePath), ...eslintNuxt];
