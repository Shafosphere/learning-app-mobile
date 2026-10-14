# MP3 do kursów — Google TTS

Generator czyta cały CSV, sprawdza istniejące nagrania i tworzy MP3 w partiach po
**do 50 brakujących nagrań**. `npm run audio:google:all` kontynuuje partie do końca
CSV po jednym uruchomieniu, z tempem do **150 żądań syntezy na minutę**.
Nie musisz podawać numerów wierszy ani wycinać kolejnych plików CSV.

Aktualna konfiguracja przygotowuje `French_B2.csv`: **3931 fiszek, 4229 unikalnych
tekstów/form**. Z istniejących nagrań wykorzystuje 17, więc do wygenerowania
pozostaje **4212 MP3 i 33 363 znaki** — 85 automatycznych partii (84 po 50 i
ostatnia 12), jeśli wszystkie żądania się powiodą. Użyj `npm run audio:google:all`.
Licznik wcześniejszego wykorzystania nie jest resetowany. Konfiguracja A1 została
zachowana w `Audio/generator/config.fr-a1.json`, A2 w `Audio/generator/config.fr-a2.json`,
a B1 w `Audio/generator/config.fr-b1.json`.

Poprzednie generowanie `French_A1.csv` obejmowało **865 fiszek, 1200 unikalnych
tekstów/form, 7594 znaki**. To 24 partie po 50, wykonywane automatycznie w trybie
`all`; istniejące MP3 są pomijane.
Te formy pokrywają wszystkie francuskie fiszki z kursów 50/150/332, zarówno z
polskimi, jak i angielskimi tłumaczeniami. Nie trzeba generować ich ponownie z
osobnych CSV. Same pełne pola A1 pokrywają 50/50, 142/150 i 310/332 tekstów EN;
pozostałe słowa znajdują się w polach z kilkoma formami.

## Codzienne użycie

Edytuj `Audio/generator/config.json`:

```json
{
  "csv": "tools/prebuild-data/en/jezyki/francuski/French_B2.csv",
  "column": "front_text",
  "language": "fr-FR",
  "voice": "fr-FR-Chirp3-HD-Aoede",
  "textMode": "variants",
  "limit": 50,
  "requestsPerMinute": 150,
  "project": "",
  "budget": {
    "totalRequests": 11000,
    "totalCharacters": 85000
  }
}
```

Dla kolejnego francuskiego CSV wystarczy zmienić `csv`. Dla innego języka zmień
również `language` i `voice`. Język nie jest zgadywany z tekstu. `project` może być
pusty, jeżeli masz ustawiony projekt w Google Cloud CLI; możesz też wpisać tutaj
Project ID (to identyfikator projektu, nie klucz ani token).

Poprzednia hiszpańska konfiguracja została zachowana w `Audio/generator/config.es.json`.
Możesz wybrać ją argumentem `--config Audio/generator/config.es.json`; wspólny licznik
budżetu i magazyn nagrań pozostają te same.

Z głównego katalogu aplikacji:

```bash
# Podgląd: istniejące nagrania, braki, wielkość i pierwsze teksty następnej partii.
npm run audio:google:all -- --dry-run

# Jedno uruchomienie: kontynuuj zapisany postęp do końca tego CSV.
npm run audio:google:all

# Jedna partia do 50 NOWYCH MP3.
npm run audio:google

# Następna partia — dokładnie ta sama komenda.
npm run audio:google
```

Zwykłe `audio:google` zatrzymuje się po jednej partii; `audio:google:all` (równoważne
`audio:google -- --all`) przechodzi przez wszystkie pozostałe partie bez klikania.
Tempo i globalna blokada obowiązują przez całe zadanie, także między partiami.
Żądania są rozłożone równomiernie, co najmniej około 0,4 sekundy między startami,
bez nadrabiania serią żądań po wolnej odpowiedzi. Rzeczywiste tempo może być niższe,
ponieważ przetwarzanie pozostaje sekwencyjne. `requestsPerMinute` można zmniejszyć
(1–150). Google podaje dla Chirp 3 limit 200 żądań/min na projekt:
[limity Google TTS](https://docs.cloud.google.com/text-to-speech/quotas).

Na końcu generator pokazuje postęp i liczbę brakujących nagrań. Kiedy cały CSV jest
gotowy, następne uruchomienie nie wywołuje Google ani nie pobiera tokenu.
`Ctrl+C` przerywa żądanie/oczekiwanie, zachowuje gotowe MP3 i zwalnia blokadę.
Ponów tę samą komendę, aby wznowić. Przy długich zadaniach token jest odświeżany
po 45 minutach. Tryb `all` nie generuje innych CSV ani nie przypisuje paczek PAD.

Przed pierwszą nową partią `fiszki_327.csv` podgląd pokazuje 50/327 gotowych,
277 brakujących i 50 nowych MP3 w następnej partii (od `0051: hola`). Do końca
potrzeba sześciu uruchomień: pięć po 50 i ostatnie 27, jeżeli wszystkie żądania
zakończą się poprawnie i ustawienia oraz dane nie zostaną zmienione.

## Tekst do przeczytania

Domyślna kolumna to `front_text`. Pole z przecinkiem jest jednym tekstem do syntezy:

```csv
external_id,front_text,back_text
0001,hola,cześć
0002,"hola, buenos días","cześć, dzień dobry"
```

Drugie pole tworzy **jeden MP3 z całą treścią `hola, buenos días`**. Nie rozdzielamy
przecinków na osobne nagrania; sposób wymówienia i pauzy zależy od wybranego głosu.
Pole z przecinkiem musi być poprawnie ujęte w cudzysłowy CSV. To zachowuje zgodność
nagrania z pełnym tekstem fizycznej strony fiszki w katalogu aplikacji.

`textMode: "variants"` rozdziela front na **średnikach i nowych wierszach**, tak
samo jak aplikacja rozdziela dopuszczalne formy. Nie rozdziela przecinków:

```csv
0038,fait; fais; fasse; faisons; fassent,do
```

Ten wiersz daje pięć MP3. Dotknięcie widocznego `fais` w aplikacji odtwarza tylko
`fais`. Powtórzona forma jest generowana raz i może być przypisana do kilku fiszek.
Postęp liczy osobno nagrania i fiszki: fiszka jest gotowa dopiero, gdy są dostępne
wszystkie jej formy. Partia może skończyć się w środku fiszki.

Bez `textMode` generator zachowuje poprzednie zachowanie `whole`: synteza całego
pola. Dla kolumny `back_text` tryb `variants` rozdziela też przecinki, zgodnie z
alternatywami odpowiedzi w aplikacji. W kursie z osobnymi formami ustaw odpowiednio
`frontAudioMode: "variants"` albo `backAudioMode: "variants"` w `courses.json`.

CSV musi zawierać `external_id` oraz wybraną kolumnę. Identyfikatory muszą być
niepuste i unikalne; dozwolone są litery ASCII, cyfry, `-` i `_`. Generator waliduje
cały CSV przed syntezą, także wiersze poza następną partią. Nie zmienia źródłowego CSV.

## Postęp i wznawianie

Wyniki domyślnie trafiają do:

```text
Audio/generator/output/<nazwa-CSV>-<głos>/
  <audioId>.mp3
  progress.json
  manifest.json
```

- `progress.json`: liczby wszystkich/gotowych/brakujących nagrań, liczby fiszek,
  rozmiar dotychczasowego audio i flaga `complete`.
- `manifest.json`: aktualne mapowanie fiszek na dostępne MP3; podczas generowania
  zawiera tylko gotowe wpisy, a `complete` ma wartość `false`.
- Oba pliki są aktualizowane po każdym zapisanym MP3 przez zapis tymczasowy i zmianę
  nazwy. Błąd nie kasuje wcześniej zakończonych nagrań.

Wspólny magazyn nagrań znajduje się w `Audio/content/library/<język>/`, a ich
receptury w `Audio/content/recipes.json`, a teksty, rozmiary i sumy kontrolne
w `Audio/content/recordings/<receptura>/<pierwszy-znak-ID>.json`.
Postęp przy każdym uruchomieniu jest wyliczany ponownie z faktycznie dostępnych
plików, nie z zapamiętanego numeru wiersza. Zmiana nazwy CSV lub kolejności fiszek
nie powoduje ponownej syntezy istniejących tekstów. Nowy folder wynikowy otrzyma
kopie istniejących nagrań ze wspólnego magazynu.

Identyfikator MP3 to SHA-256 tekstu, języka, głosu i konfiguracji syntezy. Te same
teksty z tą samą recepturą współdzielą MP3, także między kursami i różnymi
`external_id`. Zmiana tekstu albo głosu tworzy nowy identyfikator. Normalizujemy
Unicode do NFC i usuwamy spacje na brzegach; akcenty, wielkość liter i interpunkcja
pozostają znaczące. Uszkodzony plik z zapisanym checksumem zatrzymuje zadanie.

Po błędzie uruchom tę samą komendę. Zapisane MP3 zostaną pominięte. Jeżeli Google
przetworzyło żądanie, ale odpowiedź nie została zapisana (np. utrata połączenia),
ponowienie tego tekstu może być ponownie rozliczone. Nie ma automatycznych ponowień.

## Google Cloud — jednorazowe przygotowanie

1. W [Google Cloud Console](https://console.cloud.google.com/) wybierz lub utwórz
   projekt i włącz rozliczenia.
2. Włącz **Cloud Text-to-Speech API**, nie Speech-to-Text.
3. Zainstaluj [Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install).
4. Zaloguj się i ustaw projekt:

```bash
gcloud auth login
gcloud config set project TWOJ_PROJECT_ID
gcloud services enable texttospeech.googleapis.com --project TWOJ_PROJECT_ID
```

Generator pobiera krótkotrwały token przez `gcloud auth print-access-token`.
Przed syntezą sprawdza dostępność wybranego głosu. Podgląd nie uruchamia `gcloud`,
nie wykonuje żądań sieciowych i nie tworzy plików.

Oficjalne źródła: [pierwsze kroki](https://docs.cloud.google.com/text-to-speech/docs/get-started),
[katalog Chirp 3 HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd),
[cennik](https://cloud.google.com/text-to-speech/pricing).

## Argumenty i mniejsze próbki

Argumenty nadpisują konfigurację tylko na dane uruchomienie:

```bash
npm run audio:google -- --limit 5 --dry-run
npm run audio:google:all -- --requests-per-minute 150
npm run audio:google -- --project TWOJ_PROJECT_ID
npm run audio:google -- --csv tools/prebuild-data/en/jezyki/francuski/FR_fiszki_332.csv
npm run audio:google -- --config Audio/generator/config.es.json --dry-run
npm run audio:google -- --config /tmp/inny-kurs.json --dry-run
npm run audio:google -- --help
```

Dostępne: `--config`, `--csv`, `--column front_text|back_text`, `--language`,
`--voice`, `--text-mode whole|variants`, `--limit`, `--all`,
`--requests-per-minute 1–150`, `--output`, `--project`, `--dry-run`.
Ścieżki `csv` i `output` są względem głównego katalogu repozytorium; mogą być też
absolutne. `--config` jest względem bieżącego katalogu terminala. Bez argumentów
możesz również uruchomić `node generate-google-tts.mjs --dry-run` z `Audio/generator/`.

## Limity i wspólny licznik

- `limit` (1–50) ogranicza **nowe nagrania w partii**, a nie liczbę wierszy czytanych
  z CSV. W trybie `all` kolejne partie uruchamiają się automatycznie.
- Twardy limit partii: 50 nagrań i 5000 znaków. Dłuższe teksty mogą zmniejszyć partię.
- Jeden tekst/formę ograniczamy do 500 znaków; pole CSV ma do 5000 bajtów UTF-8.
- W konfiguracji `budget.totalRequests` i `budget.totalCharacters` określają wspólny
  łączny limit wszystkich uruchomień, CSV, folderów, języków i głosów.
  W aktualnej konfiguracji B2: **11 000 prób syntezy i 85 000 znaków**, w tym
  dotychczasowe próby hiszpańskie i francuskie A1/A2/B1. Domyślne limity dla konfiguracji bez `budget`
  pozostają 500 prób i 10 000 znaków.
- Dotychczasowy licznik `Audio/generator/state/generation-budget.json` pozostaje bez zmian.
  Zwiększenie limitu nie resetuje wykorzystania. Po wyczerpaniu przejrzyj licznik
  i zwiększ odpowiednią wartość w konfiguracji, jeżeli chcesz generować dalsze kursy.
- Próba jest zapisywana **przed** żądaniem. Timeout/przerwanie może nadal oznaczać
  rozliczoną syntezę, więc nie odejmujemy takiej próby z licznika.
- Cała zaplanowana partia musi mieścić się w pozostałym budżecie; w przeciwnym razie
  nie zaczynamy nowych żądań. Możesz wybrać mniejsze `limit`. W trybie `all` wszystkie
  brakujące MP3 muszą mieścić się w budżecie jeszcze przed rozpoczęciem syntezy.
  Tryb automatyczny nie podnosi ani nie resetuje budżetu.
- Globalna blokada `Audio/generator/state/generation.lock` uniemożliwia równoległe generatory,
  także dla różnych CSV. Niepoprawny licznik blokuje zadanie zamiast resetować budżet.
- Przetwarzanie jest sekwencyjne; pierwsze nieudane żądanie zatrzymuje partię.
  Timeout pojedynczego żądania HTTP wynosi 60 sekund.

Nie usuwaj `state/` przy zwykłym ponowieniu. Jeżeli po zabiciu procesu została
blokada, sprawdź jej PID i upewnij się, że generator już nie działa, zanim usuniesz
sam `generation.lock`. Nie usuwaj licznika budżetu. Limity są lokalną kontrolą
liczby żądań i znaków; nie ustawiają limitów rozliczeń całego projektu Google Cloud.

## Nagrania a pobieranie w aplikacji

Generator zapisuje nagrania we wspólnym magazynie. Komenda `audio:link` dopasowuje
teksty wszystkich zadeklarowanych kursów do receptur wskazanych w `Audio/content/courses.json`.
Polityka pakowania znajduje się w `Audio/content/packs.json`; pełne mapowania i listy członków
paczek są wyliczane. Konfiguracja aktualnej syntezy Google nie zmienia receptur innych kursów.

```bash
npm run audio:link -- --check
npm run audio:link
npm run audio:check
npm run audio:prepare -- --android
```

Dawne opcje linkera `--pack`, `--config`, `--language`, `--voice` usunięte. Opcje generatora
Google opisane wyżej pozostają dostępne. Polecenia linkera/przygotowania nie wywołują Google.

16 kursów korzysta z 10 436 MP3 w 11 paczkach: hiszpańskie uzupełnienia 50/150/327,
francuskie wspólne nagrania i uzupełnienia 50/150/332/A1/A2/B1/B2. Jeden MP3 należy do jednej
paczki. Kurs FR 50 wymaga około 0,52 MB źródłowych MP3; A1 5,22 MB, B2 20,71 MB.
Brakujące teksty nie dostają mapowania; aplikacja korzysta wtedy z głosu urządzenia.

Nowy kurs deklaruje slug, `csv`, języki stron, `frontRecipe`/`backRecipe`, tryby wariantów
oraz `packGroup`. Grupa musi istnieć w polityce rodziny. Czytelny raport zbiorczy:
`Audio/content/reports/README.md`; teksty i przypisania: osobny CSV każdego kursu.
Nie edytuj wygenerowanego katalogu aplikacji ani raportów.

Rozszerzenie paczek wymaga nowego AAB. Budowanie i testowanie: [PAD audio](../docs/pad-audio.md).
`Audio/generator/output/` i `Audio/generator/state/` są lokalne; `Audio/content` zawiera źródła buildów.

## Weryfikacja narzędzia

```bash
node --test Audio/generator/generate-google-tts.test.mjs Audio/generator/generation-safety.test.mjs Audio/generator/rate-limit.test.mjs Audio/tools/catalog.test.cjs Audio/tools/link-courses.test.cjs
```

Testy używają tymczasowych magazynów i zastępczych odpowiedzi API. Sprawdzają partie,
postęp, wznowienie po błędzie, zmianę/reorganizację CSV, tekst z przecinkiem,
współdzielenie nagrań, brak sieci/zapisu w podglądzie, automatyczne partie,
tempo na granicy partii, przerwanie oczekiwania, odświeżanie tokenu oraz trwałe
limity i blokadę. Wirtualny zegar testowy nie powoduje rzeczywistego czekania.
Nie zużywają rzeczywistego budżetu ani nie mierzą jakości głosu Google.
