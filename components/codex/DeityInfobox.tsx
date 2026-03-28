import type { DeitySidebar } from "@/lib/codexContent";
import InfoCard from "@/components/codex/InfoCard";

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
    <InfoCard
      title={data.title || "Deity"}
      subtitle={data.subtitle}
      sourceRelativePath={data.source_relative_path}
      sections={data.sections}
      topImages={topImages.length ? <>{topImages}</> : null}
      bottomImages={symbolImage}
      withIcons
    />
  );
}
