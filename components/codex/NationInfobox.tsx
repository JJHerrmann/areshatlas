type NationInfoboxProps = {
  data: Record<string, unknown>;
};

type ImageField = {
  src: string;
  alt: string;
  caption?: string;
  variant: "banner" | "heraldry" | "map";
};

function renderValue(value: unknown) {
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

function getImageField(
  data: Record<string, unknown>,
  field: "image_banner" | "image_heraldry" | "image_map",
  variant: "banner" | "heraldry" | "map",
): ImageField | null {
  const src = data[field];
  if (!src || typeof src !== "string") return null;
  const suffix = field.replace("image_", "");
  const alt = data[`image_${suffix}_alt`];
  const caption = data[`image_${suffix}_caption`];
  return {
    src,
    alt: typeof alt === "string" && alt.trim() ? alt : String(data.title || data.endonym || "Nation"),
    caption: typeof caption === "string" && caption.trim() ? caption : undefined,
    variant,
  };
}

function renderImageBlock(image: ImageField) {
  return (
    <figure key={`${image.variant}:${image.src}`} className={`codex-infobox-media codex-infobox-media-${image.variant}`}>
      <img src={image.src} alt={image.alt} className="codex-infobox-image" />
      {image.caption ? <figcaption className="codex-infobox-caption">{image.caption}</figcaption> : null}
    </figure>
  );
}

export default function NationInfobox({ data }: NationInfoboxProps) {
  const images = [
    getImageField(data, "image_banner", "banner"),
    getImageField(data, "image_heraldry", "heraldry"),
    getImageField(data, "image_map", "map"),
  ].filter(Boolean) as ImageField[];

  const candidateRows: Array<[string, unknown]> = [
    ["Endonym", data.endonym] as [string, unknown],
    ["Exonym", data.exonym] as [string, unknown],
    ["English Gloss", data.english_gloss] as [string, unknown],
    ["State Form", data.state_form] as [string, unknown],
    ["Capital", data.capital] as [string, unknown],
    ["Ruler", data.ruler] as [string, unknown],
    ["People", data.people] as [string, unknown],
    ["Language", data.language] as [string, unknown],
    ["Mountain Range", data.range] as [string, unknown],
    ["Sacred Peak", data.sacred_peak] as [string, unknown],
    ["Religion", data.religion] as [string, unknown],
    ["Exports", data.exports] as [string, unknown],
  ];
  const rows = candidateRows.filter(([, value]) => Boolean(value));

  if (!rows.length && !images.length) return null;

  return (
    <aside className="codex-infobox">
      {images.length ? <div className="codex-infobox-media-stack">{images.map(renderImageBlock)}</div> : null}
      <div className="codex-infobox-title">{String(data.title || data.endonym || "Nation")}</div>
      <dl className="codex-infobox-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="codex-infobox-row">
            <dt>{label}</dt>
            <dd>{renderValue(value)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
