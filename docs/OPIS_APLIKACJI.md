# Opis aplikacji – nauka słówek (mobile)

Dokument opisuje aktualne działanie aplikacji, dostępne opcje, ekrany, logikę nauki, strukturę danych (AsyncStorage + SQLite) oraz główne moduły.

## Cel i skrót działania
- Aplikacja uczy słownictwa metodą pudełek (5 pudełek) z wpisywaniem odpowiedzi.
- Dane słów importowane są z CSV (EN→PL) do lokalnej bazy SQLite; obsługa profili językowych i poziomów CEFR.
- Postęp i stan pudełek zapisywane są w AsyncStorage (snapshoty per profil/poziom); nauczone słowa trafiają do systemu powtórek (spaced repetition) z terminami w tabeli `reviews`.

## Ekrany i nawigacja
- `/` (Start): powitanie + sprawdzenie, czy są zaległe powtórki; jeśli tak, przekierowuje do `/review`.
- `/createprofile`: tworzenie profilu (wybór pary języków dostępnej w DB).
- `/profilpanel`: podgląd listy profili, wybór aktywnego profilu.
- `/level`: wybór poziomu CEFR: `A1`…`C2` (po wyborze przejście do `/flashcards`).
- `/flashcards`: główny ekran nauki – karta do wpisywania odpowiedzi + pudełka (układ „classic” lub „carousel”).
- `/settings`: ustawienia aplikacji (motyw, sprawdzanie pisowni, miny pudełek, układ pudełek, wielkość partii fiszek).
- `/review`: ekran powtórek – placeholder (UI do rozbudowy), ale logika terminów działa w DB.

Górna nawigacja (`src/components/navbar/navbar.tsx`) daje skróty do: Home, Boxy/Level, Ustawienia, Profile, Review, przełączanie motywu oraz licznik „streak”.

## Nauka – logika pudełek i fiszek
- 5 pudełek: `boxOne` … `boxFive` (typy: `src/types/boxes.ts`).
- Wybór aktywnego pudełka powoduje losowanie słowa z jego zawartości.
- Kierunek pytania naprzemienny: pudełka parzyste (`boxTwo`, `boxFour`) odwracają kierunek (wpisujesz oryginał na podstawie tłumaczenia).
- Odpowiedź:
  - Jeśli poprawna: słowo awansuje do następnego pudełka; jeżeli było w `boxFive`, słowo uznajemy za „nauczone” i planujemy pierwszą powtórkę w tabeli `reviews` (patrz niżej, interwały).
  - Jeśli błędna: pokazuje się tryb korekty – trzeba wpisać poprawnie awers i rewers; po poprawie słowo spada do `boxOne`.
- Ładowanie nowych słówek:
  - Przycisk „dodaj słówka” dobiera partię słów przez `getRandomWordsBatch(...)` z DB dla aktywnego profilu i wybranego poziomu, pomijając już użyte ID.
  - Rozmiar partii konfigurowalny w Ustawieniach (domyślnie 10).
- Postęp poziomu: obliczany jako `nauczone / łączna_liczba_słów_dla_poziomu` (z DB).
- Zdarzenie nauki a „streak”: odpowiedź poprawna w `boxFive` rejestruje „dzień nauki” (zliczane w `StreakContext`).

## Powtórki (spaced repetition)
- Interwały (ms): `[2d, 7d, 30d, 90d, 180d, 365d]` – `src/config/appConfig.ts`.
- Po nauczeniu słowa (wyjście z `boxFive`) wywoływane jest `scheduleReview(...)`, które tworzy/aktualizuje wpis w tabeli `reviews` (z `next_review`).
- Na starcie (`/`) sprawdzamy, czy są powtórki „due”; jeśli są, przekierowujemy do `/review` (UI do zaimplementowania – obecnie placeholder).

## Ustawienia (Settings)
- Motyw: `light`/`dark` (przełącznik w navbar i w ekranie `Settings`).
- Spellchecking: włącz/wyłącz – porównanie z tolerancją literówek (Levenshtein ≤ 1) lub ścisłe dopasowanie.
- Miny pudełek: włącz/wyłącz rysowanie oczu i „ust” na pudełku (`showBoxFaces`).
- Układ pudełek: `classic` (siatka) lub `carousel` (karuzela z animacją).
- „Liczba fiszek w partii”: rozmiar nowo pobieranej paczki słów (1–200, domyślnie 10).

## Profile językowe
- Każdy profil to para języków (źródłowy → docelowy), np. `en → pl`.
- Tworzenie profilu oferuje tylko pary dostępne w tabeli `language_pairs` DB.
- Można mieć wiele profili; aktywny profil jest zapamiętywany (AsyncStorage).

## Przechowywanie stanu (AsyncStorage)
Kluczowe pozycje:
- `theme`: aktualny motyw.
- `boxesLayout`: układ pudełek: `classic`/`carousel`.
- `profiles`: lista profili (`LanguageProfile`).
- `activeProfileIdx`: indeks aktywnego profilu.
- `spellChecking`: `true`/`false`.
- `showBoxFaces`: `true`/`false`.
- `flashcardsBatchSize`: liczba fiszek w pobieranej partii.
- `boxes:<sourceId>-<targetId>-<CEFR>`: snapshot stanu pudełek i metadane (`SavedBoxesV2` – patrz `useBoxesPersistenceSnapshot`).

Dodatkowo istnieje util `clearAllFlashcards()` do czyszczenia snapshotów pudełek (usuwa klucze `boxes:*`).

## Baza danych (SQLite)
- Inicjalizacja: `src/db/sqlite/db.ts` – tworzenie schematu + import CSV `assets/data/wordsENGtoPL.csv` przy pierwszym uruchomieniu (EN→PL, z poziomami CEFR).
- Tabele (pełny schemat: `src/db/schema/schema.sql`, runtime: `db.ts`):
  - `languages(id, code, name)` – kody języków (np. `en`, `pl`).
  - `words(id, language_id, text, cefr_level)` – słowa z poziomem CEFR.
  - `translations(id, source_word_id, target_language_id, translation_text, target_word_id?)` – tłumaczenia słowa źródłowego na język docelowy.
  - `language_pairs(source_language_id, target_language_id)` – dopuszczalne pary kierunków nauki.
  - `reviews(id, word_id, source_lang_id, target_lang_id, level, learned_at, next_review, stage)` – plan powtórek SRS.
- Indeksy: m.in. `idx_words_lang_cefr`, `idx_trans_src_tgtlang`, `idx_reviews_due`, `idx_reviews_pair`.
- Wsparcie: `getRandomWordsBatch(...)` dobiera ID słów + doczytuje tekst i tłumaczenia; `getTotalWordsForLevel(...)` zwraca łączną liczbę słów dla poziomu.

## Ważne moduły i pliki
- Nawigacja i opakowanie kontekstów: `app/_layout.tsx`.
- Start/redirect do powtórek: `app/index.tsx`.
- Nauka: `app/flashcards/index.tsx`, komponenty: karty (`src/components/card/card.tsx`), pudełka siatka (`src/components/box/boxes.tsx`), karuzela (`src/components/box/boxcarousel.tsx`, `boxCarouselItem.tsx`), skórka pudełka (`BoxSkin.tsx`).
- Profile: tworzenie `app/createprofile/index.tsx`, wybór `app/profilpanel/index.tsx`.
- Poziomy: `app/level/index.tsx`.
- Ustawienia: `app/settings/index.tsx` + `src/contexts/SettingsContext.tsx`.
- Powtórki (DB, logika): `src/db/sqlite/db.ts` (+ `scheduleReview`, `getDueReviews`, `advanceReview`).
- Snapshot pudełek: `src/hooks/useBoxesPersistenceSnapshot.ts`.
- Spellchecking: `src/hooks/useSpellchecking.ts`.
- Tematy/styl: `src/theme/*`, `src/screens/*/styles_*.ts`.
z
