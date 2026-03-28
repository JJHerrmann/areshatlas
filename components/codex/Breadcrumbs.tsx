import Link from "next/link";
import InlineCodexText from "@/components/codex/InlineCodexText";

type BreadcrumbItem = {
  title: string;
  href: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav className="codex-breadcrumbs" aria-label="Breadcrumbs">
      {items.map((item, index) => (
        <span key={`${item.href}-${index}`} className="codex-breadcrumbs-item">
          {index > 0 ? <span className="codex-breadcrumbs-separator" aria-hidden="true">›</span> : null}
          <Link href={item.href} className="codex-breadcrumb-pill">
            <InlineCodexText text={item.title} />
          </Link>
        </span>
      ))}
    </nav>
  );
}
