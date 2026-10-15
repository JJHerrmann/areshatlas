import type { RevisionComparison } from "@/lib/codexHistory";

type HistoryDiffProps = {
  comparison: RevisionComparison;
};

/**
 * Unified diff between two revisions. Markdown is shown as source rather than
 * rendered: a diff of rendered HTML hides exactly the edits (link targets,
 * frontmatter, callout markers) a page history exists to show.
 */
export default function HistoryDiff({ comparison }: HistoryDiffProps) {
  const { from, to, diff } = comparison;

  if (diff.unchanged) {
    return (
      <article className="codex-empty-state p-6 text-sm leading-6">
        These two revisions have identical text.
      </article>
    );
  }

  return (
    <div className="codex-diff">
      <p className="codex-diff-summary">
        Revision {from.ordinal} &rarr; {to.ordinal}:{" "}
        <span className="codex-history-stat-add">+{diff.added}</span>{" "}
        <span className="codex-history-stat-del">&minus;{diff.removed}</span>
      </p>
      {diff.hunks.map((hunk, index) => (
        <table className="codex-diff-table" key={`${hunk.beforeStart}-${hunk.afterStart}-${index}`}>
          <caption className="codex-diff-hunk-caption">
            line {hunk.beforeStart || 1}
          </caption>
          <tbody>
            {hunk.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={`codex-diff-row codex-diff-${row.type}`}>
                <td className="codex-diff-gutter">{row.before ?? ""}</td>
                <td className="codex-diff-gutter">{row.after ?? ""}</td>
                <td className="codex-diff-marker">
                  {row.type === "added" ? "+" : row.type === "removed" ? "−" : ""}
                </td>
                <td className="codex-diff-text">{row.text || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
