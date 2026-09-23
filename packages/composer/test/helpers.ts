/** Fixture packages read from disk by the loader, as the CLI reads them (the composer itself does no I/O). */

import type { PackageSource } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

export const readPackage = (dir: string): PackageSource => readPackageSource(dir);
