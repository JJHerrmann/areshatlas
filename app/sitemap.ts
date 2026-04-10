import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { sections } from "@/lib/codexContent";

const BASE_URL = "https://www.areshatlas.com";
const CONTENT_ROOT = path.join(process.cwd(), "content");

type ArticleEntry = {
  slug: string;
  title: string;
  section: string;
  href: string;
  source_relative_path?: string;
};

type SitemapEntry = MetadataRoute.Sitemap[number];
type SectionConfig = (typeof sections)[number];

function slugifySegment(value: string) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAbsoluteUrl(href: string) {
  return href === "/" ? BASE_URL : `${BASE_URL}${href}`;
}

function getModifiedDate(filePath: string) {
  try {
    return fs.statSync(filePath).mtime;
  } catch {
    return undefined;
  }
}

function getArticles(): ArticleEntry[] {
  const articlesPath = path.join(CONTENT_ROOT, "_derived", "navboxes", "articles.json");
  let articles: ArticleEntry[] = [];
  try {
    articles = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
  } catch {
    // articles.json not yet generated (fresh clone before prebuild runs)
  }
  return articles;
}

function findOverviewFile(dirPath: string) {
  const folderName = path.basename(dirPath);
  const candidates = [`${folderName}.md`, `${folderName}.markdown`];
  return candidates
    .map((candidate) => path.join(dirPath, candidate))
    .find((candidate) => fs.existsSync(candidate));
}

function getDirectoryEntries(section: SectionConfig): SitemapEntry[] {
  const rootDir = path.join(CONTENT_ROOT, section.folder);
  if (!fs.existsSync(rootDir)) return [];

  const entries: SitemapEntry[] = [];

  function visit(dirPath: string) {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      if (item.name.startsWith("_") || item.name === ".gitkeep") continue;

      const childPath = path.join(dirPath, item.name);
      const relativePath = path.relative(rootDir, childPath).replace(/\\/g, "/");
      const routeTail = relativePath
        .split("/")
        .filter(Boolean)
        .map(slugifySegment)
        .map(encodeURIComponent)
        .join("/");

      const href = routeTail ? `/${section.slug}/${routeTail}` : `/${section.slug}`;
      const overviewFile = findOverviewFile(childPath);
      entries.push({
        url: buildAbsoluteUrl(href),
        lastModified: getModifiedDate(overviewFile || childPath),
        priority: 0.7,
      });

      visit(childPath);
    }
  }

  visit(rootDir);
  return entries;
}

function dedupeEntries(entries: SitemapEntry[]) {
  const deduped = new Map<string, SitemapEntry>();

  for (const entry of entries) {
    const existing = deduped.get(entry.url);
    if (!existing) {
      deduped.set(entry.url, entry);
      continue;
    }

    deduped.set(entry.url, {
      ...existing,
      ...entry,
      priority: Math.max(existing.priority ?? 0, entry.priority ?? 0),
      lastModified:
        existing.lastModified && entry.lastModified
          ? new Date(
              Math.max(
                new Date(existing.lastModified).getTime(),
                new Date(entry.lastModified).getTime(),
              ),
            )
          : entry.lastModified ?? existing.lastModified,
    });
  }

  return [...deduped.values()].sort((a, b) => a.url.localeCompare(b.url));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getArticles();

  return dedupeEntries([
    {
      url: BASE_URL,
      lastModified: getModifiedDate(path.join(process.cwd(), "app", "page.tsx")),
      priority: 1.0,
    },
    ...sections.map((section) => ({
      url: buildAbsoluteUrl(`/${section.slug}`),
      lastModified: getModifiedDate(path.join(CONTENT_ROOT, section.folder)),
      priority: 0.9,
    })),
    ...sections.flatMap((section) => getDirectoryEntries(section)),
    ...articles
      .filter((article) => Boolean(article.href))
      .map((article) => ({
        url: buildAbsoluteUrl(article.href),
        lastModified: article.source_relative_path
          ? getModifiedDate(path.join(CONTENT_ROOT, article.source_relative_path))
          : undefined,
        priority: 0.6,
      })),
  ]);
}
