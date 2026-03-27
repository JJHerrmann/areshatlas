import type { DeitySidebar } from "@/lib/codexContent";
import SidebarValue from "@/components/codex/SidebarValue";

type DeityInfoboxProps = { data: DeitySidebar };

function renderImageBlock(
  image: { src: string; alt: string; caption: string | null },
  variant: "banner" | "heraldry" | "avatar" | "symbol",
) {
  return (
    <figure key={`${variant}:${image.src}`} className={`codex-infobox-media codex-infobox-media-${variant}`}>
      <img src={image.src} alt={image.alt} className="codex-infobox-image" />
      {image.caption ? <figcaption className="codex-infobox-caption">{image.caption}</figcaption> : null}
    </figure>
  );
}

export default function DeityInfobox({ data }: DeityInfoboxProps) {
  const topImages = [
    data.images.banner ? renderImageBlock(data.images.banner, "banner") : null,
    data.images.heraldry ? renderImageBlock(data.images.heraldry, "heraldry") : null,
    data.images.avatar ? renderImageBlock(data.images.avatar, "avatar") : null,
  ].filter(Boolean);
  const symbolImage = data.images.symbol ? renderImageBlock(data.images.symbol, "symbol") : null;

  if (!data.sections.length && !topImages.length && !symbolImage) return null;

  return (
    <aside className="codex-infobox">
      {topImages.length ? <div className="codex-infobox-media-stack">{topImages}</div> : null}
      <div className="codex-infobox-title">{data.title || "Deity"}</div>
      {data.subtitle ? <p className="codex-infobox-subtitle">{data.subtitle}</p> : null}
      <div className="codex-infobox-sections">
        {data.sections.map((section) => (
          <section key={section.title} className="codex-infobox-section">
            <h3 className="codex-infobox-section-title">{section.title}</h3>
            <dl className="codex-infobox-grid">
              {section.rows.map(([label, value]) => (
                <div key={label} className="codex-infobox-row">
                  <dt>{label}</dt>
                  <dd>
                    <SidebarValue value={value} sourceRelativePath={data.source_relative_path} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {symbolImage ? <div className="codex-infobox-media-stack mt-4 border-t border-stone-300/70 pt-4">{symbolImage}</div> : null}
    </aside>
  );
}
