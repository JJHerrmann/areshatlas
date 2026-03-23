import Link from "next/link";
import type { DerivedNavbox } from "@/lib/codexContent";

type NavboxFooterProps = {
  navboxes: DerivedNavbox[];
  currentSlug: string;
};

export default function NavboxFooter({ navboxes, currentSlug }: NavboxFooterProps) {
  const footerNavboxes = navboxes.filter((navbox) => navbox.mode === "footer");
  if (!footerNavboxes.length) return null;

  return (
    <div className="mt-8 space-y-4">
      {footerNavboxes.map((navbox) => (
        <footer key={navbox.id} className="wiki-box" aria-label={`${navbox.title} navigation`}>
          <div className="wiki-box-title">{navbox.title}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {navbox.items.map((item) =>
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
              ),
            )}
          </div>
        </footer>
      ))}
    </div>
  );
}
