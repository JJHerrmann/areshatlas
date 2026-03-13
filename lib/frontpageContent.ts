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
      eyebrow: "Survey Archive of Aresh",
      title: "The Natural and Geographic Survey of Aresh",
      subtitle:
        "A codex of lands, peoples, creatures, relics, and divine influences, presented in the manner of a pre-industrial cartographic archive.",
      bodyHtml: "<p>Aresh awaits its first formal frontpage folio.</p>",
      plaqueLabels: ["Herodetus Darwin", "Line of Ashen", "Halls of Shekelarmesh"],
      logoPath: null,
      logoAlt: "Aresh Atlas logo",
      logoCaption: null,
      bannerPath: null,
      bannerAlt: "Aresh Atlas hero banner",
      bannerCaption: null,
    };
  }

  const raw = fs.readFileSync(HERO_PATH, "utf8");
  const parsed = matter(raw);
  return {
    eyebrow: String(parsed.data.eyebrow || "Survey Archive of Aresh"),
    title: String(parsed.data.title || "The Natural and Geographic Survey of Aresh"),
    subtitle: String(
      parsed.data.subtitle ||
        "A codex of lands, peoples, creatures, relics, and divine influences, presented in the manner of a pre-industrial cartographic archive.",
    ),
    bodyHtml: await renderMarkdown(parsed.content || ""),
    plaqueLabels: Array.isArray(parsed.data.plaque_labels)
      ? parsed.data.plaque_labels.map((item: unknown) => String(item))
      : ["Herodetus Darwin", "Line of Ashen", "Halls of Shekelarmesh"],
    logoPath: parsed.data.logo_path ? String(parsed.data.logo_path) : null,
    logoAlt: String(parsed.data.logo_alt || "Aresh Atlas logo"),
    logoCaption: parsed.data.logo_caption ? String(parsed.data.logo_caption) : null,
    bannerPath: parsed.data.banner_path ? String(parsed.data.banner_path) : null,
    bannerAlt: String(parsed.data.banner_alt || "Aresh Atlas hero banner"),
    bannerCaption: parsed.data.banner_caption ? String(parsed.data.banner_caption) : null,
  };
}
