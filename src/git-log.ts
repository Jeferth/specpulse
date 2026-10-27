export interface Commit {
  readonly hash: string;
  readonly date: string;
  readonly subject: string;
  /** Spec IDs cited in the subject or body. */
  readonly specs: readonly string[];
}

/** Format `parseGitLog` expects: fields separated by \x1f, commits by \x1e. */
export const GIT_LOG_FORMAT = "%h%x1f%cI%x1f%s%x1f%b%x1e";

export const parseGitLog = (text: string, idPattern: string): Commit[] => {
  const ids = new RegExp(idPattern, "g");
  return text
    .split("\x1e")
    .map((rec) => rec.replace(/^\s+/, ""))
    .filter((rec) => rec.includes("\x1f"))
    .map((rec) => {
      const [hash = "", date = "", subject = "", body = ""] = rec.split("\x1f");
      const specs = [...new Set(`${subject}\n${body}`.match(ids) ?? [])];
      return { hash, date, subject, specs };
    });
};

export const commitsFor = (id: string, commits: readonly Commit[]): Commit[] =>
  commits.filter((c) => c.specs.includes(id));

/** Empty `git status --porcelain` output means a clean tree. */
export const isClean = (porcelain: string): boolean => porcelain.trim() === "";
