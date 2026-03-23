import Link from "next/link";
import { getSectionEntryCount, sections } from "@/lib/codexContent";

export default function PersistentFooter() {
  return (
    <footer className="wiki-persistent-footer" aria-label="Codex footer navigation">
      <div className="wiki-persistent-footer-banner">Browse the Aresh Codex by section</div>
      <nav className="wiki-persistent-footer-links" aria-label="Codex sections">
        {sections.map((section) => {
          const count = getSectionEntryCount(section);
          return (
            <Link key={section.slug} href={`/${section.slug}`} className="wiki-persistent-footer-link">
              <span>{section.title}</span>
              <span className="wiki-persistent-footer-count">{count}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
