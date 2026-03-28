import type { ReactNode } from "react";
import type { SidebarSection } from "@/lib/codexContent";
import InfoRowList from "@/components/codex/InfoRowList";

type InfoCardImage = {
  src: string;
  alt: string;
  caption: string | null;
};

type InfoCardProps = {
  title: string;
  subtitle?: string | null;
  sourceRelativePath: string;
  sections: SidebarSection[];
  topImages?: ReactNode;
  bottomImages?: ReactNode;
  withIcons?: boolean;
};

export default function InfoCard({
  title,
  subtitle,
  sourceRelativePath,
  sections,
  topImages,
  bottomImages,
  withIcons = false,
}: InfoCardProps) {
  if (!sections.length && !topImages && !bottomImages) return null;

  return (
    <aside className="codex-infobox codex-info-card">
      {topImages ? <div className="codex-infobox-media-stack">{topImages}</div> : null}
      <div className="codex-infobox-title">{title}</div>
      {subtitle ? <p className="codex-infobox-subtitle">{subtitle}</p> : null}
      <div className="codex-infobox-sections">
        {sections.map((section) => (
          <section key={section.title} className="codex-infobox-section">
            <h3 className="codex-infobox-section-title">{section.title}</h3>
            <InfoRowList
              rows={section.rows}
              sourceRelativePath={sourceRelativePath}
              withIcons={withIcons}
            />
          </section>
        ))}
      </div>
      {bottomImages ? <div className="codex-infobox-media-stack mt-4 border-t border-stone-300/70 pt-4">{bottomImages}</div> : null}
    </aside>
  );
}
