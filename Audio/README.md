# Audio kursów

System nagrań MP3 oficjalnych kursów: generowanie przez Google TTS, biblioteka
nagrań, przygotowanie paczek Play Asset Delivery oraz pobieranie i odtwarzanie
w aplikacji. Starsze dźwięki interfejsu pozostają w `assets/audio/ui/`.

## Mapa katalogów

| Katalog | Zawartość |
| --- | --- |
| [generator/](generator/) | Generator Google TTS, konfiguracje głosów, testy, lokalne wyniki i stan budżetu |
| [tools/](tools/) | Mapowanie nagrań do fiszek, katalog, raporty, paczki Androida i weryfikacja AAB |
| [content/](content/) | Konfiguracja kursów i paczek, receptury, metadane oraz biblioteka MP3 |
| [runtime/](runtime/) | Pobieranie, odtwarzanie, głos urządzenia, komponenty audio, katalog i testy aplikacji |
| [modules/](modules/) | Natywny moduł Android/Kotlin dla Play Asset Delivery |
| [plugins/](plugins/) | Plugin Expo przygotowujący paczki podczas prebuild |
| [docs/](docs/) | Instrukcja PAD i pierwotny plan dostarczania treści |

Ekrany kursów i fiszek korzystają z importów `@/Audio/runtime/...`.
Expo wykrywa moduł przez `expo.autolinking.nativeModulesDir` w `package.json`;
plugin jest wskazany w `app.json`.

## Konfiguracja i dane

- `generator/config.json`: CSV, język, głos, tempo, limity i budżet syntezy.
  Ścieżki CSV i jawnie podanego `output` są względem głównego katalogu repozytorium.
- `content/courses.json`: kursy, źródłowe CSV, języki, receptury i grupy paczek.
- `content/packs.json`: kolejność grup i zasady współdzielenia nagrań.
- `content/recipes.json` oraz `content/recordings/`: parametry i metadane nagrań
  zarządzane przez generator/importer.
- `content/library/`: istniejące MP3; przebudowa katalogu nie generuje ich ponownie.
- `content/reports/` i `runtime/generated/catalog.json`: wyniki przygotowania danych;
  edytuj konfigurację źródłową zamiast tych plików.
- `generator/output/`: lokalne wyniki, manifesty i postęp generowania.
- `generator/state/`: trwały licznik budżetu i blokada generatora. Nie usuwaj
  ani nie zeruj licznika przy zmianie kursu lub konfiguracji.

MP3, wyniki generatora, jego stan i cache kompilacji są ignorowane przez Git.
Same metadane nie zastępują lokalnej biblioteki MP3 wymaganej do przygotowania AAB.
Paczki wynikowe powstają w projekcie `android/`.

## Komendy

Uruchamiaj z głównego katalogu repozytorium:

```bash
npm run audio:google:all -- --dry-run # podgląd; bez syntezy i zmiany budżetu
npm run audio:google                # płatna synteza: jedna partia
npm run audio:google:all            # płatna synteza: pozostałe partie
npm run audio:check                 # walidacja istniejących nagrań; bez zapisu
npm run audio:link                  # przebudowa katalogu i raportów
npm run audio:prepare -- --android  # katalog, raporty i paczki Androida
npm run audio:verify:aab            # kontrola gotowego release AAB
```

`audio:check`, `audio:link`, `audio:prepare` i `audio:verify:aab` nie wywołują
syntezy Google. Generator można też uruchomić z jego katalogu:
`node generate-google-tts.mjs --dry-run`.

## Weryfikacja

```bash
node --test Audio/tools/*.test.cjs Audio/generator/*.test.mjs
npx jest Audio/runtime/__tests__ --runInBand
npx tsc --noEmit
npm run lint
npx expo-modules-autolinking resolve --platform android --json
```

Testy generatora korzystają z tymczasowych plików i odpowiedzi testowych;
nie zużywają budżetu Google. Instrukcja budowania i testowania na urządzeniu:
[PAD audio](docs/pad-audio.md). Konfiguracja Google TTS:
[generator](generator/README.md). Pokrycie kursów:
[raport](content/reports/README.md).
