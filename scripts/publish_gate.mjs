#!/usr/bin/env node
/**
 * Per-note publish gate.
 *
 * The folder allowlist in publish.json is path-based: it decides which
 * SECTIONS reach the site. This is the per-note switch on top of it, so a
 * single draft can sit in a published folder without going live.
 *
 * In the vault, add a boolean property. Obsidian's Properties panel renders it
 * as a checkbox:
 *
 *   ---
 *   title: Dwarven Calendar
 *   publish: false
 *   ---
 *
 * Unchecked (false/no/off/0) keeps the note in the vault. A missing field
 * publishes, per publish_default in the registry — flip that to false to make
 * the gate opt-in instead.
 *
 * Like the scrubber this runs at SYNC time, not render time: an unpublished
 * note never reaches content/ at all, so it is not in the public repo either.
 *
 * Usage:
 *   node scripts/publish_gate.mjs --source <vault> --list    # vault-relative paths, one per line
 *   node scripts/publish_gate.mjs --source <vault> --prune    # delete stale copies from content/
 *   node scripts/publish_gate.mjs --source <vault> --prune --dry-run
 */

import fs from "node:fs";
import path from "node:path";

// --root <dir> mirrors scrub_private.mjs: lets the sync script gate a different
// checkout (a second git worktree) using this copy of the script.
const argv = process.argv.slice(2);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined;
};
const repoRoot = flagValue("--root")
  ? path.resolve(flagValue("--root"))
  : path.resolve(import.meta.dirname, "..");
const contentRoot = path.join(repoRoot, "content");
const registryPath = path.join(repoRoot, "codex_registry", "publish.json");

const args = new Set(argv);
const listMode = args.has("--list");
const pruneMode = args.has("--prune");
const dryRun = args.has("--dry-run");

let registry = {};
try {
  registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
} catch {}

const FIELD = String(registry.publish_field || "publish").toLowerCase();
const DEFAULT_PUBLISH = registry.publish_default !== false;
const SECTIONS = Array.isArray(registry.sections) ? registry.sections : [];

const sourceDir = path.resolve(
  (flagValue("--source") || registry.source_default || "").replace(/^~/, process.env.HOME || "~"),
);

const FALSEY = new Set(["false", "no", "off", "0"]);

/**
 * Notes that declare themselves private never reach content/, whatever the
 * publish field says. This exists because a `type: dm-notes` note carrying
 * `visibility: dm-only` -- and the words "Never publish to the public repo" in
 * its own body -- synced into the public repo anyway: the scrubber only strips
 * `> [!dm]` callout BLOCKS, the underscore filename prefix only sets noindex,
 * and publish_default publishes a note that omits the field. A whole-note
 * marker had no guard at all. Keys and values come from publish.json so a new
 * convention can be added without touching this file.
 */
const PRIVATE_MARKERS = (() => {
  const raw = registry.private_note_markers || { visibility: ["dm-only", "dm", "private", "secret"], type: ["dm-notes"] };
  const out = new Map();
  for (const [key, values] of Object.entries(raw)) {
    out.set(String(key).toLowerCase(), new Set((values || []).map((v) => String(v).toLowerCase())));
  }
  return out;
})();
const TRUTHY = new Set(["true", "yes", "on", "1"]);

/**
 * Read the publish field out of a note's frontmatter without pulling in a YAML
 * parser: the value is a scalar on one line, and a malformed block must not
 * decide anything. Returns {published, raw, reason}.
 */
export function readGate(markdown) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { published: DEFAULT_PUBLISH, reason: "no frontmatter" };

  // First pass: a whole-note private marker overrides everything, including an
  // explicit `publish: true`. Fail closed.
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "---") break;
    if (/^\s/.test(line)) continue;
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const allowed = PRIVATE_MARKERS.get(m[1].toLowerCase());
    if (!allowed) continue;
    const value = m[2].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "").toLowerCase();
    if (allowed.has(value)) {
      return { published: false, raw: value, reason: `private note (${m[1]}: ${value})`, private: true };
    }
  }

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "---") break;                    // end of frontmatter
    if (/^\s/.test(line)) continue;                      // nested value, not a top-level key
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m || m[1].toLowerCase() !== FIELD) continue;

    const raw = m[2].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
    const v = raw.toLowerCase();
    if (FALSEY.has(v)) return { published: false, raw, reason: `${FIELD}: ${raw}` };
    if (TRUTHY.has(v)) return { published: true, raw, reason: `${FIELD}: ${raw}` };
    // An unparseable value must not silently publish or silently hide.
    return { published: DEFAULT_PUBLISH, raw, reason: `unrecognized ${FIELD} value`, warn: true };
  }
  return { published: DEFAULT_PUBLISH, reason: `no ${FIELD} field` };
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === "_derived" || item.name.startsWith(".")) continue;
      walk(p, acc);
    } else if (/\.(md|markdown)$/i.test(item.name)) acc.push(p);
  }
  return acc;
}

/** Vault-relative paths of every note the gate holds back. */
export function unpublished() {
  const held = [];
  const warnings = [];
  for (const section of SECTIONS) {
    const dir = path.join(sourceDir, section);
    for (const file of walk(dir)) {
      const gate = readGate(fs.readFileSync(file, "utf8"));
      const rel = path.relative(sourceDir, file);
      if (gate.warn) warnings.push(`${rel}: ${gate.reason} (${JSON.stringify(gate.raw)})`);
      if (!gate.published) held.push(rel);
    }
  }
  return { held: held.sort(), warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    console.error(`[gate] source vault not found: ${sourceDir}`);
    process.exit(1);
  }
  const { held, warnings } = unpublished();

  if (listMode) {
    // Bare paths only: the sync script feeds these to rsync --exclude-from.
    for (const rel of held) console.log(rel);
    process.exit(0);
  }

  for (const w of warnings) console.warn(`[gate] warning: ${w}`);

  if (pruneMode) {
    // A note that was published and is now unchecked still has a copy in
    // content/, and the additive sync will never remove it.
    let pruned = 0;
    for (const rel of held) {
      const target = path.join(contentRoot, rel);
      if (!fs.existsSync(target)) continue;
      pruned += 1;
      if (dryRun) {
        console.log(`[gate] would unpublish ${rel} (remove from content/)`);
      } else {
        fs.rmSync(target);
        console.log(`[gate] unpublished ${rel} (removed from content/)`);
      }
    }
    if (held.length === 0) console.log("[gate] no notes held back");
    else console.log(`[gate] holding ${held.length} note(s); ${pruned} ${dryRun ? "to remove from" : "removed from"} content/`);
    process.exit(0);
  }

  // Default: report.
  if (held.length === 0) console.log(`[gate] no notes held back (${FIELD}: false)`);
  else {
    console.log(`[gate] ${held.length} note(s) held back by ${FIELD}: false`);
    for (const rel of held) console.log(`    ${rel}`);
  }
}
