#!/usr/bin/env node
/**
 * Wiki-style page history for the codex.
 *
 * Every published note keeps its superseded versions, so an article can show a
 * revision list and a diff the way a wiki does.
 *
 *   content/_history/
 *     index.json                       metadata for every note
 *     gods/🌌Gozara.md/
 *       20260309T1412Z-75cb3ab.md      oldest
 *       20261012T0933Z-b759f69.md      newest
 *
 * Why a committed store rather than reading git at render time: Vercel builds
 * from a shallow clone, so `git log` there sees almost nothing. History is
 * captured locally at sync time and committed with the content it describes.
 * It lives outside content/_derived/ because `derive:codex` rewrites that
 * directory on every build and would wipe it.
 *
 * Revisions are stored POST-SCRUB. A revision is scrubbed again on the way in,
 * so DM material cannot reach the site through an old version even if it once
 * reached a commit.
 *
 * Usage:
 *   node scripts/build_history.mjs --backfill   # seed from git history (one time)
 *   node scripts/build_history.mjs --capture    # record anything that changed
 *   node scripts/build_history.mjs --capture --dry-run
 *   node scripts/build_history.mjs --verify     # store consistent with index?
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { scrub } from "./scrub_private.mjs";

const argv = process.argv.slice(2);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined;
};
const repoRoot = flagValue("--root")
  ? path.resolve(flagValue("--root"))
  : path.resolve(import.meta.dirname, "..");
const contentRoot = path.join(repoRoot, "content");
const historyRoot = path.join(contentRoot, "_history");
const indexPath = path.join(historyRoot, "index.json");

const args = new Set(argv);
const backfill = args.has("--backfill");
const capture = args.has("--capture");
const verify = args.has("--verify");
const dryRun = args.has("--dry-run");

const git = (gitArgs, opts = {}) =>
  execFileSync("git", ["-c", "core.quotepath=false", "-C", repoRoot, ...gitArgs], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });

function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    return { generated: null, notes: {} };
  }
}

function saveIndex(index) {
  index.generated = new Date().toISOString();
  fs.mkdirSync(historyRoot, { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
}

/** content/-relative paths of every published note. */
function publishedNotes() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name === "_derived" || item.name === "_history" || item.name.startsWith(".")) continue;
        walk(p);
      } else if (/\.(md|markdown)$/i.test(item.name)) {
        out.push(path.relative(contentRoot, p));
      }
    }
  };
  walk(contentRoot);
  return out.sort();
}

const revDir = (rel) => path.join(historyRoot, rel);
const revFile = (rel, id) => path.join(revDir(rel), `${id}.md`);

function revisionId(iso, sha) {
  const stamp = iso.replace(/[-:]/g, "").replace(/\.\d+/, "").replace(/\+.*$/, "").replace(/Z?$/, "Z");
  return `${stamp.slice(0, 15)}Z-${sha.slice(0, 7)}`;
}

/**
 * Line endings are normalized on the way in. The repo moved from Windows to
 * Linux and 162 files still carry CRLF, so without this a pure line-ending
 * commit would be stored as a revision in which every single line changed.
 */
const normalize = (text) => text.replace(/\r\n/g, "\n");

/** Store one revision unless its text matches the previous one. */
function writeRevision(index, rel, { id, date, message, sha, text }) {
  const entries = (index.notes[rel] ||= []);
  text = normalize(text);
  const previous = entries[entries.length - 1];
  if (previous) {
    const previousText = readRevisionText(rel, previous.id);
    if (previousText === text) return { skipped: "unchanged" };
  }
  if (entries.some((e) => e.id === id)) return { skipped: "duplicate id" };

  const { text: clean, removed } = scrub(text);
  if (!dryRun) {
    fs.mkdirSync(revDir(rel), { recursive: true });
    fs.writeFileSync(revFile(rel, id), clean, "utf8");
  }
  entries.push({ id, date, message, sha: sha || null, bytes: Buffer.byteLength(clean, "utf8") });
  return { written: true, scrubbed: removed };
}

function readRevisionText(rel, id) {
  try {
    return fs.readFileSync(revFile(rel, id), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
}

/** Commits that touched a note, oldest first, following renames. */
function commitsFor(rel) {
  const target = path.join("content", rel);
  let raw;
  try {
    raw = git(["log", "--follow", "--name-only", "--format=%x00%H%x1f%aI%x1f%s", "--", target]);
  } catch {
    return [];
  }
  const commits = [];
  for (const chunk of raw.split("\0")) {
    if (!chunk.trim()) continue;
    const [header, ...rest] = chunk.split("\n");
    const [sha, date, message] = header.split("\x1f");
    const files = rest.filter(Boolean);
    // With --follow the listed path is the name the file had at that commit.
    const pathAtCommit = files.find((f) => f.endsWith(path.basename(rel))) || files[0] || target;
    if (!sha) continue;
    commits.push({ sha, date, message, pathAtCommit });
  }
  return commits.reverse();
}

function blobAt(sha, pathAtCommit) {
  try {
    return git(["show", `${sha}:${pathAtCommit}`]);
  } catch {
    return null;
  }
}

// --- modes --------------------------------------------------------------------

function runBackfill() {
  const index = loadIndex();
  const notes = publishedNotes();
  let revisions = 0;
  let scrubbedRevisions = 0;

  for (const rel of notes) {
    if (index.notes[rel]?.length) continue; // already seeded; --capture takes it from here
    const commits = commitsFor(rel);
    if (!commits.length) continue;
    let wrote = 0;
    for (const c of commits) {
      const text = blobAt(c.sha, c.pathAtCommit);
      if (text === null) continue;
      const result = writeRevision(index, rel, {
        id: revisionId(c.date, c.sha),
        date: c.date,
        message: c.message,
        sha: c.sha,
        text,
      });
      if (result.written) {
        wrote += 1;
        revisions += 1;
        if (result.scrubbed) {
          scrubbedRevisions += 1;
          console.warn(`[history] scrubbed private material out of ${rel}@${c.sha.slice(0, 7)}`);
        }
      }
    }
    if (wrote) console.log(`[history] ${rel}: ${wrote} revision(s)`);
  }

  if (!dryRun) saveIndex(index);
  console.log(`[history] backfill ${dryRun ? "would store" : "stored"} ${revisions} revision(s) across ${notes.length} note(s)`);
  if (scrubbedRevisions) console.log(`[history] ${scrubbedRevisions} historical revision(s) needed scrubbing`);
}

/**
 * Record the current text of anything that changed since its last revision.
 * Run after sync+scrub: the previous entry in the store IS the replaced file.
 */
function runCapture() {
  const index = loadIndex();
  const notes = publishedNotes();
  const stamp = new Date().toISOString();
  let message = "vault sync";
  try {
    message = git(["log", "-1", "--format=%s"]).trim() || message;
  } catch {}

  let changed = 0;
  for (const rel of notes) {
    const text = fs.readFileSync(path.join(contentRoot, rel), "utf8").replace(/\r\n/g, "\n");
    const entries = index.notes[rel] || [];
    const previous = entries[entries.length - 1];
    if (previous && readRevisionText(rel, previous.id) === text) continue;

    const id = revisionId(stamp, "sync" + String(changed).padStart(3, "0"));
    const result = writeRevision(index, rel, {
      id,
      date: stamp,
      message: previous ? message : "created",
      sha: null,
      text,
    });
    if (result.written) {
      changed += 1;
      console.log(`[history] ${dryRun ? "would record" : "recorded"} revision of ${rel}`);
    }
  }

  // A note that left content/ keeps its history: the record of a deleted page
  // is the one thing a wiki must not lose.
  if (!dryRun) saveIndex(index);
  if (changed === 0) console.log("[history] no changes to record");
  else console.log(`[history] ${dryRun ? "would record" : "recorded"} ${changed} revision(s)`);
}

function runVerify() {
  const index = loadIndex();
  const problems = [];
  let revisions = 0;
  for (const [rel, entries] of Object.entries(index.notes)) {
    for (const entry of entries) {
      revisions += 1;
      const text = readRevisionText(rel, entry.id);
      if (text === null) problems.push(`${rel}@${entry.id}: indexed but no file on disk`);
      else if (scrub(text).removed > 0) problems.push(`${rel}@${entry.id}: private material in a stored revision`);
    }
  }
  if (problems.length) {
    console.error("[history] FAIL:");
    for (const p of problems) console.error(`    ${p}`);
    process.exit(1);
  }
  console.log(`[history] verify passed: ${revisions} revision(s) across ${Object.keys(index.notes).length} note(s)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (backfill) runBackfill();
  else if (capture) runCapture();
  else if (verify) runVerify();
  else {
    const index = loadIndex();
    const notes = Object.keys(index.notes).length;
    const revisions = Object.values(index.notes).reduce((n, e) => n + e.length, 0);
    console.log(`[history] ${revisions} revision(s) across ${notes} note(s); generated ${index.generated || "never"}`);
    console.log("[history] modes: --backfill  --capture  --verify");
  }
}
