import Link from "next/link";
import { resolveObsidianInlineParts } from "@/lib/codexContent";

type SidebarValueProps = {
  value: unknown;
  sourceRelativePath: string;
};

function renderInlineText(value: string, sourceRelativePath: string) {
  const parts = resolveObsidianInlineParts(value, sourceRelativePath);
  return parts.map((part, index) => {
    if (part.type === "text") {
      return <span key={`text-${index}`}>{part.text}</span>;
    }

    if (part.href) {
      return (
        <Link key={`link-${index}`} href={part.href} className="codex-infobox-link">
          {part.text}
        </Link>
      );
    }

    return <span key={`fallback-${index}`}>{part.text}</span>;
  });
}

export default function SidebarValue({ value, sourceRelativePath }: SidebarValueProps) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (
      <ul>
        {Object.entries(value as Record<string, unknown>)
          .filter(([, item]) => item != null && item !== "")
          .map(([key, item]) => (
            <li key={key}>
              {key}: {typeof item === "string" ? renderInlineText(item, sourceRelativePath) : String(item)}
            </li>
          ))}
      </ul>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={`${String(item)}-${index}`}>
            {typeof item === "string" ? renderInlineText(item, sourceRelativePath) : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "string") {
    return <>{renderInlineText(value, sourceRelativePath)}</>;
  }

  return value ? String(value) : null;
}
