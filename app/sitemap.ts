import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://www.areshatlas.com";

const SECTIONS = [
  "pantheon",
  "regions",
  "cultures",
  "languages",
  "relics",
  "creatures",
  "chronicles",
];

type ArticleEntry = {
  slug: string;
  title: string;
  section: string;
  href: string;
};

export default function sitemap(): MetadataRoute.Sitemap {
  const articlesPath = path.join(
    process.cwd(),
    "content",
    "_derived",
    "navboxes",
    "articles.json",
  );

  let articles: ArticleEntry[] = [];
  try {
    articles = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
  } catch {
    // articles.json not yet generated (fresh clone before prebuild runs)
  }

  return [
    { url: BASE_URL, priority: 1.0 },
    ...SECTIONS.map((slug) => ({
      url: `${BASE_URL}/${slug}`,
      priority: 0.8,
    })),
    ...articles
      .filter((article) => Boolean(article.href))
      .map((article) => ({
        url: `${BASE_URL}${article.href}`,
        priority: 0.6,
      })),
  ];
}
