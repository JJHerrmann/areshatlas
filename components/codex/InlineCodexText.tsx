import Link from "next/link";
import { resolveObsidianInlineParts } from "@/lib/codexContent";

type InlineCodexTextProps = {
  text: string;
  sourceRelativePath?: string;
};

function renderStyledText(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    return <span key={key}>{part}</span>;
  });
}

export default function InlineCodexText({ text, sourceRelativePath }: InlineCodexTextProps) {
  const parts = resolveObsidianInlineParts(text, sourceRelativePath);
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return renderStyledText(part.text, `text-${index}`);
        }

        if (part.href) {
          return (
            <Link key={`link-${index}`} href={part.href} className="codex-inline-link">
              {part.text}
            </Link>
          );
        }

        return renderStyledText(part.text, `fallback-${index}`);
      })}
    </>
  );
}
