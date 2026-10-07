## Prebuild data

Polish source files in `tools/prebuild-data/pl` are grouped by topic:

- `jezyki/angielski`, `jezyki/francuski`, `jezyki/hiszpanski` — language decks; English plural review exports live in `jezyki/angielski/plural`.
- `geografia/flagi`, `geografia/panstwa_i_stolice` — flags and capitals.
- `przyroda/astronomia`, `przyroda/ptaki` — astronomy and birds, including the bird attribution TSV.
- `historia` — Polish history and Greek mythology.
- `matematyka`, `informatyka`, `znaki_drogowe` — math, programming and road signs.

Official pack `csvFile` paths in `tools/scripts/build-prebuilt-db.ts` are relative to their locale directory. Keep these paths up to date when moving source files.

## Image attributions

Image-attribution TSV files live in `tools/prebuild-data`. Register each course in
`tools/attributions/courseRegistry.ts`, then run:

```bash
npm run assets:attributions
```

This writes `src/data/generatedImageAttributions.ts`, bundled for offline use. TSV
requires existing columns and accepts optional `tytul_do_atrybucji` and `opis_zmian`.
Generator validates required data, duplicate IDs, and URLs before replacing output.
