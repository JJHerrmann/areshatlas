# Codex content sync

The site's `content/` tree is a **mirror of an Obsidian vault**, not the place
you author. Authoring happens in the vault; `content/` is the committed
snapshot that Vercel builds from.

```
  Obsidian vault                     repo
  ~/Documents/Areshnaat/   --sync->  content/        --derive->  content/_derived/
  (gods/ regions/ ...)               (tracked in git)            (sidebars, navboxes)
```

`content/` **must stay tracked in git** — Vercel builds from GitHub, so an
untracked `content/` would deploy an empty site.

## Two adapters, same job

| | Windows | Linux / macOS |
|---|---|---|
| sync | `scripts/sync_codex_content.ps1` (robocopy `/MIR`) | `scripts/sync_codex_content.sh` (rsync) |
| publish | `scripts/publish_from_vault.ps1` | `scripts/publish_from_vault.sh` |
| watch | `scripts/watch_codex_content.mjs` | same file — dispatches on `process.platform` |

The PowerShell scripts are unchanged and still assume the old
`R:\RookVault\...\codex-content` source.

## Linux usage

```bash
npm run sync:codex:check      # dry run, changes nothing
npm run sync:codex:posix      # additive sync + derive
npm run sync:codex:mirror     # mirror (prompts before deleting)
npm run watch:codex           # watch the vault, sync on change
npm run publish:codex:posix   # sync, build, commit (add --push to push)
```

Source resolution order: `$ARESH_CODEX_SOURCE`, then `source_default` in
`codex_registry/publish.json`.

## Why additive by default

The PowerShell version mirrors with `robocopy /MIR`. A direct port
(`rsync --delete`) is dangerous here: the vault and `content/` have drifted
apart before, and in October 2026 the repo held 86 notes whose vault-side
source had been lost entirely. An unguarded mirror would have deleted all of
them. So:

- default is **additive** — nothing is ever deleted;
- `--mirror` enables deletion, but first prints every file it would delete and
  asks for confirmation (`--yes` to skip, for CI);
- `content/_derived/` is always protected (it is generated, never authored);
- `codex_registry/publish.json` is an **allowlist** — only the folders listed
  there are published, so vault-only notes (drafts, `SEO_Findings.md`,
  `.obsidian/`) can never leak into the site.

## The publish checkbox

The allowlist decides which **folders** publish. The per-note switch is a
boolean `publish` property in the vault, which Obsidian's Properties panel
renders as a checkbox:

```yaml
---
title: Dwarven Calendar
publish: false
---
```

- **Unchecked** (`false`/`no`/`off`/`0`) holds the note back. It never enters
  `content/`, so it is not in the public GitHub repo either — same layer as the
  DM scrub, and for the same reason.
- **Missing field publishes.** `publish_default` in `codex_registry/publish.json`
  is `true`, so none of the existing notes needed backfilling. Flip it to `false`
  to make the gate opt-in, but then every note needs `publish: true` to go live.
- **Unticking a note that already published removes it from `content/`.** The
  additive sync never deletes, so without this a note taken off the site would
  keep its stale copy forever. The removal shows up in the git diff.
- Only the top-level key counts: a `publish:` nested under another property is
  ignored. An unrecognized value warns and falls through to the default rather
  than silently guessing.
- An **empty note never publishes** regardless — rsync runs with `--min-size=1`,
  because a zero-byte note would land as a live URL with no heading and a title
  built from the raw filename.

Inspect the gate without syncing:

```bash
node scripts/publish_gate.mjs                 # list what is held back
node scripts/publish_gate.mjs --prune --dry-run   # and what would leave content/
```

`publish_from_vault.sh` inherits all of this, since it calls the sync script.
The PowerShell adapter does **not** have the gate.

## Vault conventions that the renderer depends on

- **Folder layout = section layout.** The vault's top-level folders are the
  site's sections, so no path translation happens anywhere. Adding a section
  means adding it in `lib/codexContent.ts`, `generate_codex_derived.mjs`, and
  the `sections` list in `publish.json`.
- **Emoji filename prefixes are safe.** `gods/🌊Abyroqa.md` routes to
  `/pantheon/abyroqa` — `slugifySegment` strips non-alphanumerics and trims
  leading separators. Don't rely on the emoji carrying meaning in the URL.
- **Link format must be "shortest".** The vault sets
  `newLinkFormat: "shortest"` in `.obsidian/app.json`. Obsidian's
  `alwaysUpdateLinks` will otherwise rewrite `[[Gift I]]` into a vault-absolute
  path like `[[Author/.../content/party/Gift I]]`, which `resolveObsidianHref`
  cannot resolve — it renders as a dead `[Gift I](#)`. This happened to 21
  links while the repo lived inside the Runagarthur vault.
- **Never put the repo inside a vault.** That is what caused the link damage,
  plus Obsidian indexing ~20k files including `node_modules`.
- **Give notes a frontmatter `name:` or a `#` heading.** A note with neither
  falls back to its first prose line, which becomes the `<h1>` and `<title>`.
  (The `seo-p0` branch fixes the frontmatter half of this.)

## Vault-only (DM) material

The vault holds the full note; the published copy does not. `scripts/scrub_private.mjs`
strips private blocks at **sync** time, not render time, so it does not depend on which
branch is checked out. That matters: `main` and `seo-p0` have no Obsidian callout support
at all and render `> [!danger]- DM eyes only` as a plain OPEN blockquote with every line
visible and the literal `[!danger]-` showing.

Two markers, both of which stay readable in Obsidian:

```markdown
> [!dm]- DM eyes only          <- callout: type in private_callout_types,
> secret                          or any callout whose title starts with "DM".
                                  Obsidian folds `[!type]-` natively.

<!-- dm:start -->              <- fence: for a whole `##` section
## Secret section
<!-- dm:end -->
```

- Configure types in `codex_registry/publish.json` → `private_callout_types`
  (default `dm`, `secret`, `spoiler`).
- The scrub runs **before** derive, so private text never reaches `content/_derived/` either.
- `publish_from_vault.sh` runs `scrub_private.mjs --check` and **refuses to build** if any
  private block survives into `content/`. Fail closed.
- The scrub is idempotent and byte-identical on files with no markers.

```bash
node scripts/scrub_private.mjs            # strip content/ in place
node scripts/scrub_private.mjs --check    # exit 1 if anything private remains
node scripts/scrub_private.mjs --dry-run  # report only
```

To keep a note out of the site entirely instead, add its **basename** to `never_publish`
in `publish.json`. Patterns there are matched by rsync relative to each section's transfer
root, so a path-prefixed pattern like `cultures/Foo.md` silently matches nothing.
