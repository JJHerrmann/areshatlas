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

const CONTENT_ROOT = path.join(process.cwd(), "content");
const DERIVED_ROOT = path.join(CONTENT_ROOT, "_derived", "sidebar");
const ALLOWED_ENTRY_EXTENSIONS = new Set([".md", ".markdown", ".csv"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

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

function readFirstNonEmptyLine(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => Boolean(line) && !line.startsWith("---") && !line.startsWith("#"));
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
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

function getFileRoute(section: SectionConfig, slugParts: string[], filePath: string) {
  const title = titleFromFileName(path.basename(filePath));
  return `/${section.slug}/${[...slugParts, title].map(encodeURIComponent).join("/")}`;
}

function readSummary(filePath: string, fallback: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_ENTRY_EXTENSIONS.has(ext)) return fallback;
  if (ext === ".csv") return fallback;
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  return readFirstNonEmptyLine(parsed.content) || String(parsed.data.title || fallback);
}

function createFileEntry(
  section: SectionConfig,
  slugParts: string[],
  filePath: string,
  domain: string,
): ContentEntry {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  return {
    title: titleFromFileName(fileName),
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
    href: `/${section.slug}/${childParts.map(encodeURIComponent).join("/")}`,
    domain,
    summary: indexFile
      ? readSummary(indexFile, `Folder in ${domain} containing mirrored codex material.`)
      : `Folder in ${domain} containing mirrored codex material.`,
    kind: "folder",
  };
}

function buildBreadcrumb(section: SectionConfig, slugParts: string[]) {
  return [
    { title: section.title, href: `/${section.slug}` },
    ...slugParts.map((part, index) => ({
      title: toTitle(part),
      href: `/${section.slug}/${slugParts.slice(0, index + 1).map(encodeURIComponent).join("/")}`,
    })),
  ];
}

function findMarkdownFile(section: SectionConfig, slugParts: string[]) {
  if (!slugParts.length) return null;
  const dirParts = slugParts.slice(0, -1);
  const fileStem = slugParts[slugParts.length - 1];
  const dirPath = getSafeSectionPath(section, dirParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }
  for (const ext of MARKDOWN_EXTENSIONS) {
    const candidate = path.join(dirPath, `${fileStem}${ext}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function preprocessMarkdown(markdown: string) {
  return markdown
    .replace(/```dataviewjs[\s\S]*?```/g, "")
    .replace(/\[\[([^[\]]+)\]\]/g, (_match, target: string) => {
      const clean = String(target).split("|")[0].trim();
      return `[${clean}](#)`;
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

async function renderMarkdown(markdown: string) {
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCodexLinks)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(preprocessMarkdown(markdown));
  return String(processed);
}

export function getSectionEntries(section: SectionConfig, slugParts: string[] = []): ContentEntry[] {
  const dirPath = getSafeSectionPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const domain = slugParts.length ? slugParts.join(" / ") : section.folder;
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
    if (slugParts.length && slugParts[slugParts.length - 1] === title) continue;
    entries.push(createFileEntry(section, slugParts, itemPath, domain));
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function getSectionOverview(section: SectionConfig, slugParts: string[] = []) {
  if (!slugParts.length) return null;
  const dirPath = getSafeSectionPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const folderName = slugParts[slugParts.length - 1];
  const indexCandidates = [`${folderName}.md`, `${folderName}.markdown`];
  const indexFile = indexCandidates
    .map((candidate) => path.join(dirPath, candidate))
    .find((candidate) => fs.existsSync(candidate));
  if (!indexFile) return null;

  return createFileEntry(section, slugParts.slice(0, -1), indexFile, slugParts.join(" / "));
}

export function getSectionEntryCount(section: SectionConfig) {
  return getSectionEntries(section).length;
}

export function getSectionView(section: SectionConfig, slugParts: string[] = []): SectionView | null {
  const dirPath = getSafeSectionPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  return {
    sourcePath: `content/${section.folder}${slugParts.length ? `/${slugParts.join("/")}` : ""}`,
    breadcrumb: buildBreadcrumb(section, slugParts),
    overview: getSectionOverview(section, slugParts),
    entries: getSectionEntries(section, slugParts),
  };
}

export async function getRenderedDocument(section: SectionConfig, slugParts: string[]): Promise<RenderedDocument | null> {
  const filePath = findMarkdownFile(section, slugParts);
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const title =
    String(parsed.data.title || "").trim() ||
    readFirstNonEmptyLine(parsed.content)?.replace(/^#+\s*/, "") ||
    titleFromFileName(path.basename(filePath));
  const summary = readFirstNonEmptyLine(parsed.content) || section.summary;
  const html = await renderMarkdown(parsed.content);
  const relativePath = path.relative(getSectionRoot(section), filePath).replace(/\\/g, "/");

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
