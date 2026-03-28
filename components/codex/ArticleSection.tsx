import type { ReactNode } from "react";
import SectionHeading from "@/components/codex/SectionHeading";

type ArticleSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export default function ArticleSection({ id, title, children }: ArticleSectionProps) {
  return (
    <section className="mt-12 codex-deity-section">
      <SectionHeading id={id} title={title} />
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
