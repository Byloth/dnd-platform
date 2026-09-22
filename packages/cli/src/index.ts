#!/usr/bin/env node

/**
 * `dnd` — command-line tools of the platform.
 *
 * Commands (docs/phase-0/00-README.md, M0.8):
 *   validate [dirs…] [--all] [--references] [--allow-missing] [--json]
 *   build                                          YAML → canonical JSON bundles
 *   derive <character.yaml> [--json|--text]
 *   fixtures [dirs…] [--update] [--filter <name>] [--coverage]   golden characters and play sessions
 */

import { FORMAT_VERSION } from "@byloth/dnd-platform-schema";

import { runBuild } from "./commands/build.js";
import { runFixturesCommand } from "./commands/fixtures.js";
import { runValidate } from "./commands/validate.js";

const HELP = `dnd — dnd-platform command-line tools (content format v${FORMAT_VERSION})

Usage: dnd <command> [options]

Commands:
  validate [dirs…] [--all] [--references] [--allow-missing] [--json]
             validate content package directories against the schemas;
             no directory or --all: discover packages/content/* and content-private/*;
             --references: also load them into the engine and resolve every reference
  build      convert YAML packages to canonical JSON      (M0.8)
  derive     compute a character sheet                    (M0.8)
  fixtures [dirs…] [--update] [--filter <name>] [--json]
             run the golden character fixtures (fixtures/characters) and the
             play session fixtures (fixtures/sessions), plus the private ones when present
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
    if (command === "build") { return runBuild(rest); }
    if (command === "fixtures") { return runFixturesCommand(rest); }

    process.stderr.write(`dnd: unknown or not yet implemented command "${command}"\n\n${HELP}`);

    return 2;
}

if (import.meta.url === `file://${process.argv[1]}`)
{
    process.exitCode = main(process.argv.slice(2));
}
