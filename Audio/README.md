# Audio PAD — jedna paczka na język

## Źródła i generowanie

`Audio/content/courses.json` określa CSV, języki stron, receptury i tryby wariantów.
`recipes.json` oraz `recordings/` opisują istniejące nagrania w `library/`.
Nie ma konfiguracji grup ani listy paczek. Generator zbiera unikalne nagrania
wykorzystywane przez wszystkie zadeklarowane kursy i grupuje według podstawowego
kodu języka, używając wspólnego `Audio/language.js`.

`en-US` i `en-GB` trafiają do `audio_en`, zachowując osobne audioId, głosy i pełne
kody językowe. Nagrania nieprzypisane do kursów nie trafiają do paczek. Puste paczki
nie powstają. Limit generatora: 100 języków/paczek.

Obecnie: 24 kursy, 16 590 nagrań, 3 paczki on-demand:

| Paczka | Źródłowe MP3 |
| --- | ---: |
| audio_en | 27,47 MB |
| audio_es | 1,52 MB |
| audio_fr | 47,52 MB |

Rozmiar z Google Play ma pierwszeństwo przed źródłową sumą MP3 w interfejsie.
Katalog zachowuje `requiredPacks` kursu i dodaje `languages` (kod → nazwa paczki)
oraz `language` każdej paczki. Kurs może wymagać dwóch języków, jeśli obie strony
mają receptury i dopasowane nagrania. Braki nadal trafiają do raportów i używają
syntezy urządzenia; panel nie oznacza kompletności wygenerowania całej biblioteki.

## Dodawanie języka lub kursu

1. Wygeneruj/importuj MP3 istniejącym narzędziem Google TTS; nagrania i receptura
   muszą znaleźć się we wspólnej bibliotece. Samo przygotowanie PAD nie wywołuje TTS.
2. Dodaj kurs do `Audio/content/courses.json`: slug, `csv`, `frontLanguage`,
   `backLanguage`, `frontRecipe` i/lub `backRecipe`, opcjonalne tryby wariantów.
   Nie dodawaj `packGroup`. Nie trzeba edytować komponentów, pakowania ani Gradle.
3. Uruchom:

```bash
npm run audio:check
npm run audio:prepare
npm run audio:prepare -- --android
```

Ostatnia komenda przygotowuje istniejący katalog Androida. Plugin Expo robi to
samo podczas prebuild. Nowy język tworzy np. `audio_de`; nowy kurs niemieckiego
rozszerza tę samą paczkę. Wyniki: katalog runtime, raport zbiorczy
`docs/audio/content/reports/README.md`, raporty CSV w `Audio/content/reports/`.
Nie edytuj wygenerowanych plików ręcznie. `audio:link` także przebudowuje katalog
wszystkich kursów, aby współdzielone nagrania nie pozostawiały starych mapowań.

## Interfejs

Panel pod nagłówkiem języka na ekranie aktywacji występuje raz na paczkę, przed
listą kursów. Te same panele dostępne są w ustawieniach audio oficjalnego kursu.
Wspólny stan jest kluczowany nazwą paczki: oba miejsca pokazują ten sam postęp,
pobranie i anulowanie. Samo otwarcie ekranu, aktywacja kursu lub włączenie audio
nie pobierają plików. Transfer rozpoczyna przycisk. Anulowanie dotyczy całego języka.

Panel używa kolorów motywu, skalowania czcionek i stylu kart aplikacji. Stały obszar
statusu i pasek postępu ograniczają zmiany wysokości. Potwierdzenie Wi-Fi i dialog
instalacji Play są odrębnymi stanami. Błędy miejsca/sieci pozwalają ponowić transfer.

Gotowość nadal sprawdza natywne `checkPackReady(name, expectedManifestHash)`:
manifest, obecność i rozmiary plików. Odtwarzanie sprawdza pojedynczy plik i w razie
braku używa syntezy urządzenia. Odświeżenie po powrocie z tła sprawdza ponownie stan.

## Migracja i wydanie

Paczki `audio_en`, `audio_fr`, `audio_es` zastępują dawne poziomy, `shared` i `core`.
Stare pobranie nie oznacza gotowości nowej paczki. Użytkownik pobiera nowy język
ręcznie, bez kopiowania plików i bez zmian postępów lub ustawień kursów.
Nie kasujemy ręcznie plików zarządzanych przez Play na urządzeniu.

Przygotowanie Androida usuwa wyłącznie własne nieaktualne moduły (znacznik
`.audio-pack-owned`, a dla dawnych core także rozpoznawany plik Gradle).
Rejestracja Gradle jest idempotentna i zachowuje konfigurację podpisywania.
Historyczna migracja v1 również korzysta z nowego generatora językowego.

Zmiana wymaga nowego buildu Androida/AAB z odpowiadającym mu katalogiem JS.
Nie wysyłaj nowego katalogu przez OTA do starego buildu. Przed publikacją zwiększ
versionCode. Upload/publikacja w Google Play nie są częścią przygotowania audio.

## Weryfikacja

```bash
node --test Audio/tools/*.test.cjs Audio/generator/*.test.mjs
npx jest Audio/runtime/__tests__ --runInBand
npx tsc --noEmit
npm run lint
npm run audio:prepare -- --android
cd android
JAVA_HOME=/home/qswyk/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2 ./gradlew :play-asset-delivery:testDebugUnitTest :app:bundleRelease
cd ..
npm run audio:verify:aab
```

Weryfikator AAB odrzuca dodatkowe/stare moduły audio i sprawdza manifesty, sumy MP3
oraz brak duplikatów. Testy źródeł nie wywołują Google TTS.

Emulator Androida jest uruchomiony i można wykorzystać go przez ADB. Na aktualnym
buildzie obejrzyj ekran aktywacji i ustawienia, zapisz zrzuty oraz sprawdź oba motywy,
orientacje i długie tłumaczenia. Expo Go udostępnia jedynie podgląd stanów, bez MP3.

Rzeczywisty transfer sprawdź przez bundletool `build-apks --local-testing
--connected-device` i `install-apks`, a następnie osobno przez testową ścieżkę Play.
Sprawdź świeżą instalację i aktualizację ze starymi pobraniami: bez automatycznego
transferu, po pobraniu cały język dostępny wszystkim kursom, również po restarcie
i offline. Zweryfikuj zachowanie starych paczek na urządzeniu po aktualizacji Play.
Lokalna instalacja nie potwierdza zachowania aktualizacji przez sklep.

## Wynik weryfikacji implementacji — 2026-11-17

- Testy źródeł audio/generatora: wszystkie 6 plików testowych przeszło.
- Testy aplikacji: 223 testy w 13 zestawach przeszły; testy panelu ponowione po korekcie kontrastu.
- TypeScript: bez błędów. Lint: bez błędów; istniejące ostrzeżenie `import/first`
  w `LeitnerIntroScreen.tsx`, poza zakresem zmian audio.
- Gradle: testy modułu PAD, `bundleDebug` i `assembleDebug` zakończone powodzeniem.
- Weryfikacja debug AAB: dokładnie 3 paczki, 16 590 MP3, poprawne manifesty i checksumy,
  brak duplikatów lub starych modułów.
- Interfejs sprawdzany na emulatorze w Expo Go: telefon w pionie, tablet w poziomie,
  motywy jasny/ciemny, ekran aktywacji i ustawienia audio. Podgląd nie dostarcza MP3.
- Zestaw APK do lokalnego testu PAD przygotowany przez bundletool. Instalację
  jako aktualizację zablokował brak miejsca w emulatorze (około 245 MB wolnego).
  Czyszczenie odtwarzalnych cache przez Androida nie zwolniło wystarczającej przestrzeni.
  Rzeczywisty transfer PAD, odsłuch offline oraz aktualizacja przez testową ścieżkę
  Google Play pozostają do sprawdzenia na urządzeniu z wolnym miejscem.
