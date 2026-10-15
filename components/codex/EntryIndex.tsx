import Link from "next/link";

/**
 * A plain index of what is filed in a section, in the MediaWiki category-page
 * tradition: subdivisions first, then entries, as an alphabetical multi-column
 * list of links with a short gloss.
 *
 * This replaced a card grid that looked richer and worked worse. The cards
 * painted hardcoded Tailwind colours (`bg-amber-50/70`, `text-stone-900`), so
 * they ignored the theme entirely; they washed a parchment scrim over whatever
 * cover image a note happened to have, so entries with art and entries without
 * read as two different kinds of thing; and because each card was as tall as
 * its own summary, rows went ragged and the grid filled with dead space. The
 * links themselves were never broken -- all 38 resolved -- so the grid was
 * paying a legibility cost for nothing.
 */

type IndexEntry = {
  title: string;
  domain: string;
  summary: string;
  href?: string;
  kind?: "folder" | "file";
  meta?: string;
};

const GLOSS_LIMIT = 96;

/** Short gloss: the epithet if the note has one, else the opening of its summary. */
function gloss(entry: IndexEntry): string {
  const source = (entry.meta || entry.summary || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  // Strip the inline emphasis markers the summaries carry; this is one line of
  // plain text, not prose, so there is nothing for them to mark up.
  const clean = source.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
  if (clean.length <= GLOSS_LIMIT) return clean;
  const cut = clean.slice(0, GLOSS_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 48 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\s]+$/, "")}…`;
}

function IndexList({ entries }: { entries: IndexEntry[] }) {
  return (
    <ul className="codex-index-list">
      {entries.map((entry) => {
        const text = gloss(entry);
        return (
          <li key={`${entry.domain}:${entry.title}`} className="codex-index-item">
            {entry.href ? (
              <Link href={entry.href} className="codex-index-link">
                {entry.title}
              </Link>
            ) : (
              <span className="codex-index-link">{entry.title}</span>
            )}
            {text ? <span className="codex-index-gloss">{text}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function EntryIndex({ entries }: { entries: IndexEntry[] }) {
  const folders = entries.filter((entry) => entry.kind === "folder");
  const files = entries.filter((entry) => entry.kind !== "folder");

  return (
    <div className="codex-index">
      {folders.length ? (
        <section className="codex-index-group">
          <h2 className="codex-index-heading">
            Divisions <span className="codex-index-count">({folders.length})</span>
          </h2>
          <IndexList entries={folders} />
        </section>
      ) : null}

      {files.length ? (
        <section className="codex-index-group">
          <h2 className="codex-index-heading">
            Entries <span className="codex-index-count">({files.length})</span>
          </h2>
          <IndexList entries={files} />
        </section>
      ) : null}
    </div>
  );
}
