import { getSectionEntryCount, sections } from "@/lib/codexContent";
import { getFrontpageHero } from "@/lib/frontpageContent";

export default async function WikiSidebar() {
  const hero = await getFrontpageHero();

  return (
    <div className="wiki-sidebar-stack">
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

      {hero.bannerPath ? (
        <section className="wiki-box wiki-banner-box">
          <img src={hero.bannerPath} alt={hero.bannerAlt} className="wiki-banner-image" />
        </section>
      ) : null}
    </div>
  );
}
