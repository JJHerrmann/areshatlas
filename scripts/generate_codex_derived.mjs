import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const repoRoot = process.cwd();
const contentRoot = path.join(repoRoot, "content");
const derivedRoot = path.join(contentRoot, "_derived", "sidebar");

function toSlugPart(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEntrySlug(relativePath) {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/\.(md|markdown)$/i, "")
    .split("/")
    .filter(Boolean)
    .map(toSlugPart)
    .join("__");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listMarkdownFiles(rootDir) {
  const out = [];
  function visit(dirPath) {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (item.name === "_derived" || item.name === ".gitkeep") continue;
      const nextPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        visit(nextPath);
        continue;
      }
      if (/\.(md|markdown)$/i.test(item.name)) out.push(nextPath);
    }
  }
  if (fs.existsSync(rootDir)) visit(rootDir);
  return out;
}

function optionalArray(value) {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function optionalImage(frontmatter, field, title) {
  const src = frontmatter[field];
  if (!src || typeof src !== "string") return null;
  const suffix = field.replace("image_", "");
  const alt = frontmatter[`image_${suffix}_alt`];
  const caption = frontmatter[`image_${suffix}_caption`];
  return {
    src,
    alt: typeof alt === "string" && alt.trim() ? alt : title,
    caption: typeof caption === "string" && caption.trim() ? caption : null,
  };
}

function buildNationSidebar(frontmatter, relativePath) {
  const title = String(frontmatter.name || frontmatter.title || path.basename(relativePath, path.extname(relativePath)));
  return {
    type: "nation",
    title,
    subtitle: frontmatter.formal_name || null,
    source_relative_path: relativePath.replace(/\\/g, "/"),
    images: {
      banner: optionalImage(frontmatter, "image_banner", title),
      heraldry: optionalImage(frontmatter, "image_heraldry", title),
      map: optionalImage(frontmatter, "image_map", title),
    },
    sections: [
      {
        title: "Identity",
        rows: [
          ["Name", frontmatter.name],
          ["Formal Name", frontmatter.formal_name],
          ["Arms", frontmatter.arms],
        ],
      },
      {
        title: "Geographic Info",
        rows: [
          ["Continent", frontmatter.continent],
          ["Location", frontmatter.location],
        ],
      },
      {
        title: "Government",
        rows: [
          ["Government Type", frontmatter.government_type],
          ["Hierarchy", optionalArray(frontmatter.hierarchy)],
          ["Ruler", frontmatter.ruler],
          ["Capital", frontmatter.capital],
          ["Capital Population", frontmatter.capital_population],
          ["Alliances", optionalArray(frontmatter.alliances)],
          ["Hostilities", optionalArray(frontmatter.hostilities)],
        ],
      },
      {
        title: "Economy",
        rows: [
          ["Coinage", frontmatter.coinage],
          ["Mythus Standard", frontmatter.mythus_standard],
        ],
      },
      {
        title: "Society",
        rows: [
          ["Population", frontmatter.population],
          [
            "Ancestry Breakdown",
            {
              dwarven: frontmatter.population_dwarven,
              human: frontmatter.population_human,
              hobbit: frontmatter.population_hobbit,
              halfling: frontmatter.population_halfling,
              other: frontmatter.population_other,
            },
          ],
          ["Languages", optionalArray(frontmatter.languages)],
          ["Important Persons", optionalArray(frontmatter.important_persons)],
        ],
      },
      {
        title: "Religious Info",
        rows: [
          ["Pantheon", frontmatter.pantheon],
          ["Patron", frontmatter.patron],
        ],
      },
      {
        title: "Game Info",
        rows: [
          ["Cultural Templates", optionalArray(frontmatter.cultural_templates)],
          ["Map", frontmatter.map],
        ],
      },
    ].map((section) => ({
      ...section,
      rows: section.rows.filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === "object") {
          return Object.values(value).some((item) => item != null && item !== "");
        }
        return value != null && value !== "";
      }),
    })).filter((section) => section.rows.length > 0),
  };
}

function main() {
  ensureDir(derivedRoot);
  const markdownFiles = listMarkdownFiles(contentRoot);
  const writtenFiles = new Set();

  for (const filePath of markdownFiles) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = matter(raw);
    const frontmatter = parsed.data || {};
    const relativePath = path.relative(contentRoot, filePath);

    if (frontmatter.type !== "nation") continue;

    const sidebarDir = path.join(derivedRoot, "nations");
    ensureDir(sidebarDir);
    const outPath = path.join(sidebarDir, `${buildEntrySlug(relativePath)}.json`);
    const payload = buildNationSidebar(frontmatter, relativePath);
    fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    writtenFiles.add(outPath);
  }

  const nationDir = path.join(derivedRoot, "nations");
  if (fs.existsSync(nationDir)) {
    for (const item of fs.readdirSync(nationDir, { withFileTypes: true })) {
      if (!item.isFile() || path.extname(item.name).toLowerCase() !== ".json") continue;
      const candidate = path.join(nationDir, item.name);
      if (!writtenFiles.has(candidate)) fs.rmSync(candidate);
    }
  }

  process.stdout.write(`[codex-derived] generated ${writtenFiles.size} sidebar json file(s)\n`);
}

main();
