import Link from "next/link";
import { resolveObsidianInlineParts } from "@/lib/codexContent";

type ArticleTopicFooterProps = {
  frontmatter: Record<string, unknown>;
  sectionTitle: string;
  sourceRelativePath: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean);
  }

  const single = text(value);
  return single ? [single] : [];
}

function renderInline(value: string, sourceRelativePath: string) {
  return resolveObsidianInlineParts(value, sourceRelativePath).map((part, index) => {
    if (part.type === "text") {
      return <span key={`text-${index}`}>{part.text}</span>;
    }

    if (part.href) {
      return (
        <Link
          key={`link-${index}`}
          href={part.href}
          style={{ color: "#7b4a10", textDecoration: "underline", textDecorationColor: "rgba(123, 74, 16, 0.45)" }}
        >
          {part.text}
        </Link>
      );
    }

    return <span key={`fallback-${index}`}>{part.text}</span>;
  });
}

export default function ArticleTopicFooter({
  frontmatter,
  sectionTitle,
  sourceRelativePath,
}: ArticleTopicFooterProps) {
  const primaryTopic =
    text(frontmatter.primary_topic) ||
    text(frontmatter.topic) ||
    sectionTitle ||
    "the Aresh Codex";
  const topicList = Array.from(
    new Set([
      primaryTopic,
      ...asStringArray(frontmatter.topics),
      ...asStringArray(frontmatter.categories),
    ]),
  );

  if (!topicList.length) return null;

  const secondaryTopics = topicList.filter((topic) => topic !== primaryTopic);

  return (
    <footer className="wiki-box" style={{ marginTop: "1.6rem" }} aria-label="Article topic footer">
      <div className="wiki-box-title">Article Topics</div>
      <div className="wiki-copy" style={{ marginTop: 0 }}>
        This article is part of the {renderInline(primaryTopic, sourceRelativePath)}
      </div>
      {secondaryTopics.length ? (
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            marginTop: "0.85rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {secondaryTopics.map((topic) => (
            <div key={topic} className="wiki-box" style={{ padding: "0.65rem 0.75rem" }}>
              <div className="wiki-box-title" style={{ marginBottom: "0.35rem" }}>
                Indexed under
              </div>
              <div className="wiki-copy" style={{ margin: 0 }}>
                {renderInline(topic, sourceRelativePath)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </footer>
  );
}
