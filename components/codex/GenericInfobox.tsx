import InfoRowList from "@/components/codex/InfoRowList";
import type { SidebarSectionRow } from "@/lib/codexContent";

type GenericInfoboxProps = {
  title: string;
  /** Ordered label -> value rows, straight from a `infobox:` frontmatter mapping. */
  infobox: Record<string, string>;
  /** Optional globe / hemisphere caption strings shown above the rows. */
  hemisphereViews?: string[];
  /** Optional setting label ("Thaer", "Areshnaat") shown as an eyebrow. */
  world?: string;
  sourceRelativePath: string;
};

/**
 * Renders a plain, schema-agnostic infobox from a frontmatter `infobox:` map.
 * Used for content (e.g. Thaer) that doesn't fit the typed deity / nation
 * infoboxes. Reuses the existing `.codex-infobox*` styling.
 */
export default function GenericInfobox({
  title,
  infobox,
  hemisphereViews,
  world,
  sourceRelativePath,
}: GenericInfoboxProps) {
  const rows = Object.entries(infobox) as SidebarSectionRow[];
  if (!rows.length) return null;

  return (
    <aside className="codex-infobox codex-info-card">
      {world ? <p className="codex-infobox-subtitle">{world}</p> : null}
      <div className="codex-infobox-title">{title}</div>
      {hemisphereViews?.map((view) => (
        <p key={view} className="codex-infobox-caption">
          {view}
        </p>
      ))}
      <div className="codex-infobox-sections">
        <section className="codex-infobox-section">
          <InfoRowList rows={rows} sourceRelativePath={sourceRelativePath} />
        </section>
      </div>
    </aside>
  );
}
