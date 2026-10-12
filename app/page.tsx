import KedantlanHeader from "@/components/header/KedantlanHeader";
import SectionCard from "@/components/codex/SectionCard";
import { getSectionEntryCount, sections } from "@/lib/codexContent";
import { getFrontpageHero } from "@/lib/frontpageContent";

export default async function HomePage() {
  const hero = await getFrontpageHero();
  const worldMapSrc = "/maps/areshnaat-faux-satellite.webp";
  const sectionCards = sections.map((section) => {
    const count = getSectionEntryCount(section);
    return {
      ...section,
      href: `/${section.slug}`,
      countLabel: count ? `${count} entries` : "No entries",
    };
  });

  return (
    <main className="wiki-main-page text-stone-900">
      <div className="wiki-content">
        {/* Interactive survey map. Client-rendered canvas over a tile pyramid; the
            sidebar keeps a plain <img> banner, so the page still ships an image in
            server-rendered HTML. */}
        <figure className="wiki-header-map">
          <KedantlanHeader
            atlasHref="/regions"
            atlasLabel="Open the regions index"
          />
          <noscript>
            <img
              src="/kedantlan-header/tiles/sat_L3_0_0.webp"
              alt="Survey map of Kedantlan and the surrounding lands; the rest of the world lies in fog."
              className="wiki-header-map-poster"
            />
          </noscript>
          <figcaption className="wiki-header-map-caption">
            Kedantlan and the surveyed lands. Press &ldquo;Explore the map&rdquo; to pan and zoom.
          </figcaption>
        </figure>

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
          <div className="wiki-box wiki-module wiki-module-full">
            <h2 className="wiki-box-title">World Survey Map</h2>
            <a href={worldMapSrc} className="wiki-map-link" target="_blank" rel="noreferrer">
              <img
                src={worldMapSrc}
                alt="Faux-satellite survey map of Areshnaat"
                className="wiki-world-map-image"
              />
            </a>
            <p className="wiki-copy">
              A faux-satellite render of the world surface derived from the rotated
              terrain model, landmask, biome projection, and relief shading.
            </p>
          </div>

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
    </main>
  );
}
