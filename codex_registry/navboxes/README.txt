Shared navbox registry files live here, outside the mirrored `content/` tree.

Reason:
- `content/` is mirrored from the Obsidian vault by `scripts/sync_codex_content.ps1`
- app-owned registry data inside `content/` can be deleted by sync

Each file should be JSON with:
- `id`
- `title`
- `mode`
- `items`

Example:
{
  "id": "example-navbox",
  "title": "Example Navbox",
  "mode": "footer",
  "items": ["some-slug", "other-slug"]
}
