import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const repoRoot = process.cwd();
const contentRoot = path.join(repoRoot, "content");
const derivedRoot = path.join(contentRoot, "_derived", "sidebar");
const navboxRegistryRoot = path.join(repoRoot, "codex_registry", "navboxes");
const navboxDerivedRoot = path.join(contentRoot, "_derived", "navboxes");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"]);
const deriveWarnings = [];
const sections = [
  { slug: "pantheon", folder: "gods" },
  { slug: "regions", folder: "regions" },
  { slug: "cultures", folder: "cultures" },
  { slug: "languages", folder: "cultures/language" },
  { slug: "relics", folder: "relics" },
  { slug: "creatures", folder: "creatures" },
  { slug: "chronicles", folder: "chronicles" },
];

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
      if (item.name === "_derived" || item.name === "_registry" || item.name === ".gitkeep") continue;
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

function optionalArray(value) {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeStringArray(value) {
  return optionalArray(value)
    .flatMap((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const normalized = String(item).trim();
        return normalized ? [normalized] : [];
      }
      return [];
    });
}

function titleFromFileName(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function getSectionForRelativePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  return [...sections]
    .sort((a, b) => b.folder.length - a.folder.length)
    .find((section) => normalized === section.folder || normalized.startsWith(`${section.folder}/`)) || null;
}

function contentRelativePathToHref(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\.(md|markdown)$/i, "");
  const section = getSectionForRelativePath(normalized);
  if (!section) return null;

  const tail = normalized === section.folder ? "" : normalized.slice(section.folder.length + 1);
  const segments = tail ? tail.split("/").filter(Boolean) : [];
  if (segments.length === 1 && toSlugPart(segments[0]) === toSlugPart(path.basename(section.folder))) {
    return `/${section.slug}`;
  }
  if (segments.length >= 2 && toSlugPart(segments[segments.length - 1]) === toSlugPart(segments[segments.length - 2])) {
    segments.pop();
  }
  const routeTail = segments.map(toSlugPart).map(encodeURIComponent).join("/");
  return routeTail ? `/${section.slug}/${routeTail}` : `/${section.slug}`;
}

function buildArticleRecord(frontmatter, relativePath) {
  const normalizedRelativePath = relativePath.replace(/\\/g, "/");
  const section = getSectionForRelativePath(normalizedRelativePath);
  if (!section) return null;

  const fileName = path.basename(normalizedRelativePath);
  const title = String(frontmatter.title || frontmatter.name || titleFromFileName(fileName)).trim();
  const slug = String(frontmatter.slug || toSlugPart(titleFromFileName(fileName))).trim();
  const aliases = normalizeStringArray(frontmatter.aliases).map(toSlugPart);
  const navboxes = normalizeStringArray(frontmatter.navboxes).map(toSlugPart);
  const href = contentRelativePathToHref(normalizedRelativePath);

  return {
    slug: toSlugPart(slug),
    title,
    section: String(frontmatter.section || section.slug).trim(),
    href,
    source_relative_path: normalizedRelativePath,
    aliases,
    navboxes,
    entry_type: String(frontmatter.type || "").trim().toLowerCase(),
    frontmatter,
  };
}

function sortNavboxItems(items) {
  return [...items].sort((a, b) => a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug));
}

function articleMatchesDeriveRule(article, derive) {
  if (!derive || typeof derive !== "object") return false;

  const requiredType = String(derive.type || "").trim().toLowerCase();
  if (requiredType && article.entry_type !== requiredType) return false;

  const requiredSection = String(derive.section || "").trim().toLowerCase();
  if (requiredSection && String(article.section || "").trim().toLowerCase() !== requiredSection) return false;

  const pathPrefix = String(derive.pathPrefix || derive.path_prefix || "").trim().replace(/\\/g, "/").toLowerCase();
  if (pathPrefix && !article.source_relative_path.toLowerCase().startsWith(pathPrefix.replace(/^\/+/, ""))) return false;

  const field = String(derive.field || "").trim();
  if (!field) return true;

  const requiredValue = toSlugPart(derive.equals ?? derive.value ?? "");
  if (!requiredValue) return false;

  const rawFieldValue = article.frontmatter?.[field];
  const values = normalizeStringArray(rawFieldValue).map(toSlugPart);
  return values.includes(requiredValue);
}

function listJsonFiles(rootDir) {
  const out = [];
  function visit(dirPath) {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (item.name === ".gitkeep") continue;
      const nextPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        visit(nextPath);
        continue;
      }
      if (path.extname(item.name).toLowerCase() === ".json") out.push(nextPath);
    }
  }
  if (fs.existsSync(rootDir)) visit(rootDir);
  return out;
}

function buildNavboxData(markdownFiles) {
  const articles = [];
  const articleBySlug = new Map();
  const articleKeyToSlug = new Map();

  for (const filePath of markdownFiles) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = matter(raw);
    const relativePath = path.relative(contentRoot, filePath);
    const article = buildArticleRecord(parsed.data || {}, relativePath);
    if (!article) continue;

    if (articleBySlug.has(article.slug)) {
      throw new Error(`Duplicate article slug "${article.slug}" found in ${article.source_relative_path}`);
    }

    for (const key of [article.slug, ...article.aliases]) {
      if (articleKeyToSlug.has(key)) {
        throw new Error(`Duplicate article slug/alias "${key}" found in ${article.source_relative_path}`);
      }
      articleKeyToSlug.set(key, article.slug);
    }

    articleBySlug.set(article.slug, article);
    articles.push(article);
  }

  const navboxRegistryFiles = listJsonFiles(navboxRegistryRoot);
  const navboxRegistry = navboxRegistryFiles.map((filePath) => {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const id = toSlugPart(parsed.id || "");
    if (!id) {
      throw new Error(`Navbox registry file ${path.relative(repoRoot, filePath)} is missing a valid id`);
    }
    const title = String(parsed.title || id).trim();
    const mode = String(parsed.mode || "footer").trim();
    const resolveNavboxItems = (rawValues) => normalizeStringArray(rawValues).map(toSlugPart).map((key) => {
      const resolvedSlug = articleKeyToSlug.get(key);
      if (!resolvedSlug) {
        throw new Error(`Navbox "${id}" references unknown article slug/alias "${key}"`);
      }
      const article = articleBySlug.get(resolvedSlug);
      if (!article || !article.href) {
        throw new Error(`Navbox "${id}" references article "${resolvedSlug}" that cannot be routed`);
      }
      return {
        slug: article.slug,
        title: article.title,
        href: article.href,
      };
    });
    const derivedItems = parsed.derive
      ? articles
          .filter((article) => article.href && articleMatchesDeriveRule(article, parsed.derive))
          .map((article) => ({
            slug: article.slug,
            title: article.title,
            href: article.href,
          }))
      : [];
    const items = sortNavboxItems(derivedItems.length ? derivedItems : resolveNavboxItems(parsed.items));
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups.map((group, index) => {
          const label = String(group?.label || group?.title || `Group ${index + 1}`).trim();
          return {
            label,
            items: sortNavboxItems(resolveNavboxItems(group?.items)),
          };
        }).filter((group) => group.items.length > 0)
      : [];

    return {
      id,
      title,
      mode,
      items,
      groups,
      derived_from_rule: Boolean(parsed.derive),
    };
  });

  const navboxById = new Map(navboxRegistry.map((navbox) => [navbox.id, navbox]));

  for (const article of articles) {
    const inferredNavboxes = navboxRegistry
      .filter((navbox) => navbox.items.some((item) => item.slug === article.slug))
      .map((navbox) => navbox.id);
    article.navboxes = [...new Set([...article.navboxes, ...inferredNavboxes])]
      .filter((navboxId) => {
        const navbox = navboxById.get(navboxId);
        return navbox ? navbox.items.some((item) => item.slug === article.slug) : false;
      })
      .sort();
  }

  for (const article of articles) {
    const declaredNavboxes = normalizeStringArray(article.frontmatter?.navboxes).map(toSlugPart);
    for (const navboxId of declaredNavboxes) {
      const navbox = navboxById.get(navboxId);
      if (!navbox) {
        throw new Error(`Article "${article.source_relative_path}" references unknown navbox "${navboxId}"`);
      }
      if (!navbox.items.some((item) => item.slug === article.slug) && !navbox.derived_from_rule) {
        throw new Error(`Article "${article.source_relative_path}" declares navbox "${navboxId}" but is not listed in that navbox registry`);
      }
    }
  }

  return {
    articles: articles.map(({ frontmatter, entry_type, ...article }) => article).sort((a, b) => a.slug.localeCompare(b.slug)),
    navboxes: navboxRegistry.map(({ derived_from_rule, ...navbox }) => navbox).sort((a, b) => a.id.localeCompare(b.id)),
  };
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
    const sharedImageMatch = siblingMatch
      ? null
      : assetIndex.find(
          (entry) => entry.relativePath.startsWith("_images/") && path.posix.basename(entry.relativePath) === targetName,
        );
    const globalMatch =
      siblingMatch || sharedImageMatch || assetIndex.find((entry) => path.posix.basename(entry.relativePath) === targetName);
    if (!globalMatch) {
      deriveWarnings.push(`[codex-derived] missing image asset "${targetName}" referenced by ${sourceRelativePath}`);
      return null;
    }
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
  const displayTitle = frontmatter.title && String(frontmatter.title).trim() !== title ? frontmatter.title : null;
  const honorificTitle = frontmatter.honorific_title || null;
  return {
    type: "deity",
    title,
    subtitle: frontmatter.epithet || honorificTitle || displayTitle || frontmatter.subtitle || null,
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
          ["Title", displayTitle],
          ["Honorific Title", honorificTitle],
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
  ensureDir(navboxDerivedRoot);
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

  const navboxData = buildNavboxData(markdownFiles);
  fs.writeFileSync(path.join(navboxDerivedRoot, "articles.json"), `${JSON.stringify(navboxData.articles, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(navboxDerivedRoot, "navboxes.json"), `${JSON.stringify(navboxData.navboxes, null, 2)}\n`, "utf8");

  process.stdout.write(`[codex-derived] generated ${writtenFiles.size} sidebar json file(s) and ${navboxData.navboxes.length} navbox definition(s)\n`);
  if (deriveWarnings.length) {
    for (const warning of [...new Set(deriveWarnings)].sort()) {
      process.stdout.write(`${warning}\n`);
    }
  }
  if (skippedFiles.length) {
    for (const skipped of skippedFiles) {
      process.stdout.write(`[codex-derived] skipped ${skipped.relativePath}: ${skipped.reason}\n`);
    }
  }
}

main();
