# CLAUDE CONVERSATION

A shared handoff file between three parties: Rook, the Claude chat session (lore, artifacts, drawings), and the CLI session (vault, repo, site build).

This repo is public. Nothing in this file may contain DM-only material, personal details, or secrets. DM content stays in the vault and is stripped by the sync layer. If a note needs to refer to a DM block, say that it exists and where, not what it says.

## How to use it

- Append to the Log at the bottom. Newest entry last. Sign each entry with who wrote it (Rook, Claude chat, CLI) and the date.
- Put work for another party in the matching Open list, and move it to the Log when done, with a line on what changed.
- Keep entries short. Link to files by path.
- Claude chat only sees this file when Rook points it here and the repo is attached to that session. Pull before editing, push after.

## Open for the CLI

- Waiting on the updated `dwarves-and-duergar.md` with the "One root, five hands" section. The newest copy that has reached disk is byte-identical to the vault note and does not contain it, so that revision has not been handed over yet.

## Open for Claude chat

- Karakeel reconciliation: apply the agreed name table to the codex and vault note once Rook says go.
- Elf script: redraw with corrected ticks (left of the spine = deep vowels a, o, u; right = forward vowels e, i), then draw the five-hand family tree.
- Pending decisions from Rook are tracked in the "Open questions" section of the Dwarves and Duergar codex.
- Do not rely on `![[image.png]]` embeds in handed-over notes yet. The publishing branch renders them as literal text; the fix exists on another branch and has not been merged. Reference figures by path in prose until this line is removed.
- Two image sheets arrived without labels. If they are the elf-script redraw or the five-hand tree, say which is which and what filenames they should take in the vault.

## Current canon in one screen (writing systems)

- The elf script is the root of all others: vertical, Mongolian-style, spine with ticks and loops, vowels as full letters.
- Dwarves: right to left, joined baseline, Farsi-leaning, tense carried in the stroke (present baseline, past thicker, future cant about 5 degrees, timeless curled cap, verbs always capped). Refugees add helper marks for vowel and tense.
- Goblinoids: futhark-like. Halflings and gnomes: shared Thaana-like script. Humans: Latinized Thaana, fewer accents.
- Everything about how one script derives from another (rotation, broken spine, promoted vowels) is proposed, not decided.

## Log

- 2026-10-11, Claude chat: created this file. Codex artifact republished with the scripts addendum (version 3). No other repo files touched.
- 2026-10-11, CLI: answered the three open items above. (1) This file is not rendered or published: the site resolves routes only under `content/`, and `root_file_globs` in `codex_registry/publish.json` matches images only, so a repo-root `.md` is never synced. Safe to keep here. (2) The Kedantlan header is integrated and live on the front page -- tiles, region outline and the Naharapan marker all render; it sits on branch `areshnaat-publishing`, not yet on `main`. (3) The updated dwarves note has not reached disk; see Open for the CLI.
- 2026-10-11, CLI: context the chat session should have when authoring notes. Areshnaat now has its own Obsidian vault, and the repo lives outside it rather than inside. The vault's top-level folders are the site sections (`gods/`, `regions/`, `cultures/`, `chronicles/`, `creatures/`, `relics/`), so a note's folder decides its route. Use the shortest wikilink format. Give every note a frontmatter `name:` or a leading `#` heading, or the page title falls back to raw prose.
- 2026-10-11, CLI: the DM scrub is built and verified live. A callout typed `dm`, `secret` or `spoiler`, a callout whose title starts with "DM", and anything between `<!-- dm:start -->` and `<!-- dm:end -->` are stripped from the published copy at sync time. The vault keeps the full text. A fail-closed check runs before the build, so an unterminated fence stops a publish rather than leaking. DM material can go in notes freely now, in that form.
