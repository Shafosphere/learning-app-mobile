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
  "assets/znaki/"
  "assets/images/"
  "assets/illustrations/"
  "assets/icons/"
  "assets/nieuzywane/"
)

search_options=(
  --fixed-strings
  --glob '!node_modules/**'
  --glob '!assets/**'
  --glob '!scripts/check-legacy-asset-paths.sh'
  --glob '!PLAN_PORZADKOWANIA_GRAFIK.md'
  --glob '!audyt-grafik.csv'
)

failed=0
for pattern in "${patterns[@]}"; do
  if rg -n "${search_options[@]}" "$pattern" . > /dev/null; then
    echo "Legacy or archived asset path found: $pattern"
    rg -n "${search_options[@]}" "$pattern" .
    failed=1
  fi
done

if [[ "$failed" -eq 1 ]]; then
  exit 1
fi

echo "No legacy or archived asset paths detected."
