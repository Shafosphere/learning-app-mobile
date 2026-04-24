# Spis Plikow

## Zasada Struktury

- `app/` zawiera trasy Expo Routera i dalej tylko importuje/eksportuje ekrany.
- `src/screens/` zawiera foldery ekranow. Folder ekranu trzyma glowny plik `.tsx`, plik styli `*-styles.ts` i opcjonalny `__tests__/`.
- `src/components/` zawiera komponenty wspoldzielone i komponenty wyniesione z dawnych `src/screens/**/components`.
- `src/features/` zawiera helpery domenowe, typy pomocnicze i logike niebedaca ekranem.
- `src/constants/`, `src/hooks/`, `src/services/`, `src/db/`, `src/types/`, `src/utils/` zostaja dla wspolnych warstw aplikacji.

## Glowne Ekrany

- `src/screens/home/HomeScreen/HomeScreen.tsx` - ekran startowy.
- `src/screens/flashcards/FlashcardsScreen/FlashcardsScreen.tsx` - glowny trening fiszek.
- `src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen.tsx` - wybor aktywnego kursu.
- `src/screens/courses/pincourse/CoursePinScreen/CoursePinScreen.tsx` - przypinanie kursow.
- `src/screens/courses/editcourse/CourseEditScreen/CourseEditScreen.tsx` - edycja kursu.
- `src/screens/courses/makenewcourse/CourseAppearanceScreen/CourseAppearanceScreen.tsx` - pierwszy krok kursu wlasnego.
- `src/screens/courses/makenewcourse/ImportFlashcardsScreen/ImportFlashcardsScreen.tsx` - import lub reczne dodawanie fiszek.
- `src/screens/courses/makenewcourse/CourseSettingsScreen/CourseSettingsScreen.tsx` - ustawienia nowego kursu.
- `src/screens/review/courses/CoursesReviewScreen/CoursesReviewScreen.tsx` - hub powtorek.
- `src/screens/review/reviewflashcards/reviewflashcards/reviewflashcards.tsx` - powtorki fiszek.
- `src/screens/settings/SettingsScreen/SettingsScreen.tsx` - ustawienia aplikacji.
- `src/screens/stats/StatsScreen/StatsScreen.tsx` - statystyki.
- `src/screens/wiki/WikiScreen/WikiScreen.tsx` - wiki/onboarding.
- `src/screens/support/SupportScreen/SupportScreen.tsx` - wsparcie.
- `src/screens/onboarding/LanguageIntroScreen/LanguageIntroScreen.tsx` - intro jezykowe.
- `src/screens/debug/CourseFinishedPanelPreviewScreen/CourseFinishedPanelPreviewScreen.tsx` - preview panelu ukonczenia kursu.
- `src/screens/legal/PrivacyPolicyScreen/PrivacyPolicyScreen.tsx` i `src/screens/legal/LicensesScreen/LicensesScreen.tsx` - ekrany prawne.

## Wyniesione Komponenty

- `src/components/flashcards/CourseFinishedPanel/` - panel ukonczenia kursu z testami.
- `src/components/flashcards/TrueFalseActions.tsx` - akcje true/false dla fiszek.
- `src/components/course/` - karty/listy kursow oraz sekcje aktywacji i przypinania.
- `src/components/courseEditor/` - komponenty edytora kursu, ustawien, ikon, nazw i fiszek.
- `src/components/review/` - sekcje i badge powtorek.
- `src/components/wiki/` - komponenty UI wiki.
- `src/components/legal/` - wspolny renderer dokumentow prawnych.
- `src/components/settings/`, `src/components/stats/`, `src/components/card/`, `src/components/Box/` - pozostale wspolne komponenty aplikacji.

## Logika Domenowa

- `src/features/flashcards/courseCompletionRun.ts` - helper przebiegu ukonczenia kursu.
- `src/features/customCourse/contentDraft.ts` - draft tresci/ustawien kursu wlasnego.
- `src/features/customCourse/csvImport/` - parser, schema i mapowanie importu CSV.
- `src/features/customCourse/courseActivationTypes.ts` - typy list kursow dla aktywacji.
- `src/features/review/courseReviewTypes.ts` - typy list kursow dla powtorek.
- `src/features/wiki/wikiTopics.tsx` - definicje tematow wiki.
- `src/constants/homeQuotes.ts` - cytaty ekranu home.

## Testy

- Testy screenow mieszkaja w `__tests__/` wewnatrz folderu danego ekranu.
- Testy komponentow mieszkaja w `__tests__/` przy komponencie.
- Testy hookow, contextow, services i db zostaja przy swoich warstwach.
