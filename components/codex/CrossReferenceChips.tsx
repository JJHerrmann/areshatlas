import Link from "next/link";

type CrossReferenceChip = {
  text: string;
  href: string;
};

type CrossReferenceChipsProps = {
  items: CrossReferenceChip[];
};

export default function CrossReferenceChips({ items }: CrossReferenceChipsProps) {
  if (!items.length) return null;

  return (
    <div className="codex-cross-reference-chips" aria-label="Cross references">
      {items.map((item) => (
        <Link key={`${item.href}-${item.text}`} href={item.href} className="codex-cross-reference-chip">
          {item.text}
        </Link>
      ))}
    </div>
  );
}
