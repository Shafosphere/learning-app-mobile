#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Użycie: npm run assets:a1:optimize -- /ścieżka/do/źródłowych-png" >&2
  exit 1
fi

source_dir="$(cd "$1" && pwd)"
cd "$(dirname "$0")/../.."

output_dir="assets/images/A1"

if ! command -v magick >/dev/null 2>&1; then
  echo "Brak ImageMagick (polecenia magick). Zainstaluj ImageMagick z obsługą WebP." >&2
  exit 1
fi

# Źródłowe PNG przechowujemy poza projektem. Usuwamy tylko biel połączoną z brzegiem,
# aby zachować białe elementy zamknięte wewnątrz konturu przedmiotu.
find "$source_dir" -maxdepth 1 -type f -iname '*.png' -print0 |
  while IFS= read -r -d '' source_file; do
    file_name="$(basename "${source_file%.*}")"
    magick "$source_file" \
      -auto-orient \
      -alpha set \
      -bordercolor white -border 1 \
      -fuzz '5%' -fill none -floodfill +0+0 white \
      -shave 1x1 \
      -resize '800x800>' \
      -strip \
      -quality 70 \
      -define webp:method=6 \
      "$output_dir/$file_name.webp"
  done

echo "Gotowe: WebP bez białego tła (maks. 800 px, jakość 70) w $output_dir"
