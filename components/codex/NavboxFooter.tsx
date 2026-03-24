import Link from "next/link";
import type { DerivedNavbox } from "@/lib/codexContent";

type NavboxFooterProps = {
  navboxes: DerivedNavbox[];
  currentSlug: string;
};

export default function NavboxFooter({ navboxes, currentSlug }: NavboxFooterProps) {
  const footerNavboxes = navboxes.filter((navbox) => navbox.mode === "footer");
  if (!footerNavboxes.length) return null;

  const renderItem = (item: { slug: string; title: string; href: string }) =>
    item.slug === currentSlug ? (
      <span
        key={item.slug}
        className="inline-flex items-center border px-3 py-1 text-sm"
        style={{
          borderColor: "rgba(139, 108, 41, 0.38)",
          background: "rgba(236, 204, 126, 0.2)",
          color: "#4b2b0b",
        }}
        aria-current="page"
      >
        {item.title}
      </span>
    ) : (
      <Link
        key={item.slug}
        href={item.href}
        className="inline-flex items-center border px-3 py-1 text-sm transition-colors"
        style={{
          borderColor: "rgba(114, 86, 30, 0.2)",
          background: "rgba(252, 247, 236, 0.9)",
          color: "#3f2a0c",
        }}
      >
        {item.title}
      </Link>
    );

  return (
    <div className="mt-8 space-y-4">
      {footerNavboxes.map((navbox) => (
        <footer key={navbox.id} className="wiki-box" aria-label={`${navbox.title} navigation`}>
          <div className="wiki-box-title">{navbox.title}</div>
          {navbox.groups?.length ? (
            <div className="mt-3 space-y-2">
              {navbox.groups.map((group) => (
                <div key={group.label} className="grid gap-2 border-t border-stone-300/70 pt-2 md:grid-cols-[180px,1fr]">
                  <div className="text-sm font-semibold text-stone-700">{group.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(renderItem)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {navbox.items.map(renderItem)}
            </div>
          )}
        </footer>
      ))}
    </div>
  );
}
