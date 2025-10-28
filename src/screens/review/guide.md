## Przegląd plików w `src/screens/review`

- **courses/CoursesReviewScreen.tsx** – główny ekran wyboru trybu powtórek. Łączy dane o kursach wbudowanych, oficjalnych mini‑kursach oraz customowych zestawach użytkownika, wylicza ile fiszek czeka na powtórkę i pozwala uruchomić grę pamięciową dla wybranego źródła.
- **memorygame/MemoryGameScreen.tsx** – implementacja gry pamięciowej. Na podstawie aktywnego kursu lub kursu własnego pobiera pary słów i tłumaczeń, buduje talię kart i obsługuje logikę dopasowywania, animacje oraz status kart.
- **session/TypingReviewScreen.tsx** – ekran powtórek w trybie wpisywania odpowiedzi. Pobiera fiszki podobnie jak gra pamięciowa, ocenia poprawność wpisu, loguje wynik (również z czasem reakcji) i zarządza przejściem do kolejnych słówek.
- **temp/LegacyReviewScreen.tsx** – tymczasowy/legacy ekran listujący levele CEFR z liczbą zaległych powtórek. Pozwala wybrać poziom i przejść do starego trybu sesji (`/review/session`).

### Szczegóły: `courses/CoursesReviewScreen.tsx`

1. **Źródła danych**  
   - Korzysta z kontekstu `useSettings()` do pobrania listy kursów wbudowanych (`courses`), ustawienia aktywnego kursu/poziomu i kolorów UI, a także listy przypiętych oficjalnych kursów (`pinnedOfficialCourseIds`).  
   - Dane o liczbie zaległych powtórek ładuje asynchronicznie w `refreshData()`:
     - *Kursy wbudowane:* dla każdego kursu liczy zaległe fiszki. Jeśli kurs ma ustawiony poziom CEFR, używa `countDueReviewsByLevel`, w przeciwnym razie `countTotalDueReviews`. Wyniki zapisuje w mapie `builtInCounts` indeksowanej numerem kursu.  
     - *Kursy użytkownika:* pobiera wszystkie kursy użytkownika (`getCustomCoursesWithCardCounts()`), filtruje tylko nieoficjalne i dla aktywnych powtórek wywołuje `countDueCustomReviews`. Mapę wyników zapisuje w `customCounts`.  
     - *Oficjalne mini‑kursy:* pobiera wpisy `getOfficialCustomCoursesWithCardCounts()`, wzbogaca je o metadane z `OFFICIAL_PACKS` (języki i ikony), a następnie dla kursów z włączonymi powtórkami liczy zaległości także przez `countDueCustomReviews`. Wyniki trafiają do `officialCounts`.  
   - Flagi językowe pobiera funkcją `getFlagSource()`, ikony kursów – `getCourseIconById()`.

2. **Odświeżanie i lifecycle**  
   - `refreshData()` wywoływana jest każdorazowo po wejściu na ekran dzięki `useFocusEffect`. Funkcja pilnuje montażu komponentu, by nie zapisywać stanu po unmount.  
   - Stany `builtInCounts`, `customCourses`, `customCounts`, `officialCourses`, `officialCounts` przechowują aktualny snapshot danych.

3. **Grupowanie kursów**  
   - `builtInGroups`: grupuje kursy wbudowane po parze języków (target/source). W każdej grupie sortuje kursy wg poziomu CEFR (mapa `LEVEL_ORDER`) lub nazwy etykiety, jeśli poziomów brak.  
   - `officialGroups`: buduje analogiczne grupy dla oficjalnych mini‑kursów, ale ogranicza się do tych, które są przypięte i mają aktywne powtórki.  
   - `combinedGroups`: scala obie struktury tak, aby w interfejsie każdy duet językowy zawierał listę kursów wbudowanych oraz przypiętych oficjalnych. Każda grupa niesie flagi i kody językowe.

4. **Renderowanie i interakcje**  
   - Dla każdej grupy wyświetla kartę kursu: flagę/ikonę, nazwę poziomu lub kursu oraz licznik zaległych fiszek (kolor zielony, gdy 0, czerwony gdy >0).  
   - `handleSelectCourse(index)` – po wyborze kursu wbudowanego ustawia go jako aktywny (i poziom jeśli istnieje), czyści `activeCustomCourseId` i nawiguję do `/review/memory`.  
   - `handleSelectCustomCourse(courseId)` – dla kursów własnych lub oficjalnych ustawia `activeCustomCourseId` i także przenosi do `/review/memory`.  
   - Sekcja „Twoje” obsługuje kursy użytkownika niezależnie od grupowania – jeśli brak kursów lub wszystkie mają wyłączone powtórki, pokazuje komunikaty pustego stanu.

5. **Formatowanie etykiet**  
   - Funkcja `resolveLanguageLabel()` dobiera wyświetlaną nazwę języka bazując na zdefiniowanych tłumaczeniach (`LANGUAGE_LABELS_BY_TARGET`, `FALLBACK_LANGUAGE_LABELS`). Gdy brak dopasowania, używa kodu języka w wersji uppercase.

6. **Nawigacja i dalsze ekrany**  
   - Zarówno wybór kursu wbudowanego, jak i kursu (oficjalnego/custom) kieruje do pamięciowego trybu powtórek (`/review/memory`), który wykorzystuje ustawienia zapisane w kontekście (`activeCourse` lub `activeCustomCourseId`).  
   - Inne tryby powtórek (np. `TypingReviewScreen`) odczytują te same ustawienia, więc ten ekran stanowi centralny hub do startu sesji.
