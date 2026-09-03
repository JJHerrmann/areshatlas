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
  imageSrc?: string;
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
  /** Which setting this document belongs to, e.g. "Areshnaat" or "Thaer". */
  world: string;
  /** Ordered label -> value rows for a generic infobox (Thaer-style frontmatter). */
  infobox?: Record<string, string>;
  /** Globe / hemisphere caption strings shown above the infobox rows. */
  hemisphereViews?: string[];
};

export type DeityCompletion = {
  filled: number;
  total: number;
  ratio: number;
  isStub: boolean;
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

export type SearchableArticle = {
  title: string;
  href: string | null;
  section: string;
  aliases: string[];
};

export type RelatedArticlePreview = {
  title: string;
  href: string;
  subtitle?: string | null;
  imageSrc?: string;
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

export type DerivedDeityRelations = Partial<{
  allies: string[];
  foes: string[];
  consorts: string[];
  siblings: string[];
  parents: string[];
  offspring: string[];
}>;

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
    symbol: { src: string; alt: string; caption: string | null } | null;
  };
  sections: SidebarSection[];
};

const CONTENT_ROOT = path.join(process.cwd(), "content");
const DERIVED_ROOT = path.join(CONTENT_ROOT, "_derived", "sidebar");
const NAVBOX_DERIVED_ROOT = path.join(CONTENT_ROOT, "_derived", "navboxes");
const ALLOWED_ENTRY_EXTENSIONS = new Set([".md", ".markdown", ".csv"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"]);
let markdownPathIndex: Array<{ relativePath: string; title: string; slugTitle: string }> | null = null;
let assetPathIndex: Array<{ relativePath: string; fileName: string }> | null = null;
let derivedArticleIndex: DerivedArticle[] | null = null;
let derivedNavboxIndex: DerivedNavbox[] | null = null;
let derivedDeityRelationIndex: Record<string, DerivedDeityRelations> | null = null;

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

function readFirstHeading(markdown: string) {
  const line = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^#{1,6}\s+\S/.test(line));
  return line ? normalizeObsidianText(line.replace(/^#{1,6}\s+/, "")) : undefined;
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

const DEFAULT_WORLD = "Areshnaat";

/** Resolve which setting a document belongs to from its frontmatter. */
function readWorld(frontmatter: Record<string, unknown>): string {
  const raw =
    (typeof frontmatter.world === "string" && frontmatter.world.trim()) ||
    (typeof frontmatter.property === "string" && frontmatter.property.trim()) ||
    (typeof frontmatter.setting === "string" && frontmatter.setting.trim()) ||
    "";
  const key = raw.toLowerCase();
  if (!key) return DEFAULT_WORLD;
  if (key === "aresh" || key === "areshnaat" || key === "areshnaht") return "Areshnaat";
  if (key === "thaer") return "Thaer";
  return raw;
}

/** Ordered [frontmatter key, infobox label] pairs assembled for `subtype: character`. */
const CHARACTER_INFOBOX_FIELDS: Array<[string, string]> = [
  ["aliases", "Also known as"],
  ["culture", "Culture"],
  ["race", "Race"],
  ["class", "Class"],
  ["deity", "Deity"],
  ["affiliation", "Affiliation"],
];

/**
 * Read an infobox for a generic (non-deity, non-nation) document:
 *  - an explicit ordered `infobox:` mapping (Thaer empire style), or
 *  - assembled from typed character fields when `subtype: character`.
 */
function readInfobox(frontmatter: Record<string, unknown>): Record<string, string> | undefined {
  const raw = frontmatter.infobox;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rows: Record<string, string> = {};
    for (const [label, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value == null) continue;
      rows[label] = normalizeObsidianText(String(value));
    }
    return Object.keys(rows).length ? rows : undefined;
  }

  if (frontmatter.subtype === "character") {
    const rows: Record<string, string> = {};
    for (const [key, label] of CHARACTER_INFOBOX_FIELDS) {
      const value = frontmatter[key];
      if (value == null) continue;
      const text = Array.isArray(value)
        ? value.map((v) => normalizeObsidianText(String(v))).filter(Boolean).join(", ")
        : normalizeObsidianText(String(value));
      if (text) rows[label] = text;
    }
    return Object.keys(rows).length ? rows : undefined;
  }

  return undefined;
}

function readHemisphereViews(frontmatter: Record<string, unknown>): string[] | undefined {
  const raw = frontmatter.hemisphere_views ?? frontmatter.hemisphereViews;
  if (!Array.isArray(raw)) return undefined;
  const views = raw.map((v) => normalizeObsidianText(String(v))).filter(Boolean);
  return views.length ? views : undefined;
}

function slugifySegment(value: string) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStringArray(value: unknown) {
  if (value == null || value === "") return [];
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") {
      const normalized = String(item).trim();
      return normalized ? [normalized] : [];
    }
    return [];
  });
}

function resolveFrontmatterValue(frontmatter: Record<string, unknown>, keyPath: string): unknown {
  return keyPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, frontmatter);
}

function stringifyFrontmatterValue(value: unknown, standalone: boolean): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    const items = value
      .flatMap((item) => {
        if (item == null) return [];
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          const normalized = String(item).trim();
          return normalized ? [normalized] : [];
        }
        return [];
      });
    if (items.length === 0) return "";
    return standalone ? items.map((item) => `- ${item}`).join("\n") : items.join(", ");
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function removeSourceMarkers(value: string) {
  return value.replace(/\s*<!--\s*fm:[^>]+-->\s*/g, "");
}

function interpolateFrontmatterTokens(markdown: string, frontmatter: Record<string, unknown>) {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const standaloneMatch = line.match(/^(\s*)\{\{\s*([A-Za-z0-9_.]+)\s*\}\}(\s*<!--.*-->)?\s*$/);
      if (standaloneMatch) {
        const [, indent, keyPath] = standaloneMatch;
        const resolved = stringifyFrontmatterValue(resolveFrontmatterValue(frontmatter, keyPath), true);
        if (!resolved) return "";
        return resolved
          .split("\n")
          .map((entry) => `${indent}${entry}`)
          .join("\n");
      }

      const replaced = line.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (_match, keyPath: string) => {
        const resolved = stringifyFrontmatterValue(resolveFrontmatterValue(frontmatter, keyPath), false);
        return resolved;
      });

      const cleaned = removeSourceMarkers(replaced).trim();
      if (!cleaned) return "";
      if (/^(?:[-*]\s*)?\*\*[^*]+:\*\*$/.test(cleaned)) return "";
      if (/^(?:[-*]\s*)?\*\*[^*]+:\*\*\s*$/.test(cleaned)) return "";
      if (/^#{1,6}\s*$/.test(cleaned)) return "";
      if (/^#{1,6}\s*[^#]+:\s*$/.test(cleaned)) return "";
      if (/^[-*]\s*$/.test(cleaned)) return "";
      return replaced;
    })
    .join("\n");
}

function cleanupInterpolatedMarkdown(markdown: string) {
  return markdown
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const DEITY_COMPLETION_KEYS = [
  "summary",
  "epithet",
  "pantheon",
  "divine_rank",
  "gender",
  "nature",
  "ethos",
  "major_influence",
  "minor_influences",
  "spheres",
  "avatars",
  "parents",
  "siblings",
  "offspring",
  "consorts",
  "allies",
  "foes",
  "dwelling_place",
  "primary_symbol",
  "secondary_symbols",
  "sacred_number",
  "sacred_colors",
  "forbidden_colors",
  "sacred_stones",
  "sacred_materials",
  "sacred_objects",
  "sacred_weapons",
  "church_name",
  "central_authority",
  "regional_titles",
  "temple_titles",
  "clergy_titles",
  "religious_orders",
  "holy_texts",
  "apocrypha",
  "virtues",
  "vices",
  "holy_days",
  "taboos",
  "physical_description",
  "form_1_name",
  "form_1_description",
  "form_2_name",
  "form_2_description",
  "form_3_name",
  "form_3_description",
  "symbolism_notes",
  "dwelling_place_description",
  "servants_description",
  "doctrine_overview",
  "holy_text_1",
  "holy_text_1_summary",
  "holy_text_2",
  "holy_text_2_summary",
  "apocrypha_1",
  "apocrypha_1_summary",
  "apocrypha_2",
  "apocrypha_2_summary",
  "apocrypha_3",
  "apocrypha_3_summary",
  "virtue_1",
  "virtue_1_description",
  "virtue_2",
  "virtue_2_description",
  "virtue_3",
  "virtue_3_description",
  "vice_1",
  "vice_1_description",
  "vice_2",
  "vice_2_description",
  "vice_3",
  "vice_3_description",
  "theological_mission",
  "social_mission",
  "regional_authority_description",
  "temple_hierarchy_description",
  "priesthood_description",
  "order_1",
  "order_1_description",
  "order_2",
  "order_2_description",
  "order_3",
  "order_3_description",
  "garments_overview",
  "laity_garb",
  "acolyte_garb",
  "ordained_garb",
  "senior_garb",
  "special_order_garb",
  "practices_overview",
  "holy_day_1_name",
  "holy_day_1_date",
  "holy_day_1_observed_by",
  "holy_day_1_description",
  "holy_day_2_name",
  "holy_day_2_date",
  "holy_day_2_observed_by",
  "holy_day_2_description",
  "customs_description",
  "rite_name",
  "rite_description",
  "taboo_1",
  "taboo_2",
  "taboo_3",
  "notes",
].filter(Boolean);

function isFilledFrontmatterValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(isFilledFrontmatterValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(isFilledFrontmatterValue);
  return true;
}

export function getDeityCompletion(frontmatter: Record<string, unknown>): DeityCompletion | null {
  if (String(frontmatter.type || "").trim().toLowerCase() !== "deity") return null;
  const total = DEITY_COMPLETION_KEYS.length;
  const filled = DEITY_COMPLETION_KEYS.reduce((count, key) => count + (isFilledFrontmatterValue(frontmatter[key]) ? 1 : 0), 0);
  const ratio = total > 0 ? filled / total : 0;
  return { filled, total, ratio, isStub: ratio < 0.5 };
}

function extractNodeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const cast = node as { type?: string; value?: string; children?: unknown[] };
  if (cast.type === "text" && typeof cast.value === "string") return cast.value;
  if (Array.isArray(cast.children)) {
    return cast.children.map((child) => extractNodeText(child)).join("");
  }
  return "";
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

function listAssetFiles(rootDir: string) {
  const out: string[] = [];
  function visit(dirPath: string) {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (item.name === "_derived" || item.name === "_registry" || item.name === ".gitkeep") continue;
      const nextPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        visit(nextPath);
        continue;
      }
      if (IMAGE_EXTENSIONS.has(path.extname(item.name).toLowerCase())) out.push(nextPath);
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

function getAssetPathIndex() {
  if (assetPathIndex) return assetPathIndex;
  assetPathIndex = listAssetFiles(CONTENT_ROOT).map((filePath) => {
    const relativePath = path.relative(CONTENT_ROOT, filePath).replace(/\\/g, "/");
    return {
      relativePath,
      fileName: path.posix.basename(relativePath),
    };
  });
  return assetPathIndex;
}

function buildContentAssetHref(relativePath: string) {
  return `/content-assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function parseObsidianImageEmbed(value: string) {
  const match = String(value).trim().match(/^!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
  if (!match) return null;
  return {
    target: match[1].trim(),
    caption: match[2]?.trim() || null,
  };
}

function resolveContentImage(rawValue: unknown, sourceRelativePath: string) {
  if (typeof rawValue !== "string") return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;

  const embed = parseObsidianImageEmbed(trimmed);
  if (!embed) return null;

  const targetName = embed.target.replace(/\\/g, "/").split("/").pop();
  if (!targetName) return null;

  const sourceDir = path.posix.dirname(sourceRelativePath.replace(/\\/g, "/"));
  const assetIndex = getAssetPathIndex();
  const siblingMatch = assetIndex.find(
    (entry) => path.posix.dirname(entry.relativePath) === sourceDir && entry.fileName === targetName,
  );
  const sharedImageMatch = siblingMatch
    ? null
    : assetIndex.find((entry) => entry.relativePath.startsWith("_images/") && entry.fileName === targetName);
  const globalMatch = siblingMatch || sharedImageMatch || assetIndex.find((entry) => entry.fileName === targetName);
  return globalMatch ? buildContentAssetHref(globalMatch.relativePath) : null;
}

function readEntryImage(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!MARKDOWN_EXTENSIONS.has(ext)) return undefined;
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseMatterSafe(raw);
  const relativePath = path.relative(CONTENT_ROOT, filePath).replace(/\\/g, "/");
  const imageFields = [
    "image_card",
    "image_banner",
    "image_avatar",
    "image_heraldry",
    "image",
    "arms_image",
    "image_map",
  ] as const;

  for (const field of imageFields) {
    const resolved = resolveContentImage(parsed.data[field], relativePath);
    if (resolved) return resolved;
  }

  return undefined;
}

function readDerivedJson<T>(fileName: string): T[] {
  const filePath = path.join(NAVBOX_DERIVED_ROOT, fileName);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T[];
}

function readDerivedObject<T>(relativePath: string): T | null {
  const filePath = path.join(CONTENT_ROOT, "_derived", relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
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

function getDerivedDeityRelationIndex() {
  if (derivedDeityRelationIndex) return derivedDeityRelationIndex;
  derivedDeityRelationIndex =
    readDerivedObject<Record<string, DerivedDeityRelations>>("sidebar/deities/_relations.json") || {};
  return derivedDeityRelationIndex;
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
    imageSrc: readEntryImage(filePath),
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
    imageSrc: indexFile ? readEntryImage(indexFile) : undefined,
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

function preprocessMarkdown(markdown: string, frontmatter: Record<string, unknown>, sourceRelativePath?: string) {
  return cleanupInterpolatedMarkdown(
    interpolateFrontmatterTokens(markdown, frontmatter)
  )
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

function rehypeCodexHeadings() {
  return (tree: object) => {
    const usedIds = new Set<string>();

    visit(tree as Parameters<typeof visit>[0], "element", (node: {
      tagName?: string;
      properties?: Record<string, unknown>;
      children?: unknown[];
    }) => {
      if (!node.tagName || !/^h[2-4]$/.test(node.tagName)) return;

      const text = extractNodeText(node).trim();
      if (!text) return;

      let id = slugifySegment(text) || "section";
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${slugifySegment(text) || "section"}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);

      node.properties = {
        ...(node.properties || {}),
        id,
        "data-outline-target": "true",
        "data-outline-level": node.tagName.replace("h", ""),
        "data-outline-label": text,
      };
    });
  };
}

async function renderMarkdown(
  markdown: string,
  frontmatter: Record<string, unknown>,
  sourceRelativePath?: string,
) {
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCodexLinks)
    .use(remarkRehype)
    .use(rehypeCodexHeadings)
    .use(rehypeStringify)
    .process(preprocessMarkdown(markdown, frontmatter, sourceRelativePath));
  return String(processed);
}

export function getSearchableArticles(): SearchableArticle[] {
  return getDerivedArticleIndex().map((article) => ({
    title: article.title,
    href: article.href,
    section: article.section,
    aliases: article.aliases,
  }));
}

export function getArticlePreviewByHref(href: string): RelatedArticlePreview | null {
  const article = getDerivedArticleIndex().find((entry) => entry.href === href);
  if (!article?.href) return null;

  const absolutePath = path.join(CONTENT_ROOT, article.source_relative_path);
  const imageSrc = fs.existsSync(absolutePath) ? readEntryImage(absolutePath) : undefined;
  const sourcePath = `content/${article.source_relative_path}`;
  const deitySidebar = getDeitySidebar(sourcePath);
  const nationSidebar = deitySidebar ? null : getNationSidebar(sourcePath);

  return {
    title: article.title,
    href: article.href,
    subtitle: deitySidebar?.subtitle ?? nationSidebar?.subtitle ?? null,
    imageSrc,
  };
}

export function getDerivedDeityRelations(sourcePath: string): DerivedDeityRelations {
  const article = getDerivedArticle(sourcePath);
  if (!article) return {};
  return getDerivedDeityRelationIndex()[article.slug] || {};
}

export function mergeDerivedRelationValues(
  authored: unknown,
  inferred: string[] | undefined,
  sourceRelativePath: string,
) {
  const getLinkedHrefs = (value: string) =>
    resolveObsidianInlineParts(value, sourceRelativePath)
      .filter(
        (part): part is Extract<ObsidianInlinePart, { type: "link" }> =>
          part.type === "link" && Boolean(part.href),
      )
      .map((part) => part.href as string);

  const explicit = normalizeStringArray(authored);
  const explicitHrefs = new Set(explicit.flatMap((value) => getLinkedHrefs(value)));

  const merged = [...explicit];
  for (const value of normalizeStringArray(inferred)) {
    const inferredHrefs = getLinkedHrefs(value);
    if (inferredHrefs.some((href) => explicitHrefs.has(href))) continue;
    if (!merged.includes(value)) merged.push(value);
  }

  return merged;
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
    normalizeObsidianDisplayText(String(parsed.data.name || "")) ||
    normalizeObsidianDisplayText(readFirstHeading(parsed.content) || "") ||
    normalizeObsidianDisplayText(readFirstNonEmptyLine(parsed.content)?.replace(/^#+\s*/, "") || "") ||
    titleFromFileName(path.basename(filePath));
  const summary =
    (typeof parsed.data.summary === "string" && normalizeObsidianText(parsed.data.summary)) ||
    readFirstNonEmptyLine(parsed.content) ||
    section.summary;
  const relativePath = path.relative(getSectionRoot(section), filePath).replace(/\\/g, "/");
  const html = await renderMarkdown(parsed.content, parsed.data as Record<string, unknown>, `${section.folder}/${relativePath}`);

  const frontmatter = parsed.data as Record<string, unknown>;
  return {
    title,
    summary,
    html,
    sourcePath: `content/${section.folder}/${relativePath}`,
    breadcrumb: buildBreadcrumb(section, slugParts),
    frontmatter,
    world: readWorld(frontmatter),
    infobox: readInfobox(frontmatter),
    hemisphereViews: readHemisphereViews(frontmatter),
  };
}

export async function getRenderedOverviewDocument(section: SectionConfig, slugParts: string[]): Promise<RenderedDocument | null> {
  const filePath = findOverviewMarkdownFile(section, slugParts);
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseMatterSafe(raw);
  const title =
    normalizeObsidianDisplayText(String(parsed.data.title || "")) ||
    normalizeObsidianDisplayText(String(parsed.data.name || "")) ||
    normalizeObsidianDisplayText(readFirstHeading(parsed.content) || "") ||
    normalizeObsidianDisplayText(readFirstNonEmptyLine(parsed.content)?.replace(/^#+\s*/, "") || "") ||
    titleFromFileName(path.basename(filePath));
  const summary =
    (typeof parsed.data.summary === "string" && normalizeObsidianText(parsed.data.summary)) ||
    readFirstNonEmptyLine(parsed.content) ||
    section.summary;
  const relativePath = path.relative(getSectionRoot(section), filePath).replace(/\\/g, "/");
  const html = await renderMarkdown(parsed.content, parsed.data as Record<string, unknown>, `${section.folder}/${relativePath}`);

  const frontmatter = parsed.data as Record<string, unknown>;
  return {
    title,
    summary,
    html,
    sourcePath: `content/${section.folder}/${relativePath}`,
    breadcrumb: buildBreadcrumb(section, slugParts),
    frontmatter,
    world: readWorld(frontmatter),
    infobox: readInfobox(frontmatter),
    hemisphereViews: readHemisphereViews(frontmatter),
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
