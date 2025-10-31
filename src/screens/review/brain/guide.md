# Przewodnik po ekranie Brain

## Cel ekranu
Ekran Brain odpowiada za przygotowanie materiału do treningu oraz uruchamianie minigier powiązanych z powtórką słówek. Po wejściu pobiera fiszki do sesji dziennej (kurs standardowy lub customowy) i na ich podstawie umożliwia:
- rozpoczęcie pełnej sesji gier (Memory → Choose one → Input a letter → Get a pair → Table),
- uruchomienie pojedynczych minigier z bieżącej puli słówek,
- podgląd fiszek w widoku tabeli,
- konfigurację planszy dla gry Memory.

## Pobieranie i przygotowanie danych
1. `BrainScreen` pobiera fiszki do powtórki:
   - dla kursu customowego: `getDueCustomReviewFlashcards` (maks. 50 kart),
   - dla kursu standardowego: `getDueReviewWordsBatch` (maks. 50 słów na wybranym poziomie CEFR).
2. Każda karta jest mapowana do struktury `WordWithTranslations`, a następnie czyszczona przez `sanitizeWord`, aby pozbyć się pustych terminów/tłumaczeń.
3. Równolegle, gdy znamy kurs i poziom, pobierane są dodatkowe tłumaczenia z `getRandomTranslationsForLevel`. Służą do generowania mylących odpowiedzi w Get a pair.

Kluczowe wartości przechowywane w stanie komponentu:
- `words` – surowe fiszki do wyświetlenia licznika/komunikatów,
- `sanitizedWords` – lista słów gotowych do gier,
- `levelTranslations` – dodatkowe tłumaczenia CEFR wykorzystywane w parowaniu,
- flagi `loading` i `error` do UI.

## Wywoływanie pojedynczych gier
Każdy przycisk minigry korzysta z generatorów ze `src/screens/review/brain/minigame-generators.ts`:
- Choose one wymaga min. 3 słów oraz 3 unikatowych tłumaczeń i losuje jedno pytanie.
- Input a letter filtruje słowa, w których można „ukryć” litery (`getLetterIndices`), i zwraca trzy słowa z brakującymi znakami do odgadnięcia.
- Get a pair potrzebuje min. 3 słów i dobiera tłumaczenia tak, aby część par była poprawna, a część myląca (wykorzystuje dodatkowe tłumaczenia z CEFR).
- Memory przekierowuje do osobnego ekranu z układem planszy zapamiętanym w `SettingsContext`.

Jeżeli brakuje danych spełniających wymagania, użytkownik dostaje komunikat `Alert`.

## Tworzenie pełnej sesji gier
Przycisk `Start` buduje szablon sesji (`buildSessionTemplate`) i rejestruje go w `sessionStore`. Proces składa się z kilku kroków:
1. **Walidacja danych wejściowych**: wymagane jest min. `MIN_SESSION_WORDS = 10` słówek, z czego co najmniej 3 muszą pozwalać na ukrycie litery (Input a letter).
2. **Losowanie kandydatów**:
   - losujemy 3 słowa do Input a letter,
   - spośród pozostałych wybieramy 3 słowa dla Get a pair (wraz z fałszywymi tłumaczeniami),
   - szukamy pojedynczego słowa do Choose one, dla którego da się wygenerować 2 unikatowe dystraktory,
   - dobieramy 3 kolejne słowa na rundę Memory.
3. **Generowanie rund**:
   - `buildInputALetterRound` przygotowuje maskowane litery i pulę znaków,
   - `buildGetAPairRound` łączy terminy z tłumaczeniami, mieszając poprawne i błędne pary,
   - `buildChooseOneRoundForTarget` tworzy pytanie wyboru,
   - runda Memory wykorzystuje wybrane słowa jako bodźce do zapamiętania,
   - na końcu zawsze dodawany jest krok `table` do podsumowania.
4. **Rejestracja sesji**:
   - `registerSession` zapisuje kroki oraz słowa (`SessionWordSeed`) w pamięci `sessionStore` i nadaje im unikatowe identyfikatory,
   - zwraca `sessionId` i `firstStep`. Jeśli czegokolwiek brakuje, sesja jest niszczona (`destroySession`) i pojawia się błąd.
5. **Nawigacja**: aplikacja przechodzi do pierwszej gry (`getRouteForStep`), przekazując `sessionId` i `stepId` w parametrze URL.

Jeżeli generator nie znajdzie odpowiedniego zestawu słów (np. zbyt mało unikalnych tłumaczeń), użytkownik otrzymuje komunikat o konieczności odświeżenia fiszek.

## Reset i wyniki
Podczas gry wyniki każdej rundy zapisywane są w `sessionStore`. Kroki wołają `completeSessionStep`, aby przejść do kolejnego etapu i zaktualizować status słów (`correct`/`incorrect`). `destroySession` usuwa całą sesję, gdy użytkownik zakończy całą sekwencję lub anuluje trening.
