#!/usr/bin/env node

/**
 * `dnd` — command-line tools of the platform.
 *
 * Commands (docs/phase-0/00-README.md, M0.8):
 *   validate [dirs…] [--allow-missing]   validate content package directories
 *   build                                 YAML → canonical JSON bundles
 *   derive <character.yaml> [--json|--text]
 *   fixtures [dirs…] [--update] [--filter <name>] [--coverage]
 *
 * M0.1 ships only `--help`; each command lands with its milestone.
 */

import { FORMAT_VERSION } from "@byloth/dnd-platform-schema";

const HELP = `dnd — dnd-platform command-line tools (content format v${FORMAT_VERSION})

Usage: dnd <command> [options]

Commands:
  validate   validate content package directories        (M0.2)
  build      convert YAML packages to canonical JSON      (M0.8)
  derive     compute a character sheet                    (M0.8)
  fixtures   run golden and session fixtures              (M0.3)

Run "dnd <command> --help" for details once the command exists.
`;

export function main(argv: readonly string[]): number
{
    const [command] = argv;

    if ((command === undefined) || (command === "--help") || (command === "-h") || (command === "help"))
    {
        process.stdout.write(HELP);

        return 0;
    }

    process.stderr.write(`dnd: unknown or not yet implemented command "${command}"\n\n${HELP}`);

    return 2;
}

if (import.meta.url === `file://${process.argv[1]}`)
{
    process.exitCode = main(process.argv.slice(2));
}
