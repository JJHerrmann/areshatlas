// Shared SEO helpers for per-page metadata generation.

const MAX_DESCRIPTION = 155;

/**
 * Turn a raw summary / first-line-of-markdown into a clean meta description:
 * strip markdown + HTML, collapse whitespace, clamp to ~155 chars on a word
 * boundary. Falls back to `fallback` when the input is empty or unusable.
 */
export function cleanDescription(input: string | null | undefined, fallback: string): string {
  const raw = (input ?? "").toString();
  const stripped = raw
    .replace(/<[^>]+>/g, " ") // HTML tags
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links / images -> text
    .replace(/[*_`>#~]/g, "") // markdown emphasis / heading / quote marks
    .replace(/\[[^\]]*\]/g, "") // leftover [placeholder] brackets
    .replace(/\s+/g, " ")
    .trim();

  const base = stripped.length >= 30 ? stripped : fallback;
  if (base.length <= MAX_DESCRIPTION) return base;

  const clipped = base.slice(0, MAX_DESCRIPTION);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 60 ? clipped.slice(0, lastSpace) : clipped).replace(/[.,;:\s]+$/, "")}…`;
}

/**
 * Draft / stub / placeholder entries should not be indexed until they carry
 * real content. Checked against markdown frontmatter.
 */
export function isNoindexFrontmatter(frontmatter: Record<string, unknown> | null | undefined): boolean {
  if (!frontmatter) return false;
  if (frontmatter.draft === true || frontmatter.noindex === true) return true;
  const status = typeof frontmatter.status === "string" ? frontmatter.status.trim().toLowerCase() : "";
  return status === "draft" || status === "stub" || status === "placeholder" || status === "wip";
}

/**
 * Demote the first <h1> in a rendered markdown fragment to <h2>. Overview /
 * article markdown files open with `# Title`, which would otherwise render a
 * second <h1> on the page competing with the ArticleHeader page title.
 */
export function demoteLeadingH1(html: string): string {
  return html.replace(
    /<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/i,
    (_match, attrs, inner) => `<h2${attrs ?? ""}>${inner}</h2>`,
  );
}

/** Build a root-relative canonical path from URL segments. */
export function canonicalPath(...segments: Array<string | undefined | null>): string {
  const path = segments
    .filter((s): s is string => Boolean(s))
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return path ? `/${path}` : "/";
}
