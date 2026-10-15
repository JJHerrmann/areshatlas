#!/usr/bin/env bash
# Linux/macOS counterpart to publish_from_vault.ps1.
#
# Honours the policy declared in the vault's wiki/publishing-projects.json
# "defaults" block: clean worktree required, fetch before publish, and NO
# automatic push. Push is opt-in via --push.
#
#   ./scripts/publish_from_vault.sh              # sync, derive, build, commit
#   ./scripts/publish_from_vault.sh --push       # ...and push
#   ./scripts/publish_from_vault.sh --no-build   # skip next build
#   ./scripts/publish_from_vault.sh --mirror     # pass --mirror to the sync

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

do_push=0; do_build=1; sync_args=()
for arg in "$@"; do
  case "$arg" in
    --push)     do_push=1 ;;
    --no-build) do_build=0 ;;
    --mirror)   sync_args+=(--mirror) ;;
    --yes|-y)   sync_args+=(--yes) ;;
    -h|--help)  sed -n '2,13p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "[codex-publish] unknown argument: $arg" >&2; exit 2 ;;
  esac
done

branch="$(git rev-parse --abbrev-ref HEAD)"
echo "[codex-publish] repo:   $repo_root"
echo "[codex-publish] branch: $branch"

# require_clean_worktree, ignoring content/ (which this script is about to rewrite)
dirty="$(git status --porcelain -- . ':(exclude)content' | head -5)"
if [ -n "$dirty" ]; then
  echo "[codex-publish] worktree has changes outside content/:" >&2
  echo "$dirty" | sed 's/^/    /' >&2
  echo "[codex-publish] commit or stash them first (registry: require_clean_worktree)" >&2
  exit 1
fi

# fetch_before_publish
if git remote get-url origin >/dev/null 2>&1; then
  echo "[codex-publish] fetching origin..."
  git fetch --quiet origin || echo "[codex-publish] fetch failed; continuing"
  if git rev-parse --verify --quiet "origin/$branch" >/dev/null; then
    behind="$(git rev-list --count "HEAD..origin/$branch")"
    [ "$behind" != 0 ] && echo "[codex-publish] note: $behind commit(s) behind origin/$branch (no automatic pull)"
  fi
fi

bash "$repo_root/scripts/sync_codex_content.sh" "${sync_args[@]}"

# Fail closed: never build a tree that still contains private material.
echo "[codex-publish] checking for vault-only material in content/..."
node "$repo_root/scripts/scrub_private.mjs" --check

# The history store is permanent once published, so it is checked too: every
# stored revision must be present on disk and free of private material.
echo "[codex-publish] verifying page history store..."
node "$repo_root/scripts/build_history.mjs" --verify

if [ "$do_build" = 1 ]; then
  echo "[codex-publish] building..."
  npm run build
fi

if git diff --quiet -- content codex_registry && git diff --cached --quiet -- content codex_registry \
   && [ -z "$(git ls-files --others --exclude-standard -- content codex_registry)" ]; then
  echo "[codex-publish] no content changes to commit"
else
  git add content codex_registry
  git commit -m "sync: publish latest codex content"
  echo "[codex-publish] committed"
fi

if [ "$do_push" = 1 ]; then
  echo "[codex-publish] pushing to origin/$branch..."
  git push origin "$branch"
else
  echo "[codex-publish] not pushing (registry: allow_automatic_push=false); use --push"
fi

echo "[codex-publish] done"
