## Sprawozdanie: dobór słówek, progres i ostatnie zmiany

- Data: 2025-09-09
- Obszar: główna gra fiszek (flashcards), baza danych, zapisywanie postępów

### Najważniejsze zmiany
- Baza SQLite + import CSV: wprowadzono pełny model `languages`, `words`, `translations`, `language_pairs` i inicjalizację z pliku CSV (ang→pol) wraz z indeksami wydajności.
  - Kod: `src/components/db/db.ts:22`
- Generator losowych paczek z bazy: dodano `getRandomWordsBatch(...)` pobierający losowe słowa z wybranego poziomu CEFR i ich tłumaczenia.
  - Kod: `src/components/db/dbGenerator.ts:14`
- Persystencja stanu pudełek (autosave) + licznik paczek: hook `useBoxesPersistenceSnapshot` trzyma cały snapshot pudełek, `batchIndex` i listę `usedWordIds`.
  - Kod: `src/hooks/useBoxesPersistenceSnapshot.ts:114`
- Wyświetlanie progresu poziomu: procent bazuje na liczbie unikalnych użytych słów (`usedWordIds`) względem łącznej puli słów w poziomie z bazy.
  - Kod: `src/hooks/useBoxesPersistenceSnapshot.ts:168` oraz `src/components/db/db.ts:233`
- UI programu: przycisk „dodaj słówka” w karcie wywołuje pobranie nowej paczki i dodanie do pierwszego pudełka; dodano też wariant karuzeli pudełek.
  - Kod: `app/flashcards/index.tsx:94` i `src/components/card/card.tsx:79`

### Jak działa dobór słówek („dodaj słówka”)
- Wywoływana funkcja: `downloadData()` w `app/flashcards/index.tsx:94`.
- Parametry doboru: język źródłowy i docelowy z aktywnego profilu, poziom CEFR z ustawień, wielkość paczki z `src/config/appConfig.ts` (domyślnie 30).
- Zapytanie do DB: `getRandomWordsBatch(...)` losuje ID słów z tabeli `words` dla danego języka i poziomu, z wykluczeniem przekazanych ID (`excludeIds`), a następnie dociąga ich tekst i tłumaczenia na język docelowy.
  - Kod: `src/components/db/dbGenerator.ts:23`, `:39`, `:48`
- Wykluczanie duplikatów przy pobieraniu: `excludeIds` budowane z ID wszystkich słów obecnych aktualnie w pudełkach (boxOne..boxFive) oraz z listy „nauczonych” w bieżącej sesji (`learned`).
  - Kod: `app/flashcards/index.tsx:101`
- Po pobraniu: słowa trafiają do `boxOne`, a ich ID są dopisywane do `usedWordIds` w hooku persystencji (używane potem do progresu).
  - Kod: `app/flashcards/index.tsx:118`

### Unikanie powtórzeń
- Wybór kolejnej karty w pudełku unika natychmiastowego powtórzenia tego samego słowa (jeśli trafiono ten sam indeks, wybierany jest następny).
  - Kod: `app/flashcards/index.tsx:76`
- Przy pobieraniu nowej paczki, słowa już obecne w aktualnych pudełkach oraz te oznaczone jako „nauczone” w bieżącej sesji są wykluczone.
  - Kod: `app/flashcards/index.tsx:101`
- Uwaga: `usedWordIds` (zbiorczy ślad użytych słów) nie jest obecnie używany do wykluczania przy pobieraniu nowych paczek, więc po nowej sesji/wyczyszczeniu pudełek słowa mogą się powtórzyć (jeśli nie ma ich już w pudełkach). Możliwe usprawnienie: dodać `usedWordIds` do `excludeIds` w `downloadData()`.

### Gdzie zapisuje się progres i stan
- Snapshot gry (AsyncStorage): klucz `boxes:<sourceId>-<targetId>-<level>` zawiera cały stan pudełek (`flashcards`), `batchIndex` i `usedWordIds` oraz znacznik czasu.
  - Kod: `src/hooks/useBoxesPersistenceSnapshot.ts:108`, `:121`, `:232`
- Autosave: zapis uruchamia się po zmianie pudełek/`usedWordIds` (z opóźnieniem `saveDelayMs` — obecnie 0) i jest aktywny tylko, gdy profil/poziom są poprawnie ustawione.
  - Kod: `src/hooks/useBoxesPersistenceSnapshot.ts:197`

### Jak liczony jest procent
- Całkowita liczba słów dla poziomu: `getTotalWordsForLevel(languageId, level)` zlicza w tabeli `words` rekordy dla języka źródłowego i poziomu CEFR.
  - Kod: `src/components/db/db.ts:233`
- Progres: `progress = min(1, usedWordIds.length / totalWordsForLevel)` i w UI wyświetlany jako `Math.round(progress * 100)`.
  - Kod: `src/hooks/useBoxesPersistenceSnapshot.ts:188`, `app/flashcards/index.tsx:286`

### Ruch słówek między pudełkami (skrót)
- Poprawna odpowiedź: słowo promowane do kolejnego pudełka; z ostatniego trafia do listy „nauczonych”.
  - Kod: `app/flashcards/index.tsx:171`
- Błędna odpowiedź: pokazana korekta; po przepisaniu obu stron karta wraca do `boxOne`.
  - Kod: `app/flashcards/index.tsx:215`, `:221`
- W `boxTwo` i `boxFour` sprawdzanie jest „odwrotne” (tłumaczenie→słowo źródłowe).
  - Kod: `app/flashcards/index.tsx:51`

### Propozycje usprawnień
- Wykluczanie między sesjami: w `downloadData()` dołączyć `usedWordIds` do `excludeIds`, by uniknąć powtórek po restarcie.
- Opcjonalne: zapisać listę `learned` w snapshot, by widok znał stan „nauczonych” między sesjami.
- Porządek: rozważyć usunięcie nieużywanej logiki generatora `patches_json`, jeśli docelowo używamy tylko `getRandomWordsBatch`.

