import type { NationSidebar } from "@/lib/codexContent";
import InfoCard from "@/components/codex/InfoCard";

type NationInfoboxProps = { data: NationSidebar };

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
    <InfoCard
      title={data.title || "Nation"}
      subtitle={data.subtitle}
      sourceRelativePath={data.source_relative_path}
      sections={data.sections}
      topImages={images.length ? <>{images}</> : null}
    />
  );
}
