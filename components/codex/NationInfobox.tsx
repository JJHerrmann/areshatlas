import type { NationSidebar } from "@/lib/codexContent";

type NationInfoboxProps = {
  data: NationSidebar;
};

function renderValue(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (
      <ul>
        {Object.entries(value as Record<string, unknown>)
          .filter(([, item]) => item != null && item !== "")
          .map(([key, item]) => (
            <li key={key}>
              {key}: {String(item)}
            </li>
          ))}
      </ul>
    );
  }
  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={`${String(item)}-${index}`}>{String(item)}</li>
        ))}
      </ul>
    );
  }
  return value ? String(value) : null;
}

function renderImageBlock(
  image: { src: string; alt: string; caption: string | null },
  variant: "banner" | "heraldry" | "map",
) {
  return (
    <figure key={`${variant}:${image.src}`} className={`codex-infobox-media codex-infobox-media-${variant}`}>
      <img src={image.src} alt={image.alt} className="codex-infobox-image" />
      {image.caption ? <figcaption className="codex-infobox-caption">{image.caption}</figcaption> : null}
    </figure>
  );
}

export default function NationInfobox({ data }: NationInfoboxProps) {
  const images = [
    data.images.banner ? renderImageBlock(data.images.banner, "banner") : null,
    data.images.heraldry ? renderImageBlock(data.images.heraldry, "heraldry") : null,
    data.images.map ? renderImageBlock(data.images.map, "map") : null,
  ].filter(Boolean);

  if (!data.sections.length && !images.length) return null;

  return (
    <aside className="codex-infobox">
      {images.length ? <div className="codex-infobox-media-stack">{images}</div> : null}
      <div className="codex-infobox-title">{data.title || "Nation"}</div>
      {data.subtitle ? <p className="codex-infobox-subtitle">{data.subtitle}</p> : null}
      <div className="codex-infobox-sections">
        {data.sections.map((section) => (
          <section key={section.title} className="codex-infobox-section">
            <h3 className="codex-infobox-section-title">{section.title}</h3>
            <dl className="codex-infobox-grid">
              {section.rows.map(([label, value]) => (
                <div key={label} className="codex-infobox-row">
                  <dt>{label}</dt>
                  <dd>{renderValue(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </aside>
  );
}
