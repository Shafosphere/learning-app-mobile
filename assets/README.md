# Assets structure

This project uses a `type -> domain` layout inside `assets/`.

## Top-level directories

- `app/`: app-level visuals (`icons/`, `splash/`)
- `audio/`: sound effects and audio files
- `data/`: bundled databases and JSON data
- `flags/`: language and country flags
- `fonts/`: font files
- `illustrations/`: UI and mascot illustrations
- `images/`: static screen images/previews
- `learning/`: learning content assets (e.g. flashcards)

## Naming rules

- Use English names only.
- Use `kebab-case` for files and folders.
- Avoid abbreviations and mixed casing.

## Constellation assets workflow

Constellation SVG files are organized as:

- source outlines: `assets/learning/flashcards/constellations/source/outline`
- source patterns: `assets/learning/flashcards/constellations/source/pattern`
- generated merged SVGs: `assets/learning/flashcards/constellations/generated/merged`

Regenerate merged files:

```bash
python3 tools/scripts/merge_constellation_svg.py --all
```

## A1 images workflow

`assets/images/A1` contains only optimized WebP files. To regenerate them from
an external backup of the original PNG files, run:

```bash
npm run assets:a1:optimize -- /path/to/original-pngs
```

Like the bird images, these use a maximum of 800 px on either side (without
upscaling), quality 70, WebP method 6, and no metadata. Aspect ratio and
transparency are preserved. Before resizing, white background connected to the
image edges is removed using flood fill with 5% color tolerance. Enclosed white
details are preserved; white objects without a separating outline may need
manual correction. The external source files remain unchanged.
`imageMaps.englishA1` keeps the `.png` lookup keys
used by existing CSV files and databases, but requires only the `.webp` assets.

## Integrity check

`assets/data/sqlite/retired-basic-english.json` preserves the 474 cards from the
previously shipped `fiszki_podstawy_en_pl_slowa` pack (version 3). It is used only
to restore backups that reference this retired course. Keep its external IDs,
positions, and answers unchanged; it is excluded from the fresh-install database.

`assets/data/sqlite/retired-basic-french.json` likewise preserves the 309 cards
from `fiszki_francuski_podstawowe_poprawione` (version 1) for backup restoration.
Keep its external IDs, positions, and answers unchanged. New installations use
the French 50, 150, and 332 word packs instead.

`assets/data/sqlite/retired-basic-spanish.json` preserves the 310 cards from
`fiszki_hiszpanski_podstawowe_poprawione` (version 1) for backup restoration.
Keep its external IDs, positions, and answers unchanged. New installations use
the Spanish 50, 150, and 327 word packs instead.

Run path validation to ensure no code references legacy asset locations:

```bash
npm run assets:check-paths
```
