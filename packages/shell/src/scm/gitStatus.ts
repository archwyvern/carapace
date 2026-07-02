/** One entry of `git status --porcelain=v1 -z`: the two status columns (X = index, Y = worktree)
 *  and the repo-relative path (plus the old path for renames/copies). */
export interface GitFileStatus {
  x: string;
  y: string;
  path: string;
  renamedFrom?: string;
}

/**
 * Parse `git status --porcelain=v1 -z` output (clean-room from the git documentation). Entries are
 * NUL-terminated `XY <path>`; rename/copy entries (X of R/C) carry a second NUL-terminated field:
 * the ORIGINAL path. The -z form never quotes paths, so this is byte-exact for any filename.
 */
export function parseGitPorcelainZ(out: string): GitFileStatus[] {
  const fields = out.split("\0").filter((f) => f.length > 0);
  const entries: GitFileStatus[] = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]!;
    if (f.length < 4 || f[2] !== " ") continue; // malformed field (defensive; -z is well-formed)
    const x = f[0]!;
    const y = f[1]!;
    const path = f.slice(3);
    const renamed = x === "R" || x === "C" ? fields[++i] : undefined;
    entries.push({ x, y, path, ...(renamed !== undefined ? { renamedFrom: renamed } : {}) });
  }
  return entries;
}

/** A row decoration for an SCM-tracked file: a text colour + a single-letter badge. */
export interface ScmDecoration {
  /** CSS colour (theme-token var) to tint the row's name. */
  color: string;
  /** Single status letter (M/A/D/R/C/U/!). */
  badge: string;
}

/** Map a porcelain XY status to the conventional SCM row decoration (VS Code-style colours,
 *  expressed as carapace theme tokens). Returns undefined for clean/uninteresting states. */
export function scmDecoration(x: string, y: string): ScmDecoration | undefined {
  if (x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D")) {
    return { color: "var(--color-error)", badge: "C" }; // conflict
  }
  if (x === "?" || y === "?") return { color: "var(--color-success)", badge: "U" }; // untracked
  if (x === "!" || y === "!") return { color: "var(--color-fg-mid)", badge: "!" }; // ignored
  if (x === "A") return { color: "var(--color-success)", badge: "A" };
  if (x === "R" || x === "C") return { color: "var(--color-link)", badge: x };
  if (x === "D" || y === "D") return { color: "var(--color-error)", badge: "D" };
  if (x === "M" || y === "M" || x === "T" || y === "T") return { color: "var(--color-warning)", badge: "M" };
  return undefined;
}
