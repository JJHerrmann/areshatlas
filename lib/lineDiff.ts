/**
 * Minimal line diff for the page-history view.
 *
 * Notes run to a few hundred lines, so a plain LCS table is well inside
 * budget and avoids pulling a diff library into the bundle.
 */

export type DiffRowType = "context" | "added" | "removed";

export type DiffRow = {
  type: DiffRowType;
  text: string;
  /** 1-based line number in the older revision, null for added lines. */
  before: number | null;
  /** 1-based line number in the newer revision, null for removed lines. */
  after: number | null;
};

export type DiffHunk = {
  beforeStart: number;
  afterStart: number;
  rows: DiffRow[];
};

export type DiffResult = {
  hunks: DiffHunk[];
  added: number;
  removed: number;
  unchanged: boolean;
};

const splitLines = (text: string) => text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");

function longestCommonSubsequence(a: string[], b: string[]) {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

/** Row-by-row diff of two revisions, oldest first. */
export function diffLines(before: string, after: string): DiffRow[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const table = longestCommonSubsequence(a, b);
  const rows: DiffRow[] = [];

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ type: "context", text: a[i], before: i + 1, after: j + 1 });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ type: "removed", text: a[i], before: i + 1, after: null });
      i += 1;
    } else {
      rows.push({ type: "added", text: b[j], before: null, after: j + 1 });
      j += 1;
    }
  }
  while (i < a.length) {
    rows.push({ type: "removed", text: a[i], before: i + 1, after: null });
    i += 1;
  }
  while (j < b.length) {
    rows.push({ type: "added", text: b[j], before: null, after: j + 1 });
    j += 1;
  }
  return rows;
}

/**
 * Group the diff into hunks with `context` lines of unchanged text either
 * side, so an edit to one paragraph does not render the whole article.
 */
export function diffHunks(before: string, after: string, context = 3): DiffResult {
  const rows = diffLines(before, after);
  const added = rows.filter((r) => r.type === "added").length;
  const removed = rows.filter((r) => r.type === "removed").length;
  if (added === 0 && removed === 0) return { hunks: [], added, removed, unchanged: true };

  const keep = new Array(rows.length).fill(false);
  rows.forEach((row, index) => {
    if (row.type === "context") return;
    for (let k = Math.max(0, index - context); k <= Math.min(rows.length - 1, index + context); k += 1) {
      keep[k] = true;
    }
  });

  const hunks: DiffHunk[] = [];
  let current: DiffRow[] = [];
  const flush = () => {
    if (!current.length) return;
    const first = current[0];
    hunks.push({
      beforeStart: first.before ?? 0,
      afterStart: first.after ?? 0,
      rows: current,
    });
    current = [];
  };
  rows.forEach((row, index) => {
    if (keep[index]) current.push(row);
    else flush();
  });
  flush();

  return { hunks, added, removed, unchanged: false };
}

/** Counts only — used for the "+12 −4" column in the revision list. */
export function diffStats(before: string, after: string) {
  const rows = diffLines(before, after);
  return {
    added: rows.filter((r) => r.type === "added").length,
    removed: rows.filter((r) => r.type === "removed").length,
  };
}
