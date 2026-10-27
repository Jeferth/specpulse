export interface Phase {
  readonly n: number;
  readonly name: string;
  readonly test: string;
  readonly focus: string;
}

export interface Milestone {
  readonly id: string;
  readonly name: string;
  readonly delivery: string;
}

const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

const unbold = (s: string): string => s.replace(/\*\*/g, "").trim();

/**
 * Phase rows of the roadmap overview table: `| [N](any/link.md) | Name | How to test | Focus |`.
 * A numeric link in the first cell is what marks a row as a phase, so other tables are ignored.
 */
export const parseRoadmap = (md: string): Phase[] => {
  const out: Phase[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^\|\s*\[(\d+)\]\([^)]*\)\s*\|/.exec(line);
    if (!m) continue;
    const [, name = "", test = "", focus = ""] = cells(line);
    out.push({ n: Number(m[1]), name: unbold(name), test, focus });
  }
  return out;
};

/** Milestone rows of a phase file: `| **N.M Name** | Delivery | …`. */
export const parseMilestones = (md: string): Milestone[] => {
  const out: Milestone[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^\|\s*\*\*(\d+\.\d+)\s+([^*]+)\*\*\s*\|/.exec(line);
    if (!m?.[1] || !m[2]) continue;
    out.push({ id: m[1], name: m[2].trim(), delivery: cells(line)[1] ?? "" });
  }
  return out;
};
