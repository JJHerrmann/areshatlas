/**
 * Reader for the page-history store written by scripts/build_history.mjs.
 *
 * The store is committed under content/_history/ rather than computed from
 * git at render time: Vercel builds from a shallow clone, where `git log`
 * sees almost nothing.
 */

import fs from "node:fs";
import path from "node:path";
import { diffHunks, diffStats, type DiffResult } from "@/lib/lineDiff";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const HISTORY_ROOT = path.join(CONTENT_ROOT, "_history");
const INDEX_PATH = path.join(HISTORY_ROOT, "index.json");

type StoredRevision = {
  id: string;
  date: string;
  message: string;
  sha: string | null;
  bytes: number;
};

type HistoryIndex = {
  generated: string | null;
  notes: Record<string, StoredRevision[]>;
};

export type Revision = StoredRevision & {
  /** Lines added against the previous revision; null for the first one. */
  added: number | null;
  removed: number | null;
  /** Oldest revision is 1. */
  ordinal: number;
  isCurrent: boolean;
};

let cachedIndex: HistoryIndex | null = null;

function loadIndex(): HistoryIndex {
  if (cachedIndex) return cachedIndex;
  try {
    cachedIndex = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as HistoryIndex;
  } catch {
    cachedIndex = { generated: null, notes: {} };
  }
  return cachedIndex;
}

/** `content/gods/Foo.md` and `gods/Foo.md` both key the same note. */
function toContentRelative(sourcePath: string) {
  return sourcePath.replace(/^content[\\/]/, "").replace(/\\/g, "/");
}

export function getRevisionText(sourcePath: string, id: string): string | null {
  const rel = toContentRelative(sourcePath);
  // Reject anything that could climb out of the store.
  if (!/^[0-9A-Za-z-]+$/.test(id)) return null;
  const file = path.join(HISTORY_ROOT, rel, `${id}.md`);
  if (!path.resolve(file).startsWith(path.resolve(HISTORY_ROOT))) return null;
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** Every stored revision of a note, newest first, with per-revision stats. */
export function getRevisions(sourcePath: string): Revision[] {
  const rel = toContentRelative(sourcePath);
  const stored = loadIndex().notes[rel];
  if (!stored?.length) return [];

  const revisions: Revision[] = stored.map((entry, index) => {
    let added: number | null = null;
    let removed: number | null = null;
    if (index > 0) {
      const before = getRevisionText(sourcePath, stored[index - 1].id);
      const after = getRevisionText(sourcePath, entry.id);
      if (before !== null && after !== null) {
        const stats = diffStats(before, after);
        added = stats.added;
        removed = stats.removed;
      }
    }
    return {
      ...entry,
      added,
      removed,
      ordinal: index + 1,
      isCurrent: index === stored.length - 1,
    };
  });

  return revisions.reverse();
}

export function hasHistory(sourcePath: string) {
  return (loadIndex().notes[toContentRelative(sourcePath)]?.length ?? 0) > 1;
}

export function getRevision(sourcePath: string, id: string): Revision | null {
  return getRevisions(sourcePath).find((r) => r.id === id) ?? null;
}

export type RevisionComparison = {
  from: Revision;
  to: Revision;
  diff: DiffResult;
};

/**
 * Compare two revisions. Ids are accepted in either order and normalized so
 * the older one is always `from`, which is what the diff reads as removals.
 */
export function compareRevisions(sourcePath: string, aId: string, bId: string): RevisionComparison | null {
  const revisions = getRevisions(sourcePath);
  const a = revisions.find((r) => r.id === aId);
  const b = revisions.find((r) => r.id === bId);
  if (!a || !b) return null;
  const [from, to] = a.ordinal <= b.ordinal ? [a, b] : [b, a];
  const beforeText = getRevisionText(sourcePath, from.id);
  const afterText = getRevisionText(sourcePath, to.id);
  if (beforeText === null || afterText === null) return null;
  return { from, to, diff: diffHunks(beforeText, afterText) };
}

/** The diff that introduced a revision, i.e. against the one before it. */
export function getRevisionDiff(sourcePath: string, id: string): RevisionComparison | null {
  const revisions = getRevisions(sourcePath);
  const target = revisions.find((r) => r.id === id);
  if (!target) return null;
  const previous = revisions.find((r) => r.ordinal === target.ordinal - 1);
  if (!previous) return null;
  return compareRevisions(sourcePath, previous.id, target.id);
}
