import fs from "node:fs";
import path from "node:path";

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

const CONTENT_ROOT = path.join(process.cwd(), "content");
const ALLOWED_ENTRY_EXTENSIONS = new Set([".md", ".markdown", ".csv"]);

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

function toTitle(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSafeSectionPath(section: SectionConfig, slugParts: string[] = []) {
  const basePath = path.join(CONTENT_ROOT, section.folder);
  const targetPath = path.join(basePath, ...slugParts);
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    return null;
  }
  return resolvedTarget;
}

function readSummary(filePath: string, fallback: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_ENTRY_EXTENSIONS.has(ext)) return fallback;
  if (ext === ".csv") return fallback;
  const raw = fs.readFileSync(filePath, "utf8");
  return readFirstNonEmptyLine(raw) || fallback;
}

function createFileEntry(
  section: SectionConfig,
  filePath: string,
  domain: string,
): ContentEntry {
  const fileName = path.basename(filePath);
  return {
    title: titleFromFileName(fileName),
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
    entries.push(createFileEntry(section, itemPath, domain));
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

  return createFileEntry(section, indexFile, slugParts.join(" / "));
}

export function getSectionEntryCount(section: SectionConfig) {
  return getSectionEntries(section).length;
}

export function getSectionView(section: SectionConfig, slugParts: string[] = []): SectionView | null {
  const dirPath = getSafeSectionPath(section, slugParts);
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const breadcrumb = [
    { title: section.title, href: `/${section.slug}` },
    ...slugParts.map((part, index) => ({
      title: toTitle(part),
      href: `/${section.slug}/${slugParts.slice(0, index + 1).map(encodeURIComponent).join("/")}`,
    })),
  ];

  return {
    sourcePath: `content/${section.folder}${slugParts.length ? `/${slugParts.join("/")}` : ""}`,
    breadcrumb,
    overview: getSectionOverview(section, slugParts),
    entries: getSectionEntries(section, slugParts),
  };
}
