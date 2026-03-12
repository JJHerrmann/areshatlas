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
  href: string;
  domain: string;
  summary: string;
};

const CONTENT_ROOT = path.join(process.cwd(), "content");

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

export function getSectionEntries(section: SectionConfig): ContentEntry[] {
  const sectionDir = path.join(CONTENT_ROOT, section.folder);
  if (!fs.existsSync(sectionDir)) {
    return [];
  }

  const entries: ContentEntry[] = [];

  function visit(dirPath: string, folderParts: string[]) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name === ".gitkeep") continue;
      const nextPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const relativeFolder = [...folderParts, item.name].join(" / ");
        entries.push({
          title: item.name,
          href: `/${section.slug}`,
          domain: relativeFolder,
          summary: `Folder in ${section.folder} containing mirrored codex material.`,
        });
        visit(nextPath, [...folderParts, item.name]);
        continue;
      }
      const ext = path.extname(item.name).toLowerCase();
      if (ext !== ".md" && ext !== ".markdown" && ext !== ".csv") continue;
      const relativeParts = folderParts.length ? folderParts.join(" / ") : section.folder;
      let summary = `Mirrored source entry in ${relativeParts}.`;
      if (ext === ".md" || ext === ".markdown") {
        const raw = fs.readFileSync(nextPath, "utf8");
        const excerpt = readFirstNonEmptyLine(raw);
        if (excerpt) summary = excerpt;
      }
      entries.push({
        title: titleFromFileName(item.name),
        href: `/${section.slug}`,
        domain: relativeParts,
        summary,
      });
    }
  }

  visit(sectionDir, []);
  return entries.sort((a, b) => a.title.localeCompare(b.title));
}
