import type { ReactNode } from "react";
import CoordinateRule from "@/components/codex/CoordinateRule";
import ArticleDek from "@/components/codex/ArticleDek";
import ArticleTitle from "@/components/codex/ArticleTitle";
import Breadcrumbs from "@/components/codex/Breadcrumbs";
import GlobalSearch from "@/components/codex/GlobalSearch";
import PlateLabel from "@/components/codex/PlateLabel";

type SearchItem = {
  title: string;
  href: string | null;
  section: string;
  aliases?: string[];
};

type ArticleHeaderProps = {
  breadcrumbs: Array<{ title: string; href: string }>;
  label: string;
  title: string;
  dek?: string | null;
  statusNotice?: ReactNode;
  sourceNote?: string | null;
  sourceRelativePath?: string;
  searchItems: SearchItem[];
};

export default function ArticleHeader({
  breadcrumbs,
  label,
  title,
  dek,
  statusNotice,
  sourceNote,
  sourceRelativePath,
  searchItems,
}: ArticleHeaderProps) {
  return (
    <header className="codex-article-header">
      <div className="codex-top-utility-bar">
        <Breadcrumbs items={breadcrumbs} />
        <GlobalSearch items={searchItems} />
      </div>

      <div className="codex-article-header-main">
        <PlateLabel>{label}</PlateLabel>
        {statusNotice ? <div className="codex-status-notice">{statusNotice}</div> : null}
        <ArticleTitle title={title} sourceRelativePath={sourceRelativePath} />
        <ArticleDek text={dek} sourceRelativePath={sourceRelativePath} />
        {sourceNote ? <p className="codex-source-note">{sourceNote}</p> : null}
        <CoordinateRule />
      </div>
    </header>
  );
}
