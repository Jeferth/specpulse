export interface Spec {
  readonly id: string;
  readonly title: string;
  readonly file: string;
  readonly done: number;
  readonly total: number;
}

const checkbox = /^\s*[-*] \[([ xX])\]/;

/** True when `file` (a bare file name) looks like a spec: starts with an ID and ends in `.md`. */
export const isSpecFile = (file: string, idPattern: string): boolean =>
  new RegExp(`^(?:${idPattern})`).test(file) && file.endsWith(".md");

/**
 * Reads a spec whose first matching heading is `# <ID> · Title` (also `:` or `-` as separator).
 * Every markdown checkbox in the file counts as an acceptance criterion.
 */
export const parseSpec = (md: string, file: string, idPattern: string): Spec | undefined => {
  const heading = new RegExp(String.raw`^#\s+(${idPattern})\s*[·:—-]\s*(.+)$`);
  const lines = md.split(/\r?\n/);
  const head = lines.map((l) => heading.exec(l)).find((m) => m);
  if (!head?.[1] || !head[2]) return undefined;
  const boxes = lines.map((l) => checkbox.exec(l)?.[1]).filter((b) => b !== undefined);
  const done = boxes.filter((b) => b.toLowerCase() === "x").length;
  return { id: head[1], title: head[2].trim(), file, done, total: boxes.length };
};
