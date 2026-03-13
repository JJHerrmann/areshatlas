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
      <section className="border-b border-amber-300/80 bg-amber-100/80">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="aresh-hero-shell">
            <div className="aresh-hero-main">
              <div className="aresh-hero-copy">
                <div className="aresh-hero-rail">
                  {hero.logoPath ? (
                    <figure className="aresh-hero-logo">
                      <img src={hero.logoPath} alt={hero.logoAlt} className="aresh-hero-logo-image" />
                      {hero.logoCaption ? <figcaption className="aresh-hero-logo-caption">{hero.logoCaption}</figcaption> : null}
                    </figure>
                  ) : (
                    <div className="aresh-hero-logo aresh-hero-logo-placeholder" aria-hidden="true" />
                  )}
                  <div className="aresh-hero-banner-stack">
                    {hero.bannerPath ? (
                      <figure className="aresh-hero-banner" aria-hidden="true">
                        <img src={hero.bannerPath} alt={hero.bannerAlt} className="aresh-hero-banner-image" />
                        {hero.bannerCaption ? <figcaption className="aresh-hero-banner-caption">{hero.bannerCaption}</figcaption> : null}
                      </figure>
                    ) : null}
                    <div className="aresh-hero-systemline">{hero.systemLine}</div>
                  </div>
                </div>
                <div className="aresh-hero-text">
                  <PlateLabel>{hero.eyebrow}</PlateLabel>
                  <h1 className="mt-4 font-display text-4xl tracking-tight lg:text-6xl">
                    {hero.title}
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">
                    {hero.subtitle}
                  </p>
                  <div
                    className="codex-prose mt-4 max-w-3xl text-stone-700"
                    dangerouslySetInnerHTML={{ __html: hero.bodyHtml }}
                  />
                  <div className="mt-6 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em] text-amber-800">
                    {hero.plaqueLabels.map((label) => (
                      <span key={label} className="border border-amber-400/70 px-3 py-1">{label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <CompassRose />
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
