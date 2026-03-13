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
      countLabel: count ? `${count} entries` : "No entries",
    };
  });

  return (
    <main className="min-h-screen text-stone-900">
      <section className="wiki-page-shell">
        <div className="wiki-page-frame">
          <header className="wiki-topbar">
            <div>
              <div className="wiki-site-name">Areshnaat Atlas</div>
              <div className="wiki-site-tagline">{hero.eyebrow}</div>
            </div>
            <div className="wiki-topbar-links">
              <a href="/regions">Regions</a>
              <a href="/pantheon">Pantheon</a>
              <a href="/cultures">Cultures</a>
            </div>
          </header>

          <div className="wiki-layout">
            <aside className="wiki-sidebar">
              <section className="wiki-box wiki-brand-box">
                {hero.logoPath ? (
                  <figure className="wiki-logo">
                    <img src={hero.logoPath} alt={hero.logoAlt} className="wiki-logo-image" />
                    {hero.logoCaption ? <figcaption className="wiki-logo-caption">{hero.logoCaption}</figcaption> : null}
                  </figure>
                ) : (
                  <div className="wiki-logo wiki-logo-placeholder" aria-hidden="true" />
                )}
                <div className="wiki-systemline">{hero.systemLine}</div>
                <nav className="wiki-nav-list" aria-label="Primary">
                  {sections.map((section) => (
                    <a key={section.slug} href={`/${section.slug}`} className="wiki-nav-link">
                      <span>{section.title}</span>
                      <span>{getSectionEntryCount(section)}</span>
                    </a>
                  ))}
                </nav>
              </section>

              <section className="wiki-box">
                <h2 className="wiki-box-title">Archive Notes</h2>
                <ul className="wiki-meta-list">
                  {hero.plaqueLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </section>

              {hero.bannerPath ? (
                <section className="wiki-box wiki-banner-box">
                  <img src={hero.bannerPath} alt={hero.bannerAlt} className="wiki-banner-image" />
                </section>
              ) : null}
            </aside>

            <div className="wiki-content">
              <article className="wiki-article">
                <div className="wiki-article-header">
                  <div className="wiki-kicker">Main Page</div>
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
                  <h2 className="wiki-box-title">Featured Divisions</h2>
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
                  <h2 className="wiki-box-title">About The Archive</h2>
                  <p className="wiki-copy">
                    The codex is arranged as a browsable field archive: major divisions
                    lead to regions, peoples, divine records, and language material.
                  </p>
                  <p className="wiki-copy">
                    Section indexes behave like survey ledgers; individual notes render
                    as readable dossier pages with metadata and crosslinks.
                  </p>
                </div>

                <div className="wiki-box wiki-module">
                  <h2 className="wiki-box-title">System Support</h2>
                  <p className="wiki-copy">{hero.systemLine}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
