import InlineCodexText from "@/components/codex/InlineCodexText";

type ArticleDekProps = {
  text?: string | null;
  sourceRelativePath?: string;
};

export default function ArticleDek({ text, sourceRelativePath }: ArticleDekProps) {
  if (!text) return null;

  return (
    <p className="codex-page-summary codex-article-dek">
      <InlineCodexText text={text} sourceRelativePath={sourceRelativePath} />
    </p>
  );
}
