#!/usr/bin/env bash
# autosync-repos.sh — Git pull en todos los repos del VPS.
# Solo reporta si hubo cambios. Silencioso si ya están al día.
set -euo pipefail

REPO_BASE="/root"
UPDATED=()

for dir in "$REPO_BASE"/*/; do
  [ -d "$dir/.git" ] || continue
  name="$(basename "$dir")"
  # git fetch + pull silencioso
  fetch_out=$(git -C "$dir" fetch --all 2>&1) || true
  pull_out=$(git -C "$dir" pull 2>&1) || true

  if echo "$pull_out" | grep -qi "Already up to date"; then
    continue
  fi
  UPDATED+=("$name: $(echo "$pull_out" | head -5 | tr '\n' ' ' | head -c 120)")
done

if [ ${#UPDATED[@]} -eq 0 ]; then
  exit 0
fi

echo "📦 Auto-sync: repos actualizados"
for entry in "${UPDATED[@]}"; do
  echo "  • $entry"
done
