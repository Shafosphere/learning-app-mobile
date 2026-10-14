# Audio kursów — Play Asset Delivery

Aktualny format: **v2**. 10 436 MP3, 16 kursów, 11 paczek on-demand.
Migracja zachowała wszystkie identyfikatory, checksumy i przypisania; nie wywołuje Google.

## Co edytować, co generować

| Miejsce | Rola | Edycja |
| --- | --- | --- |
| `Audio/content/courses.json` | CSV, języki stron, receptury, warianty, grupa pakowania | Ręczna konfiguracja |
| `Audio/content/packs.json` | Kolejność grup i polityka wspólnych nagrań | Ręczna konfiguracja |
| `Audio/content/recipes.json` | Język, głos, format i parametry syntezy | Zarządzane przez importer/generator; referencje używane przez kursy |
| `Audio/content/recordings/<receptura>/<pierwszy-znak-ID>.json` | Tekst, rozmiar i checksum każdego MP3 | Zarządzane przez importer/generator |
| `Audio/content/library/<język>/<audioId>.mp3` | Kanoniczne pliki nagrań | Zachować istniejące pliki |
| `Audio/content/reports/README.md` | Liczby, braki, rozmiary i zależności kursów | Generowany raport do czytania |
| `Audio/content/reports/<slug>.csv` | Fiszka, strona, tekst/formę, ID i paczka | Generowany raport do czytania |
| `Audio/runtime/generated/catalog.json` | Kompaktowe dane dla aplikacji | Generowany; nie edytować ręcznie |

Mapowania fiszek i listy członków paczek wynikają z konfiguracji i CSV. Nie przechowujemy
ich ponownie w źródłach. Każdy kurs wskazuje `frontRecipe` i/lub `backRecipe`;
brak receptury po stronie oznacza użycie głosu urządzenia. Receptura musi odpowiadać językowi strony.
`frontAudioMode: "variants"` dzieli średniki i nowe linie; przecinek pozostaje częścią frazy.
Warianty tylnej strony dzielą też przecinki, zgodnie z parserem odpowiedzi aplikacji.

ID nagrania to SHA-256 receptury z tekstem; checksum MP3 to osobny hash.
Normalizacja: NFC oraz usunięcie spacji na brzegach. Zachowujemy akcenty, wielkość liter
i interpunkcję. Przy zmianie tekstu fiszki resolver nie odtwarza starego MP3.

## Przygotowanie danych

```bash
npm run audio:link -- --check
npm run audio:link
npm run audio:check
npm run audio:prepare -- --android
```

Linker korzysta z receptur zadeklarowanych w kursach, nie z aktualnie wybranego CSV generatora Google.
Regeneruje wszystkie kursy i raporty. Dawne opcje linkera `--pack`, `--config`, `--voice`
i `--language` usunięte; te opcje generatora Google pozostają odrębną konfiguracją syntezy.
Żadne z powyższych poleceń nie wywołuje Google.

`--check` nie zapisuje plików; połączenie z `--android` albo `--import` jest odrzucane.
`npm run audio:prepare -- --import path/to/manifest.json` importuje istniejące MP3.
Nagrania niepasujące jeszcze do kursów pozostają w bibliotece, bez dodawania do AAB.
Dodanie kursu wymaga konfiguracji receptury oraz `packGroup`; nowa grupa musi występować
w polityce rodziny w `packs.json`. Zależności pakietów wylicza generator.

Migracja dawnych źródeł: `node Audio/tools/migrate.cjs`. Waliduje wszystkie MP3 i porównuje
pełne mapowania przed zapisem. Usuwa monolityczny `recordings.json` dopiero po kontroli
odczytu nowego rejestru; dla v2 wykonuje wyłącznie walidację.

## Podział paczek

Hiszpański: `audio_es_50`, `audio_es_150`, `audio_es_327` — kolejne uzupełnienia.
Francuski: `audio_fr_shared` zawiera nagrania używane przez co najmniej dwa poziomy A1–B2.
Reszta trafia kolejno do `audio_fr_50`, `audio_fr_150`, `audio_fr_332`, `audio_fr_a1`,
`audio_fr_a2`, `audio_fr_b1`, `audio_fr_b2`; każda grupa dostaje tylko nagrania wcześniej
nieprzypisane. Każdy MP3 należy do jednej paczki. PL/EN współdzielą te same pliki.

| Francuski kurs | Wszystkie wymagane MP3, MB |
| --- | ---: |
| 50 słów | 0,52 |
| 150 słów | 0,98 |
| 332 słowa | 1,56 |
| A1 | 5,22 |
| A2 | 7,52 |
| B1 | 15,43 |
| B2 | 20,71 |

To rozmiary źródłowych MP3. Rzeczywisty transfer pochodzi z PAD i obejmuje manifest.
Przycisk kursu pobiera tylko brakujące paczki. Postęp agregowany; gotowe paczki zachowane
przy ponowieniu. Anulowanie zatrzymuje niezakończone transfery tego kursu, także współdzielone
z innymi kursami. Wiersze obserwują wspólny stan, również po opuszczeniu ekranu.

„Audio offline” wymaga gotowości wszystkich zależności. Native sprawdza paczkę jednym
`checkPackReady(name, expectedManifestHash)` poza wątkiem UI: lokalizacja, hash manifestu,
obecność i rozmiary wszystkich plików. Checksumy treści MP3 sprawdzane podczas przygotowania
i weryfikacji AAB. Odtwarzanie nadal sprawdza pojedynczy plik; brak uruchamia głos urządzenia.
Kontrole współbieżne są łączone; gotowość unieważniana przy zdarzeniach i wznowieniu aplikacji.

Paczki v1 `audio_es_core` i `audio_fr_core` nie są używane przez nowy katalog.
Aktualizacja nie uruchamia automatycznego pobierania. Ponowne pobranie wymaga kliknięcia.
Ścieżki PAD i MP3 nie wchodzą do kopii zapasowej postępów.

## Android / AAB

Plugin Expo odtwarza rejestrację paczek podczas prebuild. Dla istniejącego projektu użyj
`audio:prepare -- --android`; nie potrzebujesz `prebuild --clean`. Oznaczone bloki Gradle
zachowują konfigurację podpisywania. Narzędzie usuwa wyłącznie własne nieaktualne paczki.

Użyj JDK 17 i istniejącego `android/keystore.properties`:

```bash
npm run audio:prepare -- --android
cd android
JAVA_HOME=/home/qswyk/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2 ./gradlew :play-asset-delivery:testDebugUnitTest :app:bundleRelease
cd ..
npm run audio:verify:aab
```

Weryfikator sprawdza dokładne manifesty, checksumy wszystkich MP3 i brak duplikatów
w bazowej aplikacji lub innych modułach. Zmiana paczek wymaga nowego AAB.
Nowy development client wymagany dla `checkPackReady`. Expo Go i starsze klienty mogą
pokazać wyłącznie preview w development: symulacja stanu, bez pobierania i bez MP3.
Release nie symuluje pobierania.

## Testy i odbiór

```bash
node --test Audio/tools/*.test.cjs Audio/generator/*.test.mjs
npx jest Audio/runtime/__tests__ --runInBand
npx tsc --noEmit
npm run lint
```

Testy generatora używają tymczasowych bibliotek i fałszywych odpowiedzi; nie zużywają budżetu Google.
Automatyczne kontrole obejmują zgodność migracji, warianty, rozmiar katalogu, deterministyczność,
jedno członkostwo, częściową gotowość, współdzielenie, retry, anulowanie i blokady dialogów.

Odbiór urządzenia / Google Play wymaga osobnego sprawdzenia:

1. Kurs FR 50 pokazuje mały transfer; samo otwarcie ekranu nie pobiera plików.
2. PL/EN widzą ten sam stan. Gotowość jednej paczki nie daje pełnego „Audio offline”.
3. Anulowanie i retry zachowują pobrane paczki. Postęp nie zmniejsza mianownika w trakcie.
4. Gotowe MP3 działają w trybie samolotowym. Zmieniona fiszka używa głosu urządzenia.
5. Wi-Fi consent i Play installation confirmation pozostają różnymi akcjami; dialog dopiero po kliknięciu.
6. Nawigacja, zmiana fiszki i tło zatrzymują odtwarzanie; szybkie dotknięcia nie nakładają nagrań.
7. Aktualizacja z v1 nie pobiera samodzielnie nowych paczek; brak nagrań nie blokuje nauki.

Do lokalnej instalacji można użyć bundletool `build-apks --local-testing --connected-device`
i `install-apks`, najlepiej dla debug AAB na urządzeniu testowym. Lokalny test nie zastępuje
instalacji i aktualizacji przez Google Play. Przed publikacją zwiększ `versionCode`;
upload i publikacja nie należą do narzędzi przygotowania audio.

Logi `[PAD]` zachowują statusy, błędy i przebieg dialogów bez tekstów fiszek ani danych użytkownika;
są dołączane do lokalnej historii debug oraz wybranego załącznika diagnostycznego.

Źródła: [integracja PAD](https://developer.android.com/guide/playcore/asset-delivery/integrate-java),
[testowanie PAD](https://developer.android.com/guide/playcore/asset-delivery/test).
