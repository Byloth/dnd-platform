#!/usr/bin/env node

/**
 * `dnd` — command-line tools of the platform.
 *
 * Commands (docs/phase-0/00-README.md, M0.8):
 *   validate <dirs…> [--allow-missing] [--json]   validate content package directories
 *   build                                          YAML → canonical JSON bundles
 *   derive <character.yaml> [--json|--text]
 *   fixtures [dirs…] [--update] [--filter <name>] [--coverage]
 */

import { FORMAT_VERSION } from "@byloth/dnd-platform-schema";

import { runFixturesCommand } from "./commands/fixtures.js";
import { runValidate } from "./commands/validate.js";

const HELP = `dnd — dnd-platform command-line tools (content format v${FORMAT_VERSION})

Usage: dnd <command> [options]

Commands:
  validate <dirs…> [--allow-missing] [--json]
             validate content package directories against the schemas
  build      convert YAML packages to canonical JSON      (M0.8)
  derive     compute a character sheet                    (M0.8)
  fixtures [dirs…] [--update] [--filter <name>] [--json]
             run the golden character fixtures (default fixtures/characters)
`;

export function main(argv: readonly string[]): number
{
    const [command, ...rest] = argv;

    if ((command === undefined) || (command === "--help") || (command === "-h") || (command === "help"))
    {
        process.stdout.write(HELP);

        return 0;
    }
    if (command === "validate") { return runValidate(rest); }
    if (command === "fixtures") { return runFixturesCommand(rest); }

    process.stderr.write(`dnd: unknown or not yet implemented command "${command}"\n\n${HELP}`);

    return 2;
}

if (import.meta.url === `file://${process.argv[1]}`)
{
    process.exitCode = main(process.argv.slice(2));
}
