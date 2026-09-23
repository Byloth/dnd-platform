/**
 * The package loader (docs/phase-1/02-content-and-character-stores.md): from the files of a package,
 * a zip or a bundle to a validated `PackageSource`, and from package sources to the `PackageSet` the
 * rules engine computes with. Pure and browser-safe; `@byloth/dnd-platform-loader/node` adds the reader
 * of a directory on disk.
 */

export type * from "./types.js";
export { loadPackages } from "./load/index.js";
export { validate } from "./references/validate.js";
export { comparePaths, filesOfSource, readPackageFiles, readPackageFilesAsync, toPackageSource } from "./files.js";
export type { PackageFiles, SourceFile } from "./files.js";
export { DIAGNOSTIC_CODES, checkPackage, checkPackageAsync, checkReferences } from "./check.js";
export type { CheckOptions, DiagnosticCode, PackageDiagnostic } from "./check.js";
export { bundleText, parseBundle, toBundle } from "./bundle.js";
export { readPackageZip, readPackageZipAsync } from "./zip.js";
export { compareVersions } from "./versions.js";
export type { Pause, PauseOptions } from "./steps.js";
