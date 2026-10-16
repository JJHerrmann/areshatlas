import type { Metadata } from "next";
import Link from "next/link";
import {
  getDeadEndPages,
  getLinkGraphStats,
  getOrphanedPages,
  getWantedPages,
} from "@/lib/codexLinks";

export const metadata: Metadata = {
  title: "Maintenance",
  description: "Wanted, orphaned and dead-end pages across the codex.",
  robots: { index: false, follow: false },
};

const WANTED_SHOWN = 60;

/**
 * The MediaWiki maintenance reports, as one page: WantedPages, LonelyPages and
 * DeadendPages. All three are views of the same wikilink graph.
 *
 * Noindex: this is a worklist for whoever is writing the vault, not an article.
 */
export default function SpecialPage() {
  const stats = getLinkGraphStats();
  const wanted = getWantedPages();
  const orphans = getOrphanedPages();
  const deadEnds = getDeadEndPages();

  return (
    <main className="codex-page-inner">
      <h1 className="wiki-title">Maintenance</h1>
      <p className="wiki-subtitle">
        {stats.articles} articles, {stats.links} wikilinks, {stats.resolved} of them resolving.
      </p>

      <section className="codex-index-group">
        <h2 className="codex-index-heading">
          Wanted pages <span className="codex-index-count">({wanted.length})</span>
        </h2>
        <p className="codex-special-note">
          Linked but not written, most-linked first. These are the red links.
        </p>
        <ul className="codex-index-list">
          {wanted.slice(0, WANTED_SHOWN).map((entry) => (
            <li key={entry.target} className="codex-index-item">
              <span className="codex-redlink">{entry.target}</span>
              <span className="codex-index-gloss">
                {entry.linkedFrom.length} link{entry.linkedFrom.length === 1 ? "" : "s"}
                {" — "}
                {entry.linkedFrom.slice(0, 3).map((source, index) => (
                  <span key={source.href}>
                    {index > 0 ? ", " : ""}
                    <Link href={source.href}>{source.title}</Link>
                  </span>
                ))}
                {entry.linkedFrom.length > 3 ? ` +${entry.linkedFrom.length - 3} more` : ""}
              </span>
            </li>
          ))}
        </ul>
        {wanted.length > WANTED_SHOWN ? (
          <p className="codex-special-note">
            Showing {WANTED_SHOWN} of {wanted.length}. Run <code>npm run links:audit</code> for the
            full list.
          </p>
        ) : null}
      </section>

      <section className="codex-index-group">
        <h2 className="codex-index-heading">
          Orphaned pages <span className="codex-index-count">({orphans.length})</span>
        </h2>
        <p className="codex-special-note">Published, but nothing links to them.</p>
        <ul className="codex-index-list">
          {orphans.map((entry) => (
            <li key={entry.href} className="codex-index-item">
              <Link href={entry.href} className="codex-index-link">
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="codex-index-group">
        <h2 className="codex-index-heading">
          Dead-end pages <span className="codex-index-count">({deadEnds.length})</span>
        </h2>
        <p className="codex-special-note">
          They link nowhere. On this vault that usually means the note body is still an unfilled
          template.
        </p>
        <ul className="codex-index-list">
          {deadEnds.map((entry) => (
            <li key={entry.href} className="codex-index-item">
              <Link href={entry.href} className="codex-index-link">
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
