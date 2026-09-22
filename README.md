## Image attributions

Image-attribution TSV files live in `tools/prebuild-data`. Register each course in
`tools/attributions/courseRegistry.ts`, then run:

```bash
npm run assets:attributions
```

This writes `src/data/generatedImageAttributions.ts`, bundled for offline use. TSV
requires existing columns and accepts optional `tytul_do_atrybucji` and `opis_zmian`.
Generator validates required data, duplicate IDs, and URLs before replacing output.
