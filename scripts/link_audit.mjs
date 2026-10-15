#!/usr/bin/env node
/**
 * Report wikilinks in content/ whose target does not exist.
 *
 * These are what the site renders as red links. This lists them by target so
 * the gaps can be worked through: what is linked most is what is most worth
 * writing next.
 *
 * Usage:  npm run links:audit  [--verbose]
 *   --verbose  also list the note(s) each missing target is linked from.
 *
 * Exits 0 always: unresolved links are the normal state of a vault that is
 * published while it is still being written, not a build failure.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "content";
// _history holds past revisions, which must keep whatever links they had;
// _derived and _images are generated.
const SKIP = new Set(["_history", "_derived", "_images"]);
const ASSET = /\.(png|jpe?g|webp|avif|svg|gif|canvas|base|pdf)$/i;
const PLACEHOLDER = /^\{\{.*\}\}$/;

const verbose = process.argv.includes("--verbose");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith(".md")) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

if (!fs.existsSync(ROOT)) {
  console.error(`[links] no ${ROOT}/ directory here`);
  process.exit(0);
}

const files = walk(ROOT);
// Obsidian resolves a wikilink on basename, case-insensitively; so does the
// site's resolver for the cases this audit cares about.
const known = new Set(files.map((file) => path.basename(file, ".md").toLowerCase()));

const missing = new Map();
let links = 0;
let placeholders = 0;

for (const file of files) {
  const markdown = fs.readFileSync(file, "utf8");
  for (const match of markdown.matchAll(/(?<!!)\[\[([^[\]]+)\]\]/g)) {
    const target = match[1].split("|")[0].trim();
    if (!target || ASSET.test(target)) continue;
    if (PLACEHOLDER.test(target)) {
      // An unfilled note template, not a page anyone means to write. The
      // renderer does not emit a link for these either.
      placeholders += 1;
      continue;
    }
    links += 1;
    const base = target.split("/").pop().replace(/\.(md|markdown)$/i, "").trim().toLowerCase();
    if (!base || known.has(base)) continue;
    if (!missing.has(target)) missing.set(target, new Set());
    missing.get(target).add(file.slice(ROOT.length + 1));
  }
}

const rows = [...missing.entries()].sort(
  (a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]),
);
const instances = rows.reduce((total, [, sources]) => total + sources.size, 0);

console.log(`[links] ${files.length} notes, ${links} wikilinks`);
console.log(`[links] ${rows.length} unresolved target(s), ${instances} link instance(s)`);
if (placeholders) {
  console.log(`[links] ${placeholders} unfilled template placeholder(s) ignored`);
}

if (!rows.length) {
  console.log("[links] every wikilink resolves");
  process.exit(0);
}

console.log("");
for (const [target, sources] of rows) {
  console.log(`  ${String(sources.size).padStart(3)}x  ${target}`);
  if (verbose) {
    for (const source of [...sources].sort()) console.log(`         ${source}`);
  }
}
if (!verbose) {
  console.log("\n  (--verbose to see which notes link each one)");
}
