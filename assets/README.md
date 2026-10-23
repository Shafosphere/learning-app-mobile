# Zasoby aplikacji

Grafiki są podzielone według przeznaczenia:

| Folder | Zawartość |
| --- | --- |
| `app/` | Ikony aplikacji, powiadomień i splash screen; konfiguracja w `app.json` |
| `learning/flashcards/` | Obrazki kursów: `road-signs`, `common-vocabulary`, `birds` |
| `ui/navigation/` | Aktualne ikony dolnego menu |
| `ui/settings/previews/` | Podglądy układu aplikacji i sterowania |
| `ui/onboarding/` | Ilustracja systemu Leitnera; edytowalny SVG w `sources/` |
| `ui/stats/` | Tarcze i elementy statystyk, w tym grafiki w `streak/` |
| `ui/achievements/` | Współdzielone grafiki osiągnięć |
| `mascot/box/` | Części maskotki: `body`, `face`, `cards`, `props` |
| `nieuzywane/` | Archiwum do ręcznej oceny; nie importować w aplikacji |
| `flags/`, `audio/`, `fonts/`, `data/` | Flagi, dźwięki, fonty i dane |

Nowe zasoby dodawaj do folderu odpowiadającego ich funkcji. Nazwy nowych grafik
interfejsu zapisuj małymi literami, z myślnikami. Unikaj folderów ogólnych
`images`, `illustrations`, `new` i `old`.

## Obrazki kursów

Importy są w `src/constants/imageMaps.ts`. Klucze map i nazwy obrazków są
powiązane z danymi kursów i zapisanymi kartami. Przy przenoszeniu pliku zmieniaj
ścieżkę importu, zachowując klucz, np. `A/A-1.svg` lub `apple.webp`.
Folder `common-vocabulary` jest współdzielony przez kursy różnych języków.
Znaki obecne w mapie, lecz nieobecne w aktualnej bazie, pozostają dostępne.

`npm run assets:birds` pobiera oryginały do `learning/flashcards/birds/source/`.
`npm run assets:birds:optimize` zapisuje WebP bezpośrednio w `learning/flashcards/birds/`.
`npm run assets:a1:optimize -- /ścieżka/do/png` zapisuje WebP w `common-vocabulary/`.
Zachowuj również informacje o autorach i licencjach w danych atrybucji.

## Kontrola i archiwum

`npm run assets:check-paths` sprawdza stare ścieżki i odwołania do archiwum.
Manifest migracji z 23.10.2026 jest w `audyt-grafik.csv` w katalogu projektu:
zawiera stare i aktualne ścieżki oraz sumy SHA-256 wszystkich 432 plików.

W archiwum zachowano oryginalne pliki i dokumentację pochodzenia ikon menu.
Brak importu nie oznacza uszkodzenia pliku. Usuwanie wymaga ręcznej decyzji
właściciela projektu. Grafiki pozostają wyłącznie lokalnie: `.gitignore`
wyklucza pliki obrazów, bez wyjątków dla ikon lub onboardingu.
Przechowuj osobną kopię zapasową; po sklonowaniu repozytorium trzeba przywrócić
grafiki z tej kopii.
