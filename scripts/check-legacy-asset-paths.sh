#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

patterns=(
  "@/assets/africa/"
  "@/assets/asia/"
  "@/assets/north_america/"
  "@/assets/south_america/"
  "@/assets/oceania/"
  "@/assets/flags/europe/"
  "@/assets/images/forFlashcards/gwiazdozbiory/"
  "@/assets/illustrations/box/"
  "@/assets/sounds/"
  "@/assets/db/prebuilt.db"
  "./assets/icons/newIcons/"
  "./assets/icons/splash-icon.png"
  "./assets/icons/favicon.png"
)

failed=0
for pattern in "${patterns[@]}"; do
  if rg -n --fixed-strings --glob '!node_modules/**' --glob '!assets/**' --glob '!scripts/check-legacy-asset-paths.sh' "$pattern" . > /dev/null; then
    echo "Legacy asset path found: $pattern"
    rg -n --fixed-strings --glob '!node_modules/**' --glob '!assets/**' --glob '!scripts/check-legacy-asset-paths.sh' "$pattern" .
    failed=1
  fi
done

if [[ "$failed" -eq 1 ]]; then
  exit 1
fi

echo "No legacy asset paths detected."
