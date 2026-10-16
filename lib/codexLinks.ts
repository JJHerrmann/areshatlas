import path from "node:path";
import {
  contentRelativePathToHref,
  getContentNoteSources,
  resolveObsidianHref,
  sections,
  getSectionEntries,
} from "@/lib/codexContent";

/**
 * The wikilink graph.
 *
 * Everything MediaWiki does beyond rendering a page is an index over this:
 * what links here, wanted pages, orphans, dead ends. It is built once per
 * process at build time by walking the same note list the site publishes.
 *
 * Resolution goes through the renderer's own `resolveObsidianHref`, so a link
 * counted here is a link the page actually renders. If the two used separate
 * rules they would drift, and a backlink that does not match the rendered link
 * is worse than no backlink at all.
 */

export type LinkEdge = {
  /** Href of the linking note, e.g. "/pantheon/gozara". */
  from: string;
  /** Title of the linking note. */
  fromTitle: string;
  /** Href of the target, or null when the target does not exist. */
  to: string | null;
  /** The literal wikilink target as written. */
  target: string;
};

export type Backlink = {
  href: string;
  title: string;
};

export type WantedPage = {
  target: string;
  linkedFrom: Backlink[];
};

type LinkGraph = {
  edges: LinkEdge[];
  backlinks: Map<string, Backlink[]>;
  wanted: WantedPage[];
  /** Hrefs of every published article, for orphan/dead-end detection. */
  articles: Map<string, string>;
  outboundCount: Map<string, number>;
};

// A wikilink target that is an asset, not a page.
const ASSET = /\.(png|jpe?g|webp|avif|svg|gif|canvas|base|pdf)$/i;
// An unfilled note-template placeholder, e.g. [[{{related_deity_1}}]]. The
// renderer does not emit a link for these, so the graph must not count them.
const PLACEHOLDER = /^\{\{.*\}\}$/;

function titleFromRelativePath(relativePath: string) {
  return path.basename(relativePath).replace(/\.(md|markdown)$/i, "");
}

let graph: LinkGraph | null = null;

function buildGraph(): LinkGraph {
  const edges: LinkEdge[] = [];
  const backlinks = new Map<string, Backlink[]>();
  const wantedBy = new Map<string, Map<string, Backlink>>();
  const outboundCount = new Map<string, number>();

  for (const { relativePath, markdown } of getContentNoteSources()) {
    const from = contentRelativePathToHref(relativePath);
    if (!from) continue;
    const fromTitle = titleFromRelativePath(relativePath);

    // Both plain links and note embeds: an embed is still a reference, and
    // Obsidian treats it as one. Image embeds are filtered out below.
    const seenTargets = new Set<string>();
    for (const match of markdown.matchAll(/!?\[\[([^[\]]+)\]\]/g)) {
      const target = match[1].split("|")[0].trim();
      if (!target || ASSET.test(target) || PLACEHOLDER.test(target)) continue;

      // One edge per distinct target per note: a god listed in both the
      // frontmatter and the prose is one relationship, not two.
      const dedupeKey = target.toLowerCase();
      if (seenTargets.has(dedupeKey)) continue;
      seenTargets.add(dedupeKey);

      const to = resolveObsidianHref(target, relativePath);
      if (to === from) continue; // a note linking to itself is not a backlink

      edges.push({ from, fromTitle, to, target });
      outboundCount.set(from, (outboundCount.get(from) || 0) + 1);

      if (to) {
        const list = backlinks.get(to) || [];
        if (!list.some((entry) => entry.href === from)) {
          list.push({ href: from, title: fromTitle });
          backlinks.set(to, list);
        }
      } else {
        const sources = wantedBy.get(target) || new Map<string, Backlink>();
        sources.set(from, { href: from, title: fromTitle });
        wantedBy.set(target, sources);
      }
    }
  }

  for (const list of backlinks.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  const wanted = [...wantedBy.entries()]
    .map(([target, sources]) => ({
      target,
      linkedFrom: [...sources.values()].sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort(
      (a, b) => b.linkedFrom.length - a.linkedFrom.length || a.target.localeCompare(b.target),
    );

  // Every published article, so we can tell an orphan from a page we simply
  // have not walked.
  const articles = new Map<string, string>();
  function visit(section: (typeof sections)[number], slugParts: string[]) {
    for (const entry of getSectionEntries(section, slugParts)) {
      if (!entry.href) continue;
      if (!articles.has(entry.href)) articles.set(entry.href, entry.title);
      if (entry.kind === "folder") {
        const parts = entry.href.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
        if (parts.length) visit(section, parts);
      }
    }
  }
  for (const section of sections) visit(section, []);

  return { edges, backlinks, wanted, articles, outboundCount };
}

function getGraph() {
  if (!graph) graph = buildGraph();
  return graph;
}

/** Notes that link to this href. The "What links here" list. */
export function getBacklinks(href: string): Backlink[] {
  return getGraph().backlinks.get(href) || [];
}

/**
 * Backlinks for a RenderedDocument's `sourcePath`, which carries a `content/`
 * prefix the href resolver does not expect. Callers pass sourcePath straight
 * in; the prefix is stripped here so the convention lives in one place.
 */
export function getBacklinksForSourcePath(sourcePath: string): Backlink[] {
  const relativePath = sourcePath.replace(/^content[\\/]/, "");
  const href = contentRelativePathToHref(relativePath);
  return href ? getBacklinks(href) : [];
}

/** Missing targets, most-linked first. MediaWiki's Special:WantedPages. */
export function getWantedPages(): WantedPage[] {
  return getGraph().wanted;
}

/** Published articles nothing links to. Special:LonelyPages. */
export function getOrphanedPages(): Backlink[] {
  const { articles, backlinks } = getGraph();
  return [...articles.entries()]
    .filter(([href]) => !backlinks.has(href))
    .map(([href, title]) => ({ href, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Published articles that link nowhere. Special:DeadendPages. */
export function getDeadEndPages(): Backlink[] {
  const { articles, outboundCount } = getGraph();
  return [...articles.entries()]
    .filter(([href]) => !outboundCount.get(href))
    .map(([href, title]) => ({ href, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getLinkGraphStats() {
  const { edges, articles, wanted } = getGraph();
  return {
    articles: articles.size,
    links: edges.length,
    resolved: edges.filter((edge) => edge.to).length,
    wantedTargets: wanted.length,
  };
}
