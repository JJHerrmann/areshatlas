import Link from "next/link";

type RelatedEntity = {
  text: string;
  href: string;
  subtitle?: string | null;
  imageSrc?: string;
};

type RelatedEntitiesCardProps = {
  title?: string;
  items: RelatedEntity[];
};

export default function RelatedEntitiesCard({
  title = "Related Entries",
  items,
}: RelatedEntitiesCardProps) {
  if (!items.length) return null;

  return (
    <aside className="codex-related-entities-card">
      <h3 className="codex-related-entities-title">{title}</h3>
      <div className="codex-related-entities-list">
        {items.map((item) => (
          <Link key={`${item.href}-${item.text}`} href={item.href} className="codex-related-entities-item">
            {item.imageSrc ? (
              <img
                src={item.imageSrc}
                alt=""
                className="codex-related-entities-thumb codex-related-entities-thumb-image"
              />
            ) : (
              <span className="codex-related-entities-thumb" aria-hidden="true" />
            )}
            <span className="codex-related-entities-copy">
              <span className="codex-related-entities-item-title">{item.text}</span>
              {item.subtitle ? <span className="codex-related-entities-item-subtitle">{item.subtitle}</span> : null}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
