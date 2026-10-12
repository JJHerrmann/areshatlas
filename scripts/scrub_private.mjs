#!/usr/bin/env node
/**
 * Strip vault-only (DM) material out of the published copy.
 *
 * The vault keeps the full note; content/ gets a sanitized copy. This runs at
 * SYNC time rather than render time so it does not depend on which branch is
 * checked out: main and seo-p0 have no Obsidian callout support at all, and
 * render `> [!danger]- DM eyes only` as a plain OPEN blockquote with every
 * line visible.
 *
 * Two markers, both of which stay readable in Obsidian:
 *
 *   1. A callout whose type is in private_callout_types, or whose title starts
 *      with "DM". Obsidian folds `> [!type]- Title` natively.
 *        > [!dm]- DM eyes only
 *        > secret
 *
 *   2. A fenced region, for whole `##` sections or anything else:
 *        <!-- dm:start -->
 *        ## Secret section
 *        <!-- dm:end -->
 *
 * Usage:
 *   node scripts/scrub_private.mjs            # scrub content/ in place
 *   node scripts/scrub_private.mjs --check    # exit 1 if anything private remains
 *   node scripts/scrub_private.mjs --dry-run  # report, change nothing
 */

import fs from "node:fs";
import path from "node:path";

// --root <dir> lets the sync script scrub a different checkout (e.g. a second
// git worktree) using this copy of the scrubber. Defaults to this file's repo.
const argv = process.argv.slice(2);
const rootFlag = argv.indexOf("--root");
const repoRoot = rootFlag !== -1 && argv[rootFlag + 1]
  ? path.resolve(argv[rootFlag + 1])
  : path.resolve(import.meta.dirname, "..");
const contentRoot = path.join(repoRoot, "content");
const registryPath = path.join(repoRoot, "codex_registry", "publish.json");

const args = new Set(argv);
const check = args.has("--check");
const dryRun = args.has("--dry-run");

let registry = {};
try {
  registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
} catch {}
const TYPES = new Set(
  (registry.private_callout_types || ["dm", "secret", "spoiler"]).map((t) => String(t).toLowerCase()),
);
const TITLE_RE = /^DM\b/i;

const CALLOUT_RE = /^>[ \t]*\[!([\w-]+)\]([+-]?)[ \t]*(.*)$/;

/** Remove private callouts and fenced regions. Returns {text, removed}. */
export function scrub(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let removed = 0;
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!inFence && /^[ \t]*<!--[ \t]*dm:start[ \t]*-->[ \t]*$/i.test(line)) {
      inFence = true;
      removed += 1;
      continue;
    }
    if (inFence) {
      if (/^[ \t]*<!--[ \t]*dm:end[ \t]*-->[ \t]*$/i.test(line)) inFence = false;
      continue;
    }

    const m = line.match(CALLOUT_RE);
    if (m) {
      const type = m[1].toLowerCase();
      const title = m[3].replace(/^[-+][ \t]*/, "").trim();
      if (TYPES.has(type) || TITLE_RE.test(title)) {
        // Consume the whole blockquote: every following line that starts with ">".
        let j = i;
        while (j < lines.length && /^>/.test(lines[j])) j += 1;
        i = j - 1;
        removed += 1;
        // Collapse a blank line left dangling behind the removed block.
        while (out.length && out[out.length - 1].trim() === "") out.pop();
        out.push("");
        continue;
      }
    }
    out.push(line);
  }

  if (inFence) throw new Error("unterminated <!-- dm:start --> fence");
  return { text: out.join("\n").replace(/\n{3,}/g, "\n\n"), removed };
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === "_derived") continue;
      walk(p, acc);
    } else if (/\.(md|markdown)$/i.test(item.name)) acc.push(p);
  }
  return acc;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const files = walk(contentRoot);
  let touched = 0;
  let total = 0;
  const offenders = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    let result;
    try {
      result = scrub(raw);
    } catch (error) {
      console.error(`[scrub] ${path.relative(repoRoot, file)}: ${error.message}`);
      process.exit(2);
    }
    if (result.removed === 0) continue;
    total += result.removed;
    touched += 1;
    const rel = path.relative(repoRoot, file);
    if (check) {
      offenders.push(`${rel} (${result.removed} private block(s) still present)`);
    } else if (dryRun) {
      console.log(`[scrub] would strip ${result.removed} block(s) from ${rel}`);
    } else {
      fs.writeFileSync(file, result.text, "utf8");
      console.log(`[scrub] stripped ${result.removed} block(s) from ${rel}`);
    }
  }

  if (check) {
    if (offenders.length) {
      console.error("[scrub] FAIL: private material found in content/:");
      for (const o of offenders) console.error(`    ${o}`);
      console.error("[scrub] run: node scripts/scrub_private.mjs");
      process.exit(1);
    }
    console.log("[scrub] check passed: no private material in content/");
  } else if (touched === 0) {
    console.log("[scrub] nothing to strip");
  } else {
    console.log(`[scrub] ${dryRun ? "would strip" : "stripped"} ${total} block(s) across ${touched} file(s)`);
  }
}
