import SectionCard from "@/components/codex/SectionCard";
import CompassRose from "@/components/codex/CompassRose";
import CoordinateRule from "@/components/codex/CoordinateRule";
import CornerOrnament from "@/components/codex/CornerOrnament";
import PlateLabel from "@/components/codex/PlateLabel";
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
      <section className="border-b border-amber-300/80 bg-amber-100/70">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="aresh-masthead">
            <aside className="aresh-masthead-sidebar">
              <div className="aresh-sidebar-card">
                {hero.logoPath ? (
                  <figure className="aresh-sidebar-logo">
                    <img src={hero.logoPath} alt={hero.logoAlt} className="aresh-sidebar-logo-image" />
                    {hero.logoCaption ? <figcaption className="aresh-sidebar-logo-caption">{hero.logoCaption}</figcaption> : null}
                  </figure>
                ) : (
                  <div className="aresh-sidebar-logo aresh-sidebar-logo-placeholder" aria-hidden="true" />
                )}
                <div className="aresh-sidebar-systemline">
                  <span>{hero.systemLine}</span>
                </div>
                <div className="aresh-sidebar-labels">
                  {hero.plaqueLabels.map((label) => (
                    <span key={label} className="aresh-sidebar-label">
                      {label}
                    </span>
                  ))}
                </div>
                {hero.bannerPath ? (
                  <figure className="aresh-sidebar-banner" aria-hidden="true">
                    <img src={hero.bannerPath} alt={hero.bannerAlt} className="aresh-sidebar-banner-image" />
                  </figure>
                ) : null}
              </div>
            </aside>

            <div className="aresh-masthead-main">
              <div className="aresh-masthead-header">
                <div>
                  <PlateLabel>{hero.eyebrow}</PlateLabel>
                  <h1 className="mt-4 font-display text-4xl tracking-tight lg:text-6xl">
                    {hero.title}
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">
                    {hero.subtitle}
                  </p>
                </div>
                <div className="hidden xl:block">
                  <CompassRose />
                </div>
              </div>

              <div className="aresh-dossier-grid">
                <article className="aresh-dossier-panel">
                  <h2 className="aresh-panel-title">Survey Introduction</h2>
                  <div
                    className="codex-prose mt-4 text-stone-700"
                    dangerouslySetInnerHTML={{ __html: hero.bodyHtml }}
                  />
                </article>

                <aside className="aresh-dossier-panel aresh-dossier-notes">
                  <h2 className="aresh-panel-title">Archive Notes</h2>
                  <p className="aresh-panel-copy">
                    The codex is arranged as a browsable field archive: major divisions
                    lead to regions, peoples, divine records, and language material.
                  </p>
                  <p className="aresh-panel-copy">
                    Section indexes behave like survey ledgers; individual notes render
                    as readable dossier pages with metadata and crosslinks.
                  </p>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-800">Codex Divisions</p>
          <h2 className="mt-3 font-display text-3xl">Principal Surveys</h2>
          <CoordinateRule />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
      </section>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
