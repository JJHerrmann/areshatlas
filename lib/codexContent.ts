import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";

export type SectionConfig = {
  slug: string;
  title: string;
  label: string;
  summary: string;
  folder: string;
};

export type ContentEntry = {
  title: string;
  href?: string;
  domain: string;
  summary: string;
  kind: "folder" | "file";
};

export type SectionView = {
  sourcePath: string;
  breadcrumb: Array<{ title: string; href: string }>;
  overview: ContentEntry | null;
  entries: ContentEntry[];
};

export type RenderedDocument = {
  title: string;
  summary: string;
  html: string;
  sourcePath: string;
  breadcrumb: Array<{ title: string; href: string }>;
  frontmatter: Record<string, unknown>;
};

export type DerivedArticle = {
  slug: string;
  title: string;
  section: string;
  href: string | null;
  source_relative_path: string;
  aliases: string[];
  navboxes: string[];
};

export type DerivedNavboxItem = {
  slug: string;
  title: string;
  href: string;
};

export type DerivedNavboxGroup = {
  label: string;
  items: DerivedNavboxItem[];
};

export type DerivedNavbox = {
  id: string;
  title: string;
  mode: string;
  items: DerivedNavboxItem[];
  groups?: DerivedNavboxGroup[];
};

export type SidebarSectionRow = [string, unknown];

export type SidebarSection = {
  title: string;
  rows: SidebarSectionRow[];
};

export type NationSidebar = {
  type: "nation";
  title: string;
  subtitle: string | null;
  source_relative_path: string;
  images: {
    banner: { src: string; alt: string; caption: string | null } | null;
    heraldry: { src: string; alt: string; caption: string | null } | null;
    map: { src: string; alt: string; caption: string | null } | null;
  };
  sections: SidebarSection[];
};

export type DeitySidebar = {
  type: "deity";
  title: string;
  subtitle: string | null;
  source_relative_path: string;
  images: {
    banner: { src: string; alt: string; caption: string | null } | null;
    heraldry: { src: string; alt: string; caption: string | null } | null;
    avatar: { src: string; alt: string; caption: string | null } | null;
  };
  sections: SidebarSection[];
};

const CONTENT_ROOT = path.join(process.cwd(), "content");
const DERIVED_ROOT = path.join(CONTENT_ROOT, "_derived", "sidebar");
const NAVBOX_DERIVED_ROOT = path.join(CONTENT_ROOT, "_derived", "navboxes");
const ALLOWED_ENTRY_EXTENSIONS = new Set([".md", ".markdown", ".csv"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
let markdownPathIndex: Array<{ relativePath: string; title: string; slugTitle: string }> | null = null;
let derivedArticleIndex: DerivedArticle[] | null = null;
let derivedNavboxIndex: DerivedNavbox[] | null = null;

function parseMatterSafe(raw: string) {
  try {
    return matter(raw);
  } catch {
    return {
      data: {} as Record<string, unknown>,
      content: raw,
    };
  }
}

export const sections: SectionConfig[] = [
  {
    slug: "pantheon",
    title: "Pantheon",
    label: "Catalog of Divine Aspects",
    summary: "Survey of gods, rites, symbols, and divine domains recorded across Aresh.",
    folder: "gods",
  },
  {
    slug: "regions",
    title: "Regions",
    label: "Geographic Surveys",
    summary: "Mapped territories, settlements, routes, hazards, and ecological observations.",
    folder: "regions",
  },
  {
    slug: "cultures",
    title: "Cultures",
    label: "Ethnographic Records",
    summary: "Peoples, languages, lineages, customs, and social memory of the known world.",
    folder: "cultures",
  },
  {
    slug: "languages",
    title: "Languages",
    label: "Linguistic Records",
    summary: "Tongues, scripts, speech families, and language notes gathered across Areshnaat.",
    folder: "cultures/language",
  },
  {
    slug: "relics",
    title: "Relics and Magic",
    label: "Artifacts and Arcana",
    summary: "Catalog of relics, magical traditions, rites, and notable materials.",
    folder: "relics",
  },
  {
    slug: "creatures",
    title: "Creatures and Powers",
    label: "Natural Observations",
    summary: "Bestiary entries, supernatural entities, and expedition-derived accounts.",
    folder: "creatures",
  },
  {
    slug: "chronicles",
    title: "Chronicles",
    label: "Recorded Histories",
    summary: "Events, conflicts, dynasties, migrations, and remembered cataclysms.",
    folder: "chronicles",
  },
];

export function getSectionBySlug(slug: string) {
  return sections.find((section) => section.slug === slug);
}

function getObsidianDisplayText(target: string, alias?: string) {
  if (alias?.trim()) return alias.trim();
  const cleanTarget = target.trim().replace(/\\/g, "/");
  return cleanTarget.split("/").pop()?.replace(/\.(md|markdown)$/i, "") || cleanTarget;
}

export type ObsidianInlinePart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string | null };

export function resolveObsidianInlineParts(value: string, sourceRelativePath?: string): ObsidianInlinePart[] {
  const parts: ObsidianInlinePart[] = [];
  const source = String(value);
  const pattern = /!\[\[([^[\]]+)\]\]|\[\[([^[\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: source.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      lastIndex = pattern.lastIndex;
      continue;
    }

    const [rawTarget, rawAlias] = String(match[2]).split("|");
    const cleanTarget = rawTarget.trim();
    const text = getObsidianDisplayText(cleanTarget, rawAlias);
    parts.push({
      type: "link",
      text,
      href: resolveObsidianHref(cleanTarget, sourceRelativePath),
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < source.length) {
    parts.push({ type: "text", text: source.slice(lastIndex) });
  }

  return parts;
}

export function normalizeObsidianText(value: string) {
  return resolveObsidianInlineParts(String(value))
    .map((part) => part.text)
    .join("")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeObsidianDisplayText(value: string) {
  return resolveObsidianInlineParts(String(value))
    .map((part) => part.text)
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function readFirstNonEmptyLine(markdown: string) {
  const line = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => Boolean(line) && !line.startsWith("---") && !line.startsWith("#"));
  return line ? normalizeObsidianText(line) : undefined;
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function slugifySegment(value: string) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEntrySlug(relativePath: string) {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/\.(md|markdown)$/i, "")
    .split("/")
    .filter(Boolean)
    .map((part) =>
      String(part)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .join("__");
}

function toTitle(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSectionRoot(section: SectionConfig) {
  return path.join(CONTENT_ROOT, section.folder);
}

function listMarkdownFiles(rootDir: string) {
  const out: string[] = [];
  function visit(dirPath: string) {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (item.name === "_derived" || item.name === "_registry" || item.name === ".gitkeep") continue;
      const nextPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        visit(nextPath);
        continue;
      }
      if (MARKDOWN_EXTENSIONS.has(path.extname(item.name).toLowerCase())) out.push(nextPath);
    }
  }
  if (fs.existsSync(rootDir)) visit(rootDir);
  return out;
}

function getMarkdownPathIndex() {
  if (markdownPathIndex) return markdownPathIndex;
  markdownPathIndex = listMarkdownFiles(CONTENT_ROOT).map((filePath) => {
    const relativePath = path.relative(CONTENT_ROOT, filePath).replace(/\\/g, "/");
    const title = titleFromFileName(path.basename(filePath));
    return {
      relativePath,
      title,
      slugTitle: slugifySegment(title),
    };
  });
  return markdownPathIndex;
}

function readDerivedJson<T>(fileName: string): T[] {
  const filePath = path.join(NAVBOX_DERIVED_ROOT, fileName);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T[];
}

function getDerivedArticleIndex() {
  if (derivedArticleIndex) return derivedArticleIndex;
  derivedArticleIndex = readDerivedJson<DerivedArticle>("articles.json");
  return derivedArticleIndex;
}

function getDerivedNavboxIndex() {
  if (derivedNavboxIndex) return derivedNavboxIndex;
  derivedNavboxIndex = readDerivedJson<DerivedNavbox>("navboxes.json");
  return derivedNavboxIndex;
}

function getSafeSectionPath(section: SectionConfig, slugParts: string[] = []) {
  const basePath = getSectionRoot(section);
  const targetPath = path.join(basePath, ...slugParts);
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    return null;
  }
  return resolvedTarget;
}

function resolveDirectoryPath(section: SectionConfig, slugParts: string[] = []) {
  let currentPath = getSectionRoot(section);
  if (!fs.existsSync(currentPath) || !fs.statSync(currentPath).isDirectory()) return null;

  for (const slugPart of slugParts) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    const nextDir = items.find((item) => item.isDirectory() && slugifySegment(item.name) === slugPart);
    if (!nextDir) return null;
    currentPath = path.join(currentPath, nextDir.name);
  }

  return currentPath;
}

function getFileRoute(section: SectionConfig, slugParts: string[], filePath: string) {
  const title = titleFromFileName(path.basename(filePath));
  return `/${section.slug}/${[...slugParts, slugifySegment(title)].map(encodeURIComponent).join("/")}`;
}

function readSummary(filePath: string, fallback: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_ENTRY_EXTENSIONS.has(ext)) return fallback;
  if (ext === ".csv") return fallback;
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseMatterSafe(raw);
  const cardSummary = typeof parsed.data.card_summary === "string" ? normalizeObsidianText(parsed.data.card_summary) : "";
  if (cardSummary) return cardSummary;

  const summary = typeof parsed.data.summary === "string" ? normalizeObsidianText(parsed.data.summary) : "";
  if (summary) return summary;

  return readFirstNonEmptyLine(parsed.content) || normalizeObsidianText(String(parsed.data.title || fallback));
}

function readEntryTitle(filePath: string, fallback: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!MARKDOWN_EXTENSIONS.has(ext)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseMatterSafe(raw);
  const name = typeof parsed.data.name === "string" ? normalizeObsidianDisplayText(parsed.data.name) : "";
  if (name) return name;
  const title = typeof parsed.data.title === "string" ? normalizeObsidianDisplayText(parsed.data.title) : "";
  if (title) return title;
  return fallback;
}

function createFileEntry(
  section: SectionConfig,
  slugParts: string[],
  filePath: string,
  domain: string,
): ContentEntry {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const fallbackTitle = titleFromFileName(fileName);
  return {
    title: readEntryTitle(filePath, fallbackTitle),
    href: ext === ".csv" ? undefined : getFileRoute(section, slugParts, filePath),
    domain,
    summary: readSummary(filePath, `Mirrored source entry in ${domain}.`),
    kind: "file",
  };
}

function createFolderEntry(
  section: SectionConfig,
  parentParts: string[],
  folderName: string,
  folderPath: string,
  domain: string,
): ContentEntry {
  const childParts = [...parentParts, folderName];
  const indexCandidates = [`${folderName}.md`, `${folderName}.markdown`];
  const indexFile = indexCandidates
    .map((candidate) => path.join(folderPath, candidate))
    .find((candidate) => fs.existsSync(candidate));
  return {
    title: folderName,
    href: `/${section.slug}/${childParts.map(slugifySegment).map(encodeURIComponent).join("/")}`,
    domain,
    summary: indexFile
      ? readSummary(indexFile, `Folder in ${domain} containing mirrored codex material.`)
      : `Folder in ${domain} containing mirrored codex material.`,
    kind: "folder",
  };
}

function buildBreadcrumb(section: SectionConfig, slugParts: string[]) {
  const resolvedTitles = slugParts.reduce<string[]>((titles, slugPart, index) => {
    const resolvedDir = resolveDirectoryPath(section, slugParts.slice(0, index + 1));
    if (resolvedDir) {
      titles.push(path.basename(resolvedDir));
      return titles;
    }

    if (index === slugParts.length - 1) {
      const filePath = findMarkdownFile(section, slugParts);
      if (filePath) {
        titles.push(titleFromFileName(path.basename(filePath)));
        return titles;
      }
    }

    titles.push(toTitle(slugPart));
    return titles;
  }, []);

  return [
    { title: section.title, href: `/${section.slug}` },
    ...slugParts.map((part, index) => ({
      title: resolvedTitles[index] ?? toTitle(part),
      href: `/${section.slug}/${slugParts.slice(0, index + 1).map(encodeURIComponent).join("/")}`,
    })),
  ];
}

function findMarkdownFile(section: SectionConfig, slugParts: string[]) {
  if (!slugParts.length) return null;
  const dirParts = slugParts.slice(0, -1);
  const fileStem = slugParts[slugParts.length - 1];
  const dirPath = resolveDirectoryPath(section, dirParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const match = items.find((item) => {
    if (!item.isFile()) return false;
    const ext = path.extname(item.name).toLowerCase();
    if (!MARKDOWN_EXTENSIONS.has(ext)) return false;
    return slugifySegment(titleFromFileName(item.name)) === fileStem;
  });
  return match ? path.join(dirPath, match.name) : null;
}

function contentRelativePathToHref(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\.(md|markdown)$/i, "");
  const section = [...sections]
    .sort((a, b) => b.folder.length - a.folder.length)
    .find((candidate) => normalized === candidate.folder || normalized.startsWith(`${candidate.folder}/`));
  if (!section) return null;

  let tail = normalized === section.folder ? "" : normalized.slice(section.folder.length + 1);
  const segments = tail ? tail.split("/").filter(Boolean) : [];
  if (segments.length === 1 && slugifySegment(segments[0]) === slugifySegment(path.basename(section.folder))) {
    return `/${section.slug}`;
  }
  if (segments.length >= 2 && slugifySegment(segments[segments.length - 1]) === slugifySegment(segments[segments.length - 2])) {
    segments.pop();
  }
  const routeTail = segments.map(slugifySegment).map(encodeURIComponent).join("/");
  return routeTail ? `/${section.slug}/${routeTail}` : `/${section.slug}`;
}

function resolveObsidianHref(target: string, sourceRelativePath?: string) {
  const normalizedTarget = target.trim().replace(/\\/g, "/");
  if (!normalizedTarget) return null;

  const withoutVaultPrefix = normalizedTarget.includes("codex-content/")
    ? normalizedTarget.split("codex-content/").pop() || normalizedTarget
    : normalizedTarget.startsWith("content/")
      ? normalizedTarget.slice("content/".length)
      : normalizedTarget;

  const pathLikeTarget = withoutVaultPrefix.replace(/\.(md|markdown)$/i, "");
  if (pathLikeTarget.includes("/")) {
    return contentRelativePathToHref(pathLikeTarget);
  }

  const slugTarget = slugifySegment(pathLikeTarget);
  if (sourceRelativePath) {
    const siblingDir = path.posix.dirname(sourceRelativePath.replace(/\\/g, "/"));
    const siblingMatch = getMarkdownPathIndex().find(
      (entry) => path.posix.dirname(entry.relativePath) === siblingDir && entry.slugTitle === slugTarget,
    );
    if (siblingMatch) return contentRelativePathToHref(siblingMatch.relativePath);
  }

  const globalMatch = getMarkdownPathIndex().find((entry) => entry.slugTitle === slugTarget);
  if (globalMatch) return contentRelativePathToHref(globalMatch.relativePath);
  return null;
}

function preprocessMarkdown(markdown: string, sourceRelativePath?: string) {
  return markdown
    .replace(/```dataviewjs[\s\S]*?```/g, "")
    .replace(/(?<!!)\[\[([^[\]]+)\]\]/g, (_match, target: string) => {
      const [rawTarget, rawAlias] = String(target).split("|");
      const cleanTarget = rawTarget.trim();
      const cleanAlias = rawAlias?.trim() || cleanTarget.split("/").pop()?.replace(/\.(md|markdown)$/i, "") || cleanTarget;
      const href = resolveObsidianHref(cleanTarget, sourceRelativePath);
      return href ? `[${cleanAlias}](${href})` : `[${cleanAlias}](#)`;
    });
}

function remarkCodexLinks() {
  return (tree: object) => {
    visit(tree as Parameters<typeof visit>[0], "link", (node: { url?: string; data?: Record<string, unknown> }) => {
      if (node.url === "#") {
        node.data = { ...(node.data || {}), hProperties: { className: "codex-inline-link" } };
      }
    });
  };
}

async function renderMarkdown(markdown: string, sourceRelativePath?: string) {
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCodexLinks)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(preprocessMarkdown(markdown, sourceRelativePath));
  return String(processed);
}

export function getSectionEntries(section: SectionConfig, slugParts: string[] = []): ContentEntry[] {
  const dirPath = resolveDirectoryPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const domain = slugParts.length ? slugParts.join(" / ") : section.folder;
  const currentFolderName = path.basename(dirPath);
  const folderNames = new Set(items.filter((item) => item.isDirectory()).map((item) => item.name));

  const entries: ContentEntry[] = [];
  for (const item of items) {
    if (item.name === ".gitkeep") continue;
    const itemPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      entries.push(createFolderEntry(section, slugParts, item.name, itemPath, domain));
      continue;
    }
    const ext = path.extname(item.name).toLowerCase();
    if (!ALLOWED_ENTRY_EXTENSIONS.has(ext)) continue;
    const title = titleFromFileName(item.name);
    if (folderNames.has(title)) continue;
    if (slugifySegment(title) === slugifySegment(currentFolderName)) continue;
    entries.push(createFileEntry(section, slugParts, itemPath, domain));
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function getSectionOverview(section: SectionConfig, slugParts: string[] = []) {
  const dirPath = resolveDirectoryPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const folderName = path.basename(dirPath);
  const indexFile = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((item) => item.isFile())
    .map((item) => path.join(dirPath, item.name))
    .find(
      (candidate) =>
        MARKDOWN_EXTENSIONS.has(path.extname(candidate).toLowerCase()) &&
        slugifySegment(titleFromFileName(path.basename(candidate))) === slugifySegment(folderName),
    );
  if (!indexFile) return null;

  return createFileEntry(section, slugParts.slice(0, -1), indexFile, slugParts.join(" / "));
}

function findOverviewMarkdownFile(section: SectionConfig, slugParts: string[]) {
  const dirPath = resolveDirectoryPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const folderName = path.basename(dirPath);
  return (
    fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((item) => item.isFile())
      .map((item) => path.join(dirPath, item.name))
      .find(
        (candidate) =>
          MARKDOWN_EXTENSIONS.has(path.extname(candidate).toLowerCase()) &&
          slugifySegment(titleFromFileName(path.basename(candidate))) === slugifySegment(folderName),
      ) || null
  );
}

export function getSectionEntryCount(section: SectionConfig) {
  return getSectionEntries(section).length;
}

export function getSectionView(section: SectionConfig, slugParts: string[] = []): SectionView | null {
  const dirPath = resolveDirectoryPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const resolvedRelative = path.relative(getSectionRoot(section), dirPath).replace(/\\/g, "/");
  return {
    sourcePath: `content/${section.folder}${resolvedRelative ? `/${resolvedRelative}` : ""}`,
    breadcrumb: buildBreadcrumb(section, slugParts),
    overview: getSectionOverview(section, slugParts),
    entries: getSectionEntries(section, slugParts),
  };
}

export async function getRenderedDocument(section: SectionConfig, slugParts: string[]): Promise<RenderedDocument | null> {
  const filePath = findMarkdownFile(section, slugParts);
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseMatterSafe(raw);
  const title =
    normalizeObsidianDisplayText(String(parsed.data.title || "")) ||
    normalizeObsidianDisplayText(readFirstNonEmptyLine(parsed.content)?.replace(/^#+\s*/, "") || "") ||
    titleFromFileName(path.basename(filePath));
  const summary =
    (typeof parsed.data.summary === "string" && normalizeObsidianText(parsed.data.summary)) ||
    readFirstNonEmptyLine(parsed.content) ||
    section.summary;
  const relativePath = path.relative(getSectionRoot(section), filePath).replace(/\\/g, "/");
  const html = await renderMarkdown(parsed.content, `${section.folder}/${relativePath}`);

  return {
    title,
    summary,
    html,
    sourcePath: `content/${section.folder}/${relativePath}`,
    breadcrumb: buildBreadcrumb(section, slugParts),
    frontmatter: parsed.data as Record<string, unknown>,
  };
}

export async function getRenderedOverviewDocument(section: SectionConfig, slugParts: string[]): Promise<RenderedDocument | null> {
  const filePath = findOverviewMarkdownFile(section, slugParts);
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseMatterSafe(raw);
  const title =
    normalizeObsidianDisplayText(String(parsed.data.title || "")) ||
    normalizeObsidianDisplayText(readFirstNonEmptyLine(parsed.content)?.replace(/^#+\s*/, "") || "") ||
    titleFromFileName(path.basename(filePath));
  const summary =
    (typeof parsed.data.summary === "string" && normalizeObsidianText(parsed.data.summary)) ||
    readFirstNonEmptyLine(parsed.content) ||
    section.summary;
  const relativePath = path.relative(getSectionRoot(section), filePath).replace(/\\/g, "/");
  const html = await renderMarkdown(parsed.content, `${section.folder}/${relativePath}`);

  return {
    title,
    summary,
    html,
    sourcePath: `content/${section.folder}/${relativePath}`,
    breadcrumb: buildBreadcrumb(section, slugParts),
    frontmatter: parsed.data as Record<string, unknown>,
  };
}

export function getNationSidebar(sourcePath: string): NationSidebar | null {
  const relativePath = sourcePath.replace(/^content[\\/]/, "");
  const derivedPath = path.join(DERIVED_ROOT, "nations", `${buildEntrySlug(relativePath)}.json`);
  if (!fs.existsSync(derivedPath) || !fs.statSync(derivedPath).isFile()) return null;
  return JSON.parse(fs.readFileSync(derivedPath, "utf8")) as NationSidebar;
}

export function getDeitySidebar(sourcePath: string): DeitySidebar | null {
  const relativePath = sourcePath.replace(/^content[\\/]/, "");
  const derivedPath = path.join(DERIVED_ROOT, "deities", `${buildEntrySlug(relativePath)}.json`);
  if (!fs.existsSync(derivedPath) || !fs.statSync(derivedPath).isFile()) return null;
  return JSON.parse(fs.readFileSync(derivedPath, "utf8")) as DeitySidebar;
}

export function getDerivedArticle(sourcePath: string): DerivedArticle | null {
  const relativePath = sourcePath.replace(/^content[\\/]/, "").replace(/\\/g, "/");
  return getDerivedArticleIndex().find((article) => article.source_relative_path === relativePath) || null;
}

export function getNavboxesForSourcePath(sourcePath: string): DerivedNavbox[] {
  const article = getDerivedArticle(sourcePath);
  if (!article || !article.navboxes.length) return [];
  const navboxIndex = new Map(getDerivedNavboxIndex().map((navbox) => [navbox.id, navbox]));
  return article.navboxes.map((id) => navboxIndex.get(id)).filter(Boolean) as DerivedNavbox[];
}
