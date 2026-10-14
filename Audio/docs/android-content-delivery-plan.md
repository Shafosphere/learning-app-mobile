# Pobierane pakiety treści na Androidzie — propozycja

Status: pierwotna propozycja. Pilot PAD dla dwóch kursów hiszpańskich po 50 słów wdrożony; aktualna konfiguracja i testy: [pad-audio.md](pad-audio.md).

Dalsze punkty opisują propozycje rozszerzenia poza pilot.
Data: 2026-10-13.
Zakres: Android. Pierwsze wdrożenie dotyczy gotowych nagrań oficjalnych kursów językowych.

## Proponowana decyzja

Zachować teksty wszystkich kursów oraz obecne obrazki w aplikacji. Wprowadzić osobny system dostępności nagrań i dostarczać większe pakiety audio na żądanie. Play Asset Delivery (PAD) jest kandydatem do transportu; decyzję potwierdza prototyp z rzeczywistym AAB i instalacją przez Google Play.

Nie uzależniać możliwości nauki, powtórek ani postępów od pobrania audio. Nagrania są dodatkową jakością odczytu. Gdy ich brak, działa expo-speech, o ile telefon udostępnia odpowiedni głos; bez głosu nadal można uczyć się z tekstu i obrazków.

## Stan obecny i konsekwencje

- `assets/data/sqlite/prebuilt.db`: 4 341 760 bajtów, około 4,3 MB nieskompresowanego pliku. To nie rozmiar całej aplikacji ani jej pobrania z Play.
- W tej bazie jest 17 768 fiszek językowych. Szacunek audio 142–426 MB dla obu stron zakłada 1–3 sekundy na nagranie i MP3 32 kb/s. Nie jest pomiarem wygenerowanych plików; nie uwzględnia współdzielenia nagrań.
- `src/db/sqlite/init.ts` importuje bazę i synchronizuje oficjalne treści z zachowaniem lokalnych danych.
- `src/constants/imageMaps.ts` zawiera statyczne `require()` plików obrazków. Samo dodanie mechanizmu pobierania nie usuwa tych plików z bazowego pakietu.
- Hydratacja obrazków w `init.ts` kopiuje je do katalogu aplikacji i zapisuje lokalne URI w bazie. W przyszłości trzeba rozróżnić obrazki użytkownika i współdzielone zasoby oficjalne, zanim przeniesiemy je do PAD.
- Przypięcie kursu, wybranie aktywnego kursu i dostępność nagrań to trzy różne stany. Dwa pierwsze już istnieją; trzeci należy dodać niezależnie.

## Podział zawartości

| Zawartość | Pierwsze wdrożenie | Powód |
|---|---|---|
| Interfejs, fonty, logo, dźwięki aplikacji | W bazowej aplikacji | Potrzebne natychmiast |
| Katalog kursów i teksty fiszek | W bazowej aplikacji | Małe względem audio; katalog, nauka i powtórki działają offline |
| Obecne ilustracje do fiszek | W bazowej aplikacji | Zachowują dotychczasowy przebieg nauki, szczególnie fiszki bez pytania tekstowego |
| Niewielkie nagrania startowe | Opcjonalnie w bazowej aplikacji | Pierwsza lekcja z dobrym głosem bez oczekiwania |
| Pozostałe nagrania oficjalne | Pakiety on-demand | Pobierane tylko dla wybranej nauki |
| Postępy, własne fiszki i ich media | Lokalna baza i obecny mechanizm kopii zapasowej | Dane użytkownika, niezależne od PAD |

Na prototyp wystarczy audio do jednego kursu „First 50 words”. Po wyborze głosu i pomiarach można dołączyć do bazowej aplikacji nagrania pierwszych 50 słów angielskich, francuskich i hiszpańskich. Budżet na te nagrania należy ustalić po wygenerowaniu; na dziś orientacyjnie kilka MB, zależnie od liczby stron i wariantów języka.

## Jak dzielić nagrania

Jednostką widoczną dla użytkownika jest kurs, ale jeden kurs nie musi odpowiadać jednemu fizycznemu pakietowi PAD.

1. Współdzielić identyczne nagrania w tym samym języku, głosie i konfiguracji. Klucz nagrania zależy od tekstu, języka, modelu, lektora i ustawień syntezy.
2. Francuskie `tête` powinno mieć jedno nagranie współdzielone przez kurs francusko-polski i francusko-angielski, jeśli oba korzystają z tej samej konfiguracji.
3. Kursy 50/150/332 słowa mogą korzystać ze wspólnego rdzenia i kolejnych rozszerzeń. Nie pakować tych samych pierwszych 50 słów trzy razy.
4. Duże kursy dzielić najpierw według języka i poziomu, np. francuski A1, A2, B1, B2. Dalszy podział poziomu wprowadzić dopiero, gdy zmierzony rozmiar lub czas oczekiwania tego wymaga.
5. Początkowo pobierać całą zawartość audio wybranego kursu. Pobieranie kolejnych kilkudziesięciu fiszek podczas nauki zwiększa liczbę zależności i ryzyko niespójnej dostępności offline.
6. Nie tworzyć jednego pakietu obejmującego wszystkie francuskie kursy ani osobnego pakietu dla każdej fiszki.

Deduplikacja nie może wymuszać pobierania wielkiego słownika języka dla małego kursu. Małe współdzielone pakiety startowe mają sens; dla dużych poziomów można zaakceptować niewielkie powielenie kilku nagrań, jeśli poprawia niezależność pobierania i usuwania.

Dobór języka musi opierać się na metadanych konkretnego tekstu. Manifest mapuje strony fiszki na identyfikatory nagrań i ich języki. Kierunek ćwiczenia nie jest wystarczającą informacją, co pokazał tryb wprowadzania fiszek obrazkowych.

## Proponowany przebieg użytkownika

### Pierwszy start i onboarding

- Start i wybór języka interfejsu nie uruchamiają pobierania wszystkich treści.
- Katalog kursów działa z lokalnych danych.
- Przypięcie kursu oznacza zainteresowanie, bez automatycznego pobierania nagrań dla każdego przypiętego kursu.
- Pierwsze pobranie proponujemy po wyborze kursu do nauki. Małe nagrania startowe, jeśli zostały dołączone do aplikacji, działają od razu.

### Uruchamianie kursu

W istniejącym przepływie wyboru/aktywowania kursu albo na ekranie jego ustawień wejściowych wyświetlić sekcję:

> Nagrania lektora
> Pobierz nagrania do tego kursu, aby korzystać z nich offline.
> Pobierz · 8 MB
> Rozpocznij z głosem urządzenia

8 MB jest przykładem wyglądu komunikatu. Rzeczywisty rozmiar pochodzi z brakujących pakietów, a nie ze stałej etykiety.

- Pobieranie jest opcjonalne. Pozostawić możliwość natychmiastowego rozpoczęcia nauki.
- Po jego wybraniu pokazać postęp w tym samym miejscu. Nie dodawać osobnego obowiązkowego kreatora.
- Jeżeli użytkownik przejdzie do nauki podczas pobierania, zadanie pozostaje widoczne w szczegółach kursu. Dostępne nagrania można wykorzystywać po ukończeniu i sprawdzeniu danego pakietu.
- Onboardingowe kursy otwierane z pominięciem normalnej aktywacji muszą przechodzić przez tę samą usługę sprawdzania dostępności audio.

### Nauka i powtórki

- Gdy nagranie jest dostępne, „Posłuchaj” odtwarza gotowy plik.
- Gdy brak nagrania, można użyć expo-speech. Źródło głosu powinno być czytelne, np. w podpowiedzi przy przycisku.
- Przy pierwszym użyciu odczytu bez nagrań można pokazać krótką propozycję pobrania. Nie powtarzać jej dla każdej fiszki.
- Nie uruchamiać pobrania pojedynczego pliku dopiero po każdym dotknięciu „Posłuchaj”.
- Powtórki nie blokują się przez brak audio. Propozycja pobrania wskazuje rozmiar pakietów dla konkretnego kursu.

### Zarządzanie miejscem

W ustawieniach dodać „Pobrane nagrania”, z listą kursów, dostępnością offline i rozmiarem danych.

- „Usuń nagrania” nie usuwa kursu, postępów, historii ani własnych fiszek.
- Odpięcie kursu nie usuwa automatycznie audio. To odrębna, jawna decyzja użytkownika.
- Przed usunięciem współdzielonego pakietu pokazać, które inne kursy utracą nagrania offline. Nie obiecywać zwolnienia całego rozmiaru jednego kursu, jeżeli pliki nadal obsługują drugi.
- Nie usuwać automatycznie nagrań dla aktywnej nauki i powtórek w pierwszej wersji.
- „Pobierz wszystkie” można dodać później, z łącznym rozmiarem.

## Play Asset Delivery a własny serwer

PAD dostarcza zasoby publikowane razem z Android App Bundle przez Google Play. Umożliwia install-time, fast-follow i on-demand; Google hostuje pakiety. Dla dużych nagrań proponujemy on-demand. Fast-follow pobiera po instalacji, więc użycie go dla wszystkich języków nie realizowałoby celu oszczędzenia transferu i miejsca.

Własny hosting/CDN jest alternatywą, jeżeli treści mają być publikowane niezależnie od wersji aplikacji lub dostarczane poza Google Play. Daje większą swobodę aktualizacji, ale wymaga obsługi hostingu, pobierania, weryfikacji i wersji.

Dla obecnego zakresu — Android i oficjalne zasoby aktualizowane z aplikacją — PAD jest rozsądnym pierwszym wariantem. Gotowa architektura rozwiązywania zasobów powinna pozwalać zmienić transport bez zmiany ekranów nauki.

PAD to transport i cykl życia plików. Nie importuje sam fiszek do SQLite, nie przypina kursów i nie dobiera języka lektora.

## Architektura pierwszego wdrożenia

- Generator audio uruchamiany poza aplikacją: generuje nagrania, mierzy rozmiary i produkuje manifest. Telefon nie potrzebuje poświadczeń Google Cloud do wygenerowanych już plików.
- Manifest dostarczany z aplikacją: stabilne identyfikatory kursów i fiszek, powiązania stron z nagraniami, języki, wymagane pakiety, wersje treści i ustawienia lektora.
- `CourseMediaService`: oblicza zależności kursu i brakujące zasoby, obsługuje pobranie/usunięcie oraz zdarzenia dla ekranów.
- Resolver audio: zamienia identyfikator nagrania na aktualne URI pliku. Nie zapisujemy trwałych absolutnych ścieżek PAD w rekordach fiszek.
- Adapter PAD w lokalnym module Expo/Kotlin: status, rozmiar transferu, pobieranie, anulowanie, lokalizacja i usuwanie pakietu, przekazywanie postępu do JavaScript.
- Konfiguracja budowania: moduły asset-pack Gradle oraz konfiguracja prebuild. Dołączanie nagrań do PAD musi wykluczać ich równoczesne pakowanie przez statyczne `require()` Metro.
- Lokalny adapter do pracy deweloperskiej: te same identyfikatory i manifest, zasoby dostępne z małego zestawu testowego. Weryfikacja produkcyjnego PAD nadal wymaga testów AAB/Play.

Stany dostępności: brak, oczekiwanie, pobieranie, przygotowywanie, gotowe, błąd, aktualizacja. Preferencja „chcę mieć audio offline” jest niezależna od aktualnego stanu plików.

## Awaryjne sytuacje i aktualizacje

- Brak internetu: lokalne teksty i postępy działają; gotowe audio działa, a brakujące nie blokuje nauki.
- Przerwany transfer: po ponownym uruchomieniu odczytać stan z PAD i pokazać kontynuację albo ponowienie stosownie do stanu. Nie uznawać pobrania za gotowe tylko na podstawie lokalnego procentu.
- Brak miejsca lub wymagana zgoda Play: pokazać konkretny komunikat oraz możliwość rozpoczęcia bez nagrań. Obsłużyć przepływ potwierdzenia wymagany przez bibliotekę.
- Aktualizacja aplikacji: ponownie sprawdzić dostępność i lokalizacje pakietów. Pakiety mogą być tymczasowo niedostępne podczas aktualizacji; nie obiecywać nieprzerwanej dostępności audio przez ten etap.
- Gotowość pakietu: wymaga ukończenia dostarczania oraz zgodnego manifestu i obecności plików. Zgodność nagrania z tekstem sprawdzać na podstawie wersji/skrótów, nie wyłącznie numeru fiszki.
- Własna edycja oficjalnej fiszki: nagranie zmienionego tekstu nie może być odtwarzane z poprzedniej wersji; użyć głosu urządzenia lub oznaczyć brak nagrania.
- Kopia zapasowa: zapisywać postępy, zmiany treści i preferencje audio, bez dużych oficjalnych nagrań ani ścieżek PAD. Po odtworzeniu zasygnalizować brakujące pakiety; nie uruchamiać dużego transferu bez decyzji użytkownika.
- Reinstalacja: oficjalne audio może wymagać ponownego pobrania. Przywrócenie postępów nie oznacza przywrócenia plików audio.

## Kolejność wdrożenia

1. Wygenerować i odsłuchać próbkę jednego języka; ustalić głos, wymowę, tempo i faktyczny rozmiar plików. Dla „First 50 words” wygenerować pełny mały zestaw pilotażowy.
2. Sprawdzić PAD na jednym pakiecie on-demand: konfiguracja AAB, moduł natywny, postęp, lokalny plik i odtworzenie audio. Zweryfikować lokalnie oraz przez Play, w tym aktualizację aplikacji.
3. Wprowadzić manifest i wspólny resolver. Obsłużyć odczyt pytań, słów do przepisania i wyjaśnień z ich właściwymi językami.
4. Dodać UI pobierania na wejściu do kursu i zarządzanie nagraniami. Przetestować onboarding i powtórki.
5. Uruchomić pilot na jednym oficjalnym kursie. Dotychczasowe instalacje zachowują bazę, kursy, identyfikatory fiszek i postępy.
6. Rozszerzyć audio na kolejne kursy po pomiarze zależności i deduplikacji. Rozważyć niewielkie nagrania startowe w bazowej aplikacji.
7. Dopiero później ocenić pobieranie obrazków lub tekstów. Przy obecnym rozmiarze bazy nie jest to wymagane dla pierwszej wersji.

## Kryteria akceptacji

- Nowa instalacja może rozpocząć naukę bez obowiązkowego dużego transferu.
- Przypięcie kilku kursów nie pobiera automatycznie wszystkich nagrań.
- Rozmiar pokazywany przed pobraniem odpowiada brakującym pakietom.
- Kurs z gotowym audio działa w trybie samolotowym.
- Anulowanie, zamknięcie aplikacji, brak internetu i brak miejsca nie uszkadzają bazy ani postępów.
- Usunięcie nagrań nie usuwa danych użytkownika; konsekwencje dla współdzielonych kursów są widoczne.
- Aktualizacja aplikacji sprawdza dostępność mediów i nie używa poprzednich ścieżek PAD bez ponownego sprawdzenia.
- Rozmiar bazowego AAB/APK zestawu nie zawiera drugiej kopii nagrań on-demand.
- `tête` korzysta z francuskiego nagrania również w kursie francusko-angielskim i trybie wprowadzania fiszki obrazkowej.

## Decyzje przed pełnym wdrożeniem

- Czy nagrywamy obie strony każdej fiszki, czy najpierw tylko język nauczany?
- Czy początkowe 50 słów mają gotowe audio w bazowej aplikacji?
- Czy wydawanie treści wraz z wersją aplikacji jest akceptowalne? Jeśli nie, porównać CDN przed finalizacją PAD.
- Czy rozpoczynanie nauki z głosem urządzenia podczas pobierania jest domyślnie dostępne? Propozycja: tak.

## Źródła

- [Play Asset Delivery — tryby dostarczania i aktualizacje](https://developer.android.com/guide/playcore/asset-delivery)
- [Integracja PAD w Kotlin/Java](https://developer.android.com/guide/playcore/asset-delivery/integrate-java)
- [Testowanie PAD](https://developer.android.com/guide/playcore/asset-delivery/test)
- [Lokalne moduły Expo](https://docs.expo.dev/modules/get-started/)
- [Config plugins Expo](https://docs.expo.dev/config-plugins/introduction/)
- [Formaty audio Google Cloud TTS](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/AudioEncoding)
