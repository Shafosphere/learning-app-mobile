#!/usr/bin/env bash

set -euo pipefail

source_dir="assets/images/birds"
output_dir="assets/images/birds-webp"

if ! command -v magick >/dev/null 2>&1; then
  echo "Brak ImageMagick (polecenia magick). Zainstaluj ImageMagick z obsługą WebP." >&2
  exit 1
fi

mkdir -p "$output_dir"

find "$source_dir" -maxdepth 1 -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 |
  while IFS= read -r -d '' source_file; do
    file_name="$(basename "${source_file%.*}")"
    target_file="$output_dir/$file_name.webp"

    magick "$source_file" \
      -auto-orient \
      -resize '800x800>' \
      -strip \
      -quality 70 \
      -define webp:method=6 \
      "$target_file"
  done

echo "Gotowe: WebP (maks. 800 px, jakość 70) w $output_dir"
