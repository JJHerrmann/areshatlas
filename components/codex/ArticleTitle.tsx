import InlineCodexText from "@/components/codex/InlineCodexText";

type ArticleTitleProps = {
  title: string;
  sourceRelativePath?: string;
};

export default function ArticleTitle({ title, sourceRelativePath }: ArticleTitleProps) {
  return (
    <h1 className="codex-page-title">
      <InlineCodexText text={title} sourceRelativePath={sourceRelativePath} />
    </h1>
  );
}
