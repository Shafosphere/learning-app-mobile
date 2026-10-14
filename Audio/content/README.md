# Audio: mapa plików

**Do przeglądania:** [raport kursów i paczek](reports/README.md). Każdy kurs ma też
CSV w `reports/`: teksty, strony fiszek, pełne ID nagrań, paczki oraz brakujące formy.

**Do konfiguracji:**

- `courses.json`: źródłowe CSV, języki, receptury i grupy kursów.
- `packs.json`: kolejność grup w każdej rodzinie; nagrania wspólne poziomów francuskich.
- `recipes.json`: wspólne parametry głosów; klucze wskazywane przez kursy.

**Zarządzane przez narzędzia:**

- `recordings/<receptura>/<pierwszy-znak-ID>.json`: tekst, rozmiar, checksum MP3.
- `library/<język>/<audioId>.mp3`: istniejące nagrania, bez zmian podczas przebudowy katalogu.
- `reports/` i katalog w `Audio/runtime/generated/`: wyniki generowania.

```bash
npm run audio:check                 # walidacja, bez zapisu
npm run audio:link                  # przeliczenie mapowań i raportów
npm run audio:prepare -- --android  # katalog, raporty i paczki Androida
```

Te komendy nie uruchamiają syntezy Google. Pełna instrukcja: [PAD audio](../docs/pad-audio.md).
