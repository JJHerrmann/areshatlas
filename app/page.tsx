import SectionCard from "@/components/codex/SectionCard";
import { getSectionEntryCount, sections } from "@/lib/codexContent";
import { getFrontpageHero } from "@/lib/frontpageContent";

export default async function HomePage() {
  const hero = await getFrontpageHero();
  const sectionCards = sections.map((section) => {
    const count = getSectionEntryCount(section);
    return {
      ...section,
      href: `/${section.slug}`,
      countLabel: count ? `${count} on file` : "none on file",
    };
  });

  return (
    <main className="wiki-main-page text-stone-900">
      <div className="wiki-content">
        <article className="wiki-article">
          <div className="wiki-article-header">
            <div className="wiki-kicker">{hero.eyebrow} — opened Post-Exile 0</div>
            <h1 className="wiki-title">{hero.title}</h1>
            <p className="wiki-subtitle">{hero.subtitle}</p>
          </div>

          <div
            className="codex-prose wiki-prose"
            dangerouslySetInnerHTML={{ __html: hero.bodyHtml }}
          />
        </article>

        <section className="wiki-module-grid">
          <div className="wiki-box wiki-module wiki-module-wide">
            <h2 className="wiki-box-title">Divisions of the Registry</h2>
            <div className="wiki-section-grid">
              {sectionCards.map((section) => (
                <SectionCard
                  key={section.title}
                  title={section.title}
                  label={section.label}
                  summary={section.summary}
                  href={section.href}
                  countLabel={section.countLabel}
                />
              ))}
            </div>
          </div>

          <div className="wiki-box wiki-module">
            <h2 className="wiki-box-title">On the Registry</h2>
            <p className="wiki-copy">
              Each entry is drawn up as a file, not an article. It carries a registry
              number, an originating bureau, a classification, and an endorsement — and
              its history of revision is kept on the page, because the map of Thaer is a
              live negotiation and not a settled record.
            </p>
            <p className="wiki-copy">
              Division indexes read as a clerk&rsquo;s ledger; individual files render
              with their standing particulars in the left margin and their cross-references
              set as clauses.
            </p>
          </div>

          <div className="wiki-box wiki-module">
            <h2 className="wiki-box-title">The Reckoning</h2>
            <p className="wiki-copy">
              All dates are given <em>Post-Exile</em> — from 1705, when Vienna&rsquo;s
              exile began and the Portals opened. A date a bloc files in its own
              reckoning is stamped to this count.
            </p>
            <p className="wiki-copy">
              <strong>P.E.&nbsp;0</strong> &nbsp;·&nbsp; the Yawning, 1705<br />
              <strong>P.E.&nbsp;162</strong> &nbsp;·&nbsp; the present year, 1867
            </p>
          </div>

          <div className="wiki-box wiki-module">
            <h2 className="wiki-box-title">System Support</h2>
            <p className="wiki-copy wiki-systemline-credit">{hero.systemLine}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
