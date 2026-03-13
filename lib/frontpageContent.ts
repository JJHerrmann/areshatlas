import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

export type FrontpageHero = {
  eyebrow: string;
  title: string;
  subtitle: string;
  systemLine: string;
  bodyHtml: string;
  plaqueLabels: string[];
  logoPath: string | null;
  logoAlt: string;
  logoCaption: string | null;
  bannerPath: string | null;
  bannerAlt: string;
  bannerCaption: string | null;
};

const HERO_PATH = path.join(process.cwd(), "content", "frontpage", "hero.md");

async function renderMarkdown(markdown: string) {
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);
  return String(processed);
}

export async function getFrontpageHero(): Promise<FrontpageHero> {
  if (!fs.existsSync(HERO_PATH)) {
    return {
      eyebrow: "Survey Archive of Areshnaat",
      title: "The Natural and Geographic Survey of Areshnaat",
      subtitle:
        "Atlas, archive, and field record of the world of Areshnaat.",
      systemLine: "A Campaign Setting for | Dungeons and Dragons 5e | Dungeons and Dragons 5.5e | GURPS",
      bodyHtml:
        "<p>A codex of lands, peoples, creatures, relics, and divine influences, presented in the manner of a pre-industrial cartographic archive.</p>",
      plaqueLabels: ["Herodetus Darwin", "Line of Ashen", "Halls of Shekelarmesh"],
      logoPath: "/branding/wiki-logo.png",
      logoAlt: "Areshnaat wiki logo",
      logoCaption: null,
      bannerPath: "/branding/hero-banner.svg",
      bannerAlt: "Banner view of Areshnaat",
      bannerCaption: null,
    };
  }

  const raw = fs.readFileSync(HERO_PATH, "utf8");
  const parsed = matter(raw);
  return {
    eyebrow: String(parsed.data.eyebrow || "Survey Archive of Areshnaat"),
    title: String(parsed.data.title || "The Natural and Geographic Survey of Areshnaat"),
    subtitle: String(
      parsed.data.subtitle ||
        "Atlas, archive, and field record of the world of Areshnaat.",
    ),
    systemLine: String(
      parsed.data.system_line ||
        "A Campaign Setting for | Dungeons and Dragons 5e | Dungeons and Dragons 5.5e | GURPS",
    ),
    bodyHtml: await renderMarkdown(parsed.content || ""),
    plaqueLabels: Array.isArray(parsed.data.plaque_labels)
      ? parsed.data.plaque_labels.map((item: unknown) => String(item))
      : ["Herodetus Darwin", "Line of Ashen", "Halls of Shekelarmesh"],
    logoPath: parsed.data.logo_path ? String(parsed.data.logo_path) : "/branding/wiki-logo.png",
    logoAlt: String(parsed.data.logo_alt || "Areshnaat wiki logo"),
    logoCaption: parsed.data.logo_caption ? String(parsed.data.logo_caption) : null,
    bannerPath: parsed.data.banner_path ? String(parsed.data.banner_path) : "/branding/hero-banner.svg",
    bannerAlt: String(parsed.data.banner_alt || "Banner view of Areshnaat"),
    bannerCaption: parsed.data.banner_caption ? String(parsed.data.banner_caption) : null,
  };
}
