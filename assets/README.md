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

## Integrity check

Run path validation to ensure no code references legacy asset locations:

```bash
npm run assets:check-paths
```
