import type { SidebarSectionRow } from "@/lib/codexContent";
import SidebarValue from "@/components/codex/SidebarValue";
import DeityFieldIcon from "@/components/codex/DeityFieldIcon";

type InfoRowListProps = {
  rows: SidebarSectionRow[];
  sourceRelativePath: string;
  withIcons?: boolean;
};

export default function InfoRowList({
  rows,
  sourceRelativePath,
  withIcons = false,
}: InfoRowListProps) {
  return (
    <dl className="codex-infobox-grid">
      {rows.map(([label, value]) => (
        <div key={label} className="codex-infobox-row">
          <dt>
            {withIcons ? (
              <span className="codex-infobox-label-wrap">
                <DeityFieldIcon label={label} />
                <span>{label}</span>
              </span>
            ) : (
              label
            )}
          </dt>
          <dd>
            <SidebarValue value={value} sourceRelativePath={sourceRelativePath} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
