import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const repoRoot = process.cwd();
const contentRoot = path.join(repoRoot, "content");
const derivedRoot = path.join(contentRoot, "_derived", "sidebar");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"]);

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

function listAssetFiles(rootDir) {
  const out = [];
  function visit(dirPath) {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (item.name === "_derived" || item.name === ".gitkeep") continue;
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

function optionalArray(value) {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function buildContentAssetHref(relativePath) {
  return `/content-assets/${relativePath.replace(/\\/g, "/").split("/").map(encodeURIComponent).join("/")}`;
}

function parseObsidianEmbed(value) {
  const match = String(value).trim().match(/^!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
  if (!match) return null;
  return {
    target: match[1].trim(),
    caption: match[2]?.trim() || null,
  };
}

function resolveImageSource(rawValue, sourceRelativePath, assetIndex) {
  if (!rawValue || typeof rawValue !== "string") return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return { src: trimmed, caption: null };

  const embed = parseObsidianEmbed(trimmed);
  if (embed) {
    const targetName = embed.target.replace(/\\/g, "/").split("/").pop();
    const sourceDir = path.posix.dirname(sourceRelativePath.replace(/\\/g, "/"));
    const siblingMatch = assetIndex.find(
      (entry) => path.posix.dirname(entry.relativePath) === sourceDir && path.posix.basename(entry.relativePath) === targetName,
    );
    const globalMatch = siblingMatch || assetIndex.find((entry) => path.posix.basename(entry.relativePath) === targetName);
    if (!globalMatch) return null;
    return {
      src: buildContentAssetHref(globalMatch.relativePath),
      caption: embed.caption,
    };
  }

  return { src: trimmed, caption: null };
}

function optionalImage(frontmatter, field, title, sourceRelativePath, assetIndex) {
  const resolved = resolveImageSource(frontmatter[field], sourceRelativePath, assetIndex);
  if (!resolved) return null;
  const suffix = field.replace("image_", "");
  const alt = frontmatter[`image_${suffix}_alt`];
  const caption = frontmatter[`image_${suffix}_caption`];
  return {
    src: resolved.src,
    alt: typeof alt === "string" && alt.trim() ? alt : title,
    caption: typeof caption === "string" && caption.trim() ? caption : resolved.caption,
  };
}

function buildNationSidebar(frontmatter, relativePath, assetIndex) {
  const title = String(frontmatter.name || frontmatter.title || path.basename(relativePath, path.extname(relativePath)));
  return {
    type: "nation",
    title,
    subtitle: frontmatter.formal_name || null,
    source_relative_path: relativePath.replace(/\\/g, "/"),
    images: {
      banner: optionalImage(frontmatter, "image_banner", title, relativePath, assetIndex),
      heraldry:
        optionalImage(frontmatter, "image_heraldry", title, relativePath, assetIndex) ||
        optionalImage(frontmatter, "arms_image", title, relativePath, assetIndex),
      map: optionalImage(frontmatter, "image_map", title, relativePath, assetIndex),
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

function buildDeitySidebar(frontmatter, relativePath, assetIndex) {
  const title = String(frontmatter.name || frontmatter.title || path.basename(relativePath, path.extname(relativePath)));
  return {
    type: "deity",
    title,
    subtitle: frontmatter.epithet || frontmatter.title || frontmatter.subtitle || null,
    source_relative_path: relativePath.replace(/\\/g, "/"),
    images: {
      banner: optionalImage(frontmatter, "image_banner", title, relativePath, assetIndex),
      heraldry: optionalImage(frontmatter, "image_heraldry", title, relativePath, assetIndex),
      avatar: optionalImage(frontmatter, "image_avatar", title, relativePath, assetIndex),
    },
    sections: [
      {
        title: "Descriptive Info",
        rows: [
          ["Pantheon", frontmatter.pantheon],
          ["Title", frontmatter.title],
          ["Gender", frontmatter.gender],
          ["Avatar", optionalArray(frontmatter.avatars || frontmatter.avatar)],
          ["Consort(s)", optionalArray(frontmatter.consorts || frontmatter.consort)],
          ["Allies", optionalArray(frontmatter.allies)],
          ["Foes", optionalArray(frontmatter.foes)],
        ],
      },
      {
        title: "Spiritual Info",
        rows: [
          ["Rank", frontmatter.divine_rank || frontmatter.rank],
          ["Nature", frontmatter.nature],
          ["Ethos", frontmatter.ethos],
          ["Major Influence", frontmatter.major_influence],
          ["Minor Influence(s)", optionalArray(frontmatter.minor_influences || frontmatter.minor_influence)],
          ["Spheres", optionalArray(frontmatter.spheres)],
        ],
      },
      {
        title: "Divine Relations",
        rows: [
          ["Parents", optionalArray(frontmatter.parents)],
          ["Siblings", optionalArray(frontmatter.siblings)],
          ["Offspring", optionalArray(frontmatter.offspring)],
          ["Dwelling Place", frontmatter.dwelling_place],
        ],
      },
      {
        title: "Symbols and Regalia",
        rows: [
          ["Primary Symbol", frontmatter.primary_symbol],
          ["Secondary Symbols", optionalArray(frontmatter.secondary_symbols)],
          ["Sacred Number", frontmatter.sacred_number],
          ["Sacred Colors", optionalArray(frontmatter.sacred_colors)],
          ["Forbidden Colors", optionalArray(frontmatter.forbidden_colors)],
          ["Sacred Stones", optionalArray(frontmatter.sacred_stones)],
          ["Sacred Objects", optionalArray(frontmatter.sacred_objects)],
          ["Sacred Weapons", optionalArray(frontmatter.sacred_weapons)],
        ],
      },
      {
        title: "Worship Info",
        rows: [
          ["Church Name", frontmatter.church_name],
          ["Central Authority", frontmatter.central_authority],
          ["Regional Titles", optionalArray(frontmatter.regional_titles)],
          ["Temple Titles", optionalArray(frontmatter.temple_titles)],
          ["Clergy Titles", optionalArray(frontmatter.clergy_titles)],
          ["Religious Orders", optionalArray(frontmatter.religious_orders)],
          ["Holy Texts", optionalArray(frontmatter.holy_texts)],
          ["Apocrypha", optionalArray(frontmatter.apocrypha)],
          ["Holy Days", optionalArray(frontmatter.holy_days)],
          ["Taboos", optionalArray(frontmatter.taboos)],
        ],
      },
      {
        title: "Moral and Ritual Life",
        rows: [
          ["Virtues", optionalArray(frontmatter.virtues)],
          ["Vices", optionalArray(frontmatter.vices)],
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
  const assetIndex = listAssetFiles(contentRoot).map((filePath) => ({
    absolutePath: filePath,
    relativePath: path.relative(contentRoot, filePath).replace(/\\/g, "/"),
  }));
  const writtenFiles = new Set();
  const skippedFiles = [];

  for (const filePath of markdownFiles) {
    const raw = fs.readFileSync(filePath, "utf8");
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      skippedFiles.push({
        relativePath: path.relative(contentRoot, filePath).replace(/\\/g, "/"),
        reason: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    const frontmatter = parsed.data || {};
    const relativePath = path.relative(contentRoot, filePath);

    let sidebarDir = null;
    let payload = null;

    if (frontmatter.type === "nation") {
      sidebarDir = path.join(derivedRoot, "nations");
      payload = buildNationSidebar(frontmatter, relativePath, assetIndex);
    } else if (frontmatter.type === "deity") {
      sidebarDir = path.join(derivedRoot, "deities");
      payload = buildDeitySidebar(frontmatter, relativePath, assetIndex);
    }

    if (!sidebarDir || !payload) continue;

    ensureDir(sidebarDir);
    const outPath = path.join(sidebarDir, `${buildEntrySlug(relativePath)}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    writtenFiles.add(outPath);
  }

  for (const folderName of ["nations", "deities"]) {
    const sidebarDir = path.join(derivedRoot, folderName);
    if (fs.existsSync(sidebarDir)) {
      for (const item of fs.readdirSync(sidebarDir, { withFileTypes: true })) {
        if (!item.isFile() || path.extname(item.name).toLowerCase() !== ".json") continue;
        const candidate = path.join(sidebarDir, item.name);
        if (!writtenFiles.has(candidate)) fs.rmSync(candidate);
      }
    }
  }

  process.stdout.write(`[codex-derived] generated ${writtenFiles.size} sidebar json file(s)\n`);
  if (skippedFiles.length) {
    for (const skipped of skippedFiles) {
      process.stdout.write(`[codex-derived] skipped ${skipped.relativePath}: ${skipped.reason}\n`);
    }
  }
}

main();
