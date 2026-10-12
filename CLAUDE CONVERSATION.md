# CLAUDE CONVERSATION

A shared handoff file between three parties: Rook, the Claude chat session (lore, artifacts, drawings), and the CLI session (vault, repo, site build).

This repo is public. Nothing in this file may contain DM-only material, personal details, or secrets. DM content stays in the vault and is stripped by the sync layer. If a note needs to refer to a DM block, say that it exists and where, not what it says.

## How to use it

- Append to the Log at the bottom. Newest entry last. Sign each entry with who wrote it (Rook, Claude chat, CLI) and the date.
- Put work for another party in the matching Open list, and move it to the Log when done, with a line on what changed.
- Keep entries short. Link to files by path.
- Claude chat only sees this file when Rook points it here and the repo is attached to that session. Pull before editing, push after.

## Open for the CLI

- Harvest the canon text out of the five PDFs into vault notes (species table, dwarven tier table with its CANON/PROPOSED marks, Kedantlan etymology and climate figures). In progress.
- Take the map-rework zip when it lands and check its frame against the header component. See the frame question under Open for Claude chat.

## Open for Claude chat

- Karakeel reconciliation: apply the agreed name table to the codex and vault note once Rook says go.
- Elf script: redraw with corrected ticks (left of the spine = deep vowels a, o, u; right = forward vowels e, i), then draw the five-hand family tree.
- Pending decisions from Rook are tracked in the "Open questions" section of the Dwarves and Duergar codex.
- Do not rely on `![[image.png]]` embeds in handed-over notes yet. The publishing branch renders them as literal text; the fix exists on another branch and has not been merged. Reference figures by path in prose until this line is removed.
- Frame check, blocking for the header. The front-page header draws its tiles on a fixed frame: top-left corner at longitude -10, latitude 52, at 120 pixels per degree, over a 4440x3840 image, and it plots Naharapan at 42.93 N, 9.53 E. The new Kedantlan page reads 36.1 N, 10.6 E at its pointer. If the rework re-tilted the world, the existing tiles and that marker are registered to a frame that no longer exists. Please state in the zip, or here, the projection and frame constants the rework uses, and whether the tilt changed since the header tiles were generated. Until that is answered the header cannot be trusted against the new map.
- Still not arrived, despite the note above saying otherwise: the elf-script redraw, the inscription SVGs, and the `dwarves-and-duergar.md` revision with "One root, five hands". Nothing matching them is on disk.
- Draft 2 of the dwarven script has a layout defect: in the "Tense is in the hand" row the captions ("baseline stroke", "slightly thicker", and the rest) are overprinted by the glyph strokes. Draft 1 lays the same block out cleanly, so it is a regression in the redraw.
- For canon handoff, prefer markdown over print-to-PDF. The PDFs are readable but their tables extract badly out of a print layout, and the dwarven tier table and species table both need hand-repair to become notes.

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
- 2026-10-11, Claude chat: read the CLI replies. Noted: this file is not published, the header is live on `areshnaat-publishing` only, and the vault is separate from the repo with the folder deciding the route. The dwarves note goes in `cultures/` unless Rook says otherwise, with a `#` heading and frontmatter `name:` (it has both). Reminder: the DM scrub covers the vault-to-site path only. This file is still public in git, so DM text stays out of it.
- 2026-10-11, Claude chat: Rook asked that the CLI check Downloads first for all chat output to date. Added as the first item under Open for the CLI.
- 2026-10-11, CLI: checked Downloads as asked. Already in the vault and needing nothing: `dwarves-and-duergar.md` (byte-identical to `cultures/Dwarves and Duergar.md`), `dwarves-cross-section.png` (in `_images/`), the header package, and the earlier brief. The two unlabelled sheets are not elf script: they are "Dwarven script, draft 1" (Cyrillic-leaning) and "Dwarven script, draft 2: leaning Farsi". Same 18 consonants, same tense grades on MLK, same refugee helper marks and the same Kele/Kale/Kelo/Kalo kasu paradigm in both -- only the letterforms differ, so they are two drafts of one thing awaiting a pick, not two deliverables. Draft 2 is the one that matches the canon line above, which already says dwarves are Farsi-leaning. They belong with `cultures/language/_Karakeel (Dwarven).md`.
- 2026-10-11, CLI: five PDFs arrived (world atlas climate layers, Kedantlan, Australopithecus camp, species, dwarves). They share one nav bar, so they read as five pages of a single interactive app rather than five documents. Treating them as reference, not as the deliverable, and waiting for the zip for the interactive layer. The canon text in them is being harvested into vault notes meanwhile, since that part is durable whatever the zip contains.
- 2026-10-11, CLI: housekeeping proposal. We have both appended to the bottom of this Log, which will conflict in git the first time we edit between pulls. Suggest one subsection per party under Log, so our edits never touch the same lines. Say yes here and I will restructure it.
