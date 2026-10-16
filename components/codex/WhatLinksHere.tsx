import Link from "next/link";
import type { Backlink } from "@/lib/codexLinks";

/**
 * MediaWiki's "What links here", inlined at the foot of an article rather than
 * hidden behind a toolbox link.
 *
 * On a vault this unfinished it earns the space: it is the only thing on a page
 * that shows what the subject is connected to when the note body itself is
 * still an empty template.
 */
export default function WhatLinksHere({ backlinks }: { backlinks: Backlink[] }) {
  if (!backlinks.length) return null;

  return (
    <section className="codex-backlinks">
      <h2 className="codex-backlinks-heading">
        What links here <span className="codex-backlinks-count">({backlinks.length})</span>
      </h2>
      <ul className="codex-backlinks-list">
        {backlinks.map((entry) => (
          <li key={entry.href} className="codex-backlinks-item">
            <Link href={entry.href}>{entry.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
