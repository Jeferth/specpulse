// Registry of spec formats. Each adapter is a pure function, so a new source (exported issues, a
// tracker dump) is one entry here plus its own module.
import type { SpecFormat, SpecsConfig } from "./config.ts";
import { hasFrontmatter } from "./frontmatter.ts";
import { isSpecFile, markdownAdapter, type Spec, type SpecAdapter } from "./spec.ts";
import { frontmatterAdapter } from "./spec-frontmatter.ts";

/** Formats read one file at a time; "folder" reads whole folders (see spec-folder.ts). */
export const SPEC_ADAPTERS: Readonly<Record<Exclude<SpecFormat, "auto" | "folder">, SpecAdapter>> = {
  markdown: markdownAdapter,
  frontmatter: frontmatterAdapter,
};

/**
 * "auto" decides per file: a closed `---` block on top means frontmatter, anything else markdown.
 * A single file of a folder spec is read the same way.
 */
export const adapterFor = (format: SpecFormat, md: string): SpecAdapter =>
  format === "auto" || format === "folder"
    ? SPEC_ADAPTERS[hasFrontmatter(md) ? "frontmatter" : "markdown"]
    : SPEC_ADAPTERS[format];

/** Reads one spec file with the configured format. */
export const readSpec = (md: string, file: string, specs: SpecsConfig): Spec | undefined =>
  adapterFor(specs.format, md)(md, file, specs);

/**
 * Which files in the specs folder to try. Plain markdown keeps the historical rule (the name starts
 * with the ID), as does `idFrom: "filename"`; otherwise the ID lives inside the file, so every `.md`
 * but README is a candidate and the adapter drops files without an ID.
 */
export const isSpecCandidate = (file: string, specs: SpecsConfig): boolean => {
  const prefixed = specs.idFrom === "filename" || (specs.format === "markdown" && specs.idFrom === undefined);
  if (prefixed) return isSpecFile(file, specs.idPattern);
  return file.toLowerCase().endsWith(".md") && file.toLowerCase() !== "readme.md";
};
