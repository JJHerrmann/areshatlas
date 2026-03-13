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
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (
      <ul>
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
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
  const geographic = (data.geographic_info as Record<string, unknown> | undefined) || {};
  const government = (data.government as Record<string, unknown> | undefined) || {};
  const economy = (data.economy as Record<string, unknown> | undefined) || {};
  const society = (data.society as Record<string, unknown> | undefined) || {};
  const religion = (data.religion as Record<string, unknown> | undefined) || {};
  const gameInfo = (data.game_info as Record<string, unknown> | undefined) || {};

  const images = [
    getImageField(data, "image_banner", "banner"),
    getImageField(data, "image_heraldry", "heraldry"),
    getImageField(data, "image_map", "map"),
  ].filter(Boolean) as ImageField[];

  const candidateRows: Array<[string, unknown]> = [
    ["Formal Name", data.formal_name] as [string, unknown],
    ["Arms", data.arms] as [string, unknown],
    ["Continent", geographic.continent] as [string, unknown],
    ["Location", geographic.location] as [string, unknown],
    ["Government Type", government.government_type] as [string, unknown],
    ["Hierarchy", government.hierarchy] as [string, unknown],
    ["Ruler", government.ruler] as [string, unknown],
    ["Capital", government.capital] as [string, unknown],
    ["Capital Population", government.capital_population] as [string, unknown],
    ["Alliances", government.alliances] as [string, unknown],
    ["Hostilities", government.hostilities] as [string, unknown],
    ["Coinage", economy.coinage] as [string, unknown],
    ["Mythus Standard", economy.mythus_standard] as [string, unknown],
    ["Population", society.population] as [string, unknown],
    ["Ancestry Breakdown", society.ancestry_breakdown] as [string, unknown],
    ["Languages", society.languages] as [string, unknown],
    ["Important Persons", society.important_persons] as [string, unknown],
    ["Pantheon", religion.pantheon] as [string, unknown],
    ["Patron", religion.patron] as [string, unknown],
    ["Cultural Templates", gameInfo.cultural_templates] as [string, unknown],
    ["Map", gameInfo.map] as [string, unknown],
  ];
  const rows = candidateRows.filter(([, value]) => Boolean(value));

  if (!rows.length && !images.length) return null;

  return (
    <aside className="codex-infobox">
      {images.length ? <div className="codex-infobox-media-stack">{images.map(renderImageBlock)}</div> : null}
      <div className="codex-infobox-title">{String(data.title || data.name || "Nation")}</div>
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
