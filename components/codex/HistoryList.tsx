import Link from "next/link";
import type { Revision } from "@/lib/codexHistory";

type HistoryListProps = {
  revisions: Revision[];
  /** Article path, e.g. /pantheon/gods/gozara — links hang off its /history. */
  basePath: string;
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function formatDate(iso: string) {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.valueOf()) ? iso : DATE_FORMAT.format(parsed);
}

/**
 * Revision list for one article, newest first. Each row links to that version
 * of the page and, where there is a predecessor, to the diff that produced it.
 */
export default function HistoryList({ revisions, basePath }: HistoryListProps) {
  if (!revisions.length) {
    return (
      <article className="codex-empty-state p-6 text-sm leading-6">
        No revisions have been recorded for this article yet.
      </article>
    );
  }

  return (
    <ol className="codex-history-list">
      {revisions.map((revision) => (
        <li key={revision.id} className="codex-history-row">
          <div className="codex-history-row-main">
            <Link href={`${basePath}/history/${revision.id}`} className="codex-history-date">
              {formatDate(revision.date)}
            </Link>
            {revision.isCurrent ? <span className="codex-history-badge">current</span> : null}
            <span className="codex-history-message">{revision.message}</span>
          </div>
          <div className="codex-history-row-meta">
            {revision.added === null ? (
              <span className="codex-history-stat codex-history-stat-new">page created</span>
            ) : (
              <>
                <span className="codex-history-stat codex-history-stat-add">+{revision.added}</span>
                <span className="codex-history-stat codex-history-stat-del">&minus;{revision.removed}</span>
              </>
            )}
            <span className="codex-history-bytes">{revision.bytes.toLocaleString()} bytes</span>
            {revision.added === null ? null : (
              <Link href={`${basePath}/history/${revision.id}/diff`} className="codex-history-difflink">
                diff
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
