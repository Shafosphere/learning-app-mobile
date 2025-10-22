# Komponenty

**Informacja o plikach stylów:** Pliki `*-styles.ts` w tych katalogach zawierają hooki z definicjami styli (np. `useStyles`, `useCustomCourseFormStyles`) i nie są tu wymieniane, aby spis koncentrował się na komponentach z logiką lub UI.

1. src/components/box/BoxSkin.tsx: Renderuje animowaną obudowę pudełka (oczy, karty, etykiety dostępności) w zależności od stanu. Używany: tak (w src/components/box/boxes.tsx i src/components/box/boxCarouselItem.tsx).
2. src/components/box/boxCarouselItem.tsx: Pojedyncza pozycja karuzeli pudełek sterująca animacją reakcji na wybór. Używany: tak (generowany w src/components/box/boxcarousel.tsx).
3. src/components/box/boxcarousel.tsx: Karuzela pudełek z interpolacją scrolla i wyborem aktywnego boxa. Używany: tak (src/screens/flashcards/FlashcardsScreen.tsx oraz src/screens/flashcards_custom/FlashcardsCustomScreen.tsx).
4. src/components/box/boxes.tsx: Klasyczny siatkowy układ pudełek z obsługą dotyku i stanów twarzy. Używany: tak (src/screens/flashcards/FlashcardsScreen.tsx).
5. src/components/button/button.tsx: Komponent MyButton dostosowujący kolor do motywu i zapewniający etykiety dostępności. Używany: tak (np. src/screens/home/HomeScreen.tsx i src/components/settings/DataSection.tsx).
6. src/components/card/card.tsx: Formularz odpowiedzi dla fiszek z walidacją, korektą i sterowaniem fokusami. Używany: tak (src/screens/flashcards/FlashcardsScreen.tsx i src/screens/flashcards_custom/FlashcardsCustomScreen.tsx).
7. src/components/carousel/RotaryStack.tsx: Animowany stos słów sterowany przez ref (spin), wykorzystywany w trybie pisania. Używany: tak (src/screens/review/session/TypingReviewScreen.tsx).
8. src/components/confetti/Confetti.tsx: Generuje animowane konfetti na potrzeby celebracji poprawnych odpowiedzi. Używany: tak (ekrany fiszek: src/screens/flashcards/FlashcardsScreen.tsx i src/screens/flashcards_custom/FlashcardsCustomScreen.tsx).
9. src/components/course/CourseCard.tsx: Karta kursu z ikoną, flagą i przewijanym tytułem. Używany: tak (m.in. src/screens/coursepanel/CourseActivateScreen.tsx).
10. src/components/course/CourseTitleMarquee.tsx: Tekstowy ticker przewijający długie tytuły kursów. Używany: tak (src/components/course/CourseCard.tsx oraz src/screens/review/courses/CoursesReviewScreen.tsx).
11. src/components/customCourse/CourseIconColorSelector.tsx: Wybór ikony i koloru kursu własnego z dostosowaniem do szerokości ekranu. Używany: tak (src/components/customCourse/form/CustomCourseForm.tsx).
12. src/components/customCourse/form/CustomCourseForm.tsx: Formularz konfiguracji kursu własnego (nazwa, ikona, powtórki, dodatkowa zawartość). Używany: tak (src/screens/custom_course/CustomCourseScreen.tsx i src/screens/custom_course/subscreens/EditCustomCourseScreen.tsx).
13. src/components/navbar/navbar.tsx: Pasek nawigacji z logotypem, skrótami i informacją o aktywnym kursie. Używany: tak (app/_layout.tsx).
14. src/components/popup/popup.tsx: Animowany dymek komunikatu Boxika z automatycznym wygaszaniem. Używany: tak (renderowany przez src/contexts/PopupContext.tsx i wywoływany na wielu ekranach).
15. src/components/settings/AccessibilitySection.tsx: Sekcja ustawień dostępności (kontrast, daltonizm, duża czcionka) z haptyczną informacją zwrotną. Używany: tak (src/screens/settings/SettingsScreen.tsx).
16. src/components/settings/AppearanceSection.tsx: Sekcja wyglądu z przełącznikiem motywu, haptyką i przyciskiem testującym popup. Używany: tak (src/screens/settings/SettingsScreen.tsx).
17. src/components/settings/DataSection.tsx: Sekcja zarządzania danymi testowymi i skrótów do panelu kursów. Używany: tak (src/screens/settings/SettingsScreen.tsx).
18. src/components/settings/LearningSection.tsx: Sekcja preferencji nauki (spellcheck, layout pudełek, przypomnienia, plansza memory). Używany: tak (src/screens/settings/SettingsScreen.tsx).
19. src/components/stats/AchievementsList.tsx: Karta listy odznak z ikonami i datami odblokowania. Używany: nie (brak aktualnych importów; planowany na rozbudowę statystyk).
20. src/components/stats/ActivityHeatmap.tsx: Mapa aktywności z ostatnich dni z interaktywną skalą kolorów. Używany: tak (src/screens/stats/StatsScreen.tsx).
21. src/components/stats/BigKnownWordsCard.tsx: Karta z globalną liczbą opanowanych słówek. Używany: tak (src/screens/stats/StatsScreen.tsx).
22. src/components/stats/CourseProgressCard.tsx: Karta monitorująca postęp przypiętego kursu lub kursu customowego. Używany: nie (brak bieżącej integracji).
23. src/components/stats/DailyGoalCard.tsx: Konfigurowalna karta dziennego celu z zapisem i walidacją wejścia. Używany: nie (czeka na podpięcie w ekranie statystyk).
24. src/components/stats/DueReviewsCard.tsx: Zestawienie liczby powtórek według poziomu CEFR. Używany: nie (brak aktualnych importów).
25. src/components/stats/HardWordsList.tsx: Lista najtrudniejszych słówek na podstawie błędów. Używany: tak (src/screens/stats/StatsScreen.tsx).
26. src/components/stats/HourlyActivityChart.tsx: Wykres słupkowy aktywności w ujęciu godzinowym. Używany: tak (src/screens/stats/StatsScreen.tsx).
27. src/components/stats/KnownWordsCard.tsx: Karta pokazująca liczbę znanych słów oraz ostatnie postępy. Używany: nie (obecnie brak importów).
28. src/components/stats/LevelProgressCard.tsx: Karta postępu konkretnego poziomu CEFR z danymi z hooka fiszek. Używany: nie (nie jest aktualnie renderowany).
29. src/components/stats/PinnedCoursesProgress.tsx: Zbiorcza lista postępów dla przypiętych kursów. Używany: tak (src/screens/stats/StatsScreen.tsx).
30. src/components/stats/ProgressBar.tsx: Wspólny pasek postępu dla kart statystyk z obsługą procentów. Używany: tak (wykorzystują go m.in. src/components/stats/PinnedCoursesProgress.tsx).
31. src/components/stats/StatsCard.tsx: Bazowy kontener kart statystyk zapewniający jednolity layout. Używany: tak (wszystkie komponenty statystyczne).

# Screeny
1. src/screens/coursepanel/CourseActivateScreen.tsx: Panel wyboru i aktywacji kursów (wbudowane, oficjalne, customowe) z pinowaniem i podglądem szczegółów. Używany: tak (app/coursepanel/index.tsx).
2. src/screens/createcourse/CoursePinScreen.tsx: Ekran przypinania kursów i oficjalnych paczek z wyborem poziomu CEFR. Używany: tak (app/createcourse/index.tsx oraz app/createprofile/index.tsx).
3. src/screens/custom_course/CustomCourseScreen.tsx: Pierwszy krok kreatora własnego kursu (nazwa, ikona, konfiguracja powtórek). Używany: tak (app/custom_course/index.tsx).
4. src/screens/custom_course/subscreens/CustomCourseContentScreen.tsx: Drugi krok kreatora – edycja zawartości kursu, ręczne fiszki i przygotowanie importu CSV. Używany: tak (app/custom_course/content.tsx).
5. src/screens/custom_course/subscreens/EditCustomCourseScreen.tsx: Panel edycji istniejącego kursu customowego z zarządzaniem fiszkami i usuwaniem kursu. Używany: tak (app/custom_course/edit.tsx).
6. src/screens/flashcards/FlashcardsScreen.tsx: Główny trening fiszek dla kursów wbudowanych z systemem pudełek SRS i celebracją postępów. Używany: tak (app/flashcards/index.tsx).
7. src/screens/flashcards_custom/FlashcardsCustomScreen.tsx: Trening fiszek dla kursów własnych z synchronizacją recenzji i obsługą pudełek. Używany: tak (app/flashcards_custom/index.tsx).
8. src/screens/home/HomeScreen.tsx: Powitalny ekran aplikacji z nawigacją do panelu kursów, statystyk i kreatora customowego. Używany: tak (app/index.tsx).
9. src/screens/legacy/createcourse/CreateCourseScreen.tsx: Historyczny ekran tworzenia kursu na bazie wyboru flag. Używany: nie (brak eksportu w katalogu app).
10. src/screens/legacy/review/ReviewLevelsScreen.tsx: Lista poziomów CEFR do powtórek z licznikiem zaległych kart, prowadzi do gry memory. Używany: tak (app/review/levels.tsx).
11. src/screens/level/LevelScreen.tsx: Wybór poziomu nauki z paskami postępu i przejściem do fiszek. Używany: tak (app/level/index.tsx).
12. src/screens/review/courses/CoursesReviewScreen.tsx: Hub sesji powtórkowych dla kursów wbudowanych, oficjalnych i customowych. Używany: tak (app/review/index.tsx).
13. src/screens/review/memorygame/MemoryGameScreen.tsx: Gra memory łącząca pary słowo–tłumaczenie dla powtórek SRS. Używany: tak (app/review/memory.tsx).
14. src/screens/review/session/TypingReviewScreen.tsx: Sesja powtórek z wpisywaniem odpowiedzi i kolejką pytań opartą o RotaryStack. Używany: tak (app/review/session.tsx).
15. src/screens/review/temp/LegacyReviewScreen.tsx: Tymczasowy wariant widoku wyboru poziomu do powtórek tekstowych. Używany: nie (nie ma trasy w katalogu app).
16. src/screens/settings/SettingsScreen.tsx: Zakładkowy ekran ustawień (wygląd, nauka, dostępność, dane). Używany: tak (app/settings/index.tsx).
17. src/screens/stats/StatsScreen.tsx: Dashboard statystyk z heatmapą aktywności, progresami kursów i listami słówek. Używany: tak (app/stats/index.tsx).

# Hooki
1. src/hooks/useBoxesPersistenceSnapshot.ts: Utrzymuje stan pudełek SRS w AsyncStorage, raportuje postęp i zarządza kolejką słówek. Używany: tak (src/screens/flashcards/FlashcardsScreen.tsx, src/screens/flashcards_custom/FlashcardsCustomScreen.tsx, src/components/stats/LevelProgressCard.tsx).
2. src/hooks/useCustomCourseDraft.ts: Przechowuje roboczą konfigurację kursu customowego (nazwa, ikona, kolory, powtórki) z resetem i hydracją. Używany: tak (src/screens/custom_course/CustomCourseScreen.tsx, src/screens/custom_course/subscreens/EditCustomCourseScreen.tsx).
3. src/hooks/useFlashcardsInteraction.ts: Zarządza logiką nauki (wybór pudełka, sprawdzanie odpowiedzi, logowanie postępów, promocja kart). Używany: tak (src/screens/flashcards/FlashcardsScreen.tsx, src/screens/flashcards_custom/FlashcardsCustomScreen.tsx).
4. src/hooks/usePersistedState.ts: Generyczny hook stanu z zapisem w AsyncStorage, używany do preferencji i statystyk. Używany: tak (np. src/contexts/SettingsContext.tsx, src/contexts/LearningStatsContext.tsx).
5. src/hooks/useSpellchecking.ts: Zwraca funkcję sprawdzającą odpowiedzi z tolerancją literówek i obsługą diakrytyków. Używany: tak (src/screens/flashcards/FlashcardsScreen.tsx, src/screens/flashcards_custom/FlashcardsCustomScreen.tsx, src/screens/review/session/TypingReviewScreen.tsx).

# Najważniejsze pliki
1. app/_layout.tsx: Główny layout Expo Routera z providerami (Navbar, konteksty, tematy). Używany: tak (ładowany automatycznie przy starcie aplikacji).
2. app/coursepanel/index.tsx: Trasa Expo Routera do panelu kursów (re-eksport CourseActivateScreen). Używany: tak (np. przy przejściu z HomeScreen).
3. app/createcourse/index.tsx: Trasa tworzenia/przypinania kursów wbudowanych. Używany: tak (wywoływany z CourseActivateScreen).
4. app/createprofile/index.tsx: Alternatywna trasa kreatora kursu, obecnie dzieląca ekran z createcourse. Używany: nie (brak odniesień w nawigacji).
5. app/custom_course/content.tsx: Routing do kroku edycji zawartości kursu customowego. Używany: tak (przekierowania z CustomCourseScreen).
6. app/custom_course/edit.tsx: Routing do edycji istniejącego kursu własnego. Używany: tak (np. z CourseActivateScreen i FlashcardsCustomScreen).
7. app/custom_course/index.tsx: Start kreatora kursu customowego. Używany: tak (przycisk "Własne fiszki" na HomeScreen).
8. app/custom_profile/content.tsx: Alias trasy do ekranu zawartości kursu customowego dla profilu. Używany: nie (brak odwołań).
9. app/custom_profile/edit.tsx: Alias edycji kursu customowego w przestrzeni custom_profile. Używany: nie (brak odwołań).
10. app/custom_profile/index.tsx: Alias startu kreatora customowego w przestrzeni custom_profile. Używany: nie (brak odwołań).
11. app/flashcards/index.tsx: Trasa do głównego treningu fiszek dla kursów wbudowanych. Używany: tak (wybór poziomu w LevelScreen).
12. app/flashcards_custom/index.tsx: Trasa do treningu fiszek kursów własnych. Używany: tak (np. po wyborze kursu customowego).
13. app/index.tsx: Ekran Home z najważniejszymi skrótami. Używany: tak (domyślna ścieżka aplikacji).
14. app/level/index.tsx: Trasa wyboru poziomu CEFR przed sesją fiszek. Używany: tak (nawigacja z panelu kursów).
15. app/profilpanel/index.tsx: Alias do CourseActivateScreen pod dawnym adresem profilpanel. Używany: nie (brak odwołań).
16. app/review/index.tsx: Hub powtórek (CoursesReviewScreen). Używany: tak (nawigacja z Navbar).
17. app/review/levels.tsx: Alias do Legacy ReviewLevelsScreen. Używany: nie (niewywoływany w nawigacji).
18. app/review/memory.tsx: Trasa gry memory wykorzystywanej w powtórkach. Używany: tak (wywołania z hubu powtórek).
19. app/review/session.tsx: Trasa sesji pisemnych powtórek TypingReviewScreen. Używany: tak (CoursesReviewScreen, LegacyReviewScreen).
20. app/settings/index.tsx: Trasa do ekranów ustawień. Używany: tak (np. skrót z Navbar).
21. app/stats/index.tsx: Trasa do dashboardu statystyk. Używany: tak (przycisk na HomeScreen i Navbar).
22. app.json: Konfiguracja Expo (nazwa aplikacji, uprawnienia, ikony). Używany: tak (w procesie build/run).
23. package.json: Manifest npm z zależnościami i skryptami. Używany: tak (zarządzanie projektem).
24. tsconfig.json: Konfiguracja TypeScript (aliasy, opcje kompilatora). Używany: tak (kompilacja/IDE).
25. metro.config.js: Konfiguracja bundlera Metro dla Expo. Używany: tak (podczas bundlowania).
26. README.md: Opis projektu i instrukcje uruchomienia. Używany: tak (dokumentacja).
27. src/config/appConfig.ts: Stałe konfiguracyjne aplikacji (np. batch fiszek). Używany: tak (importy m.in. w FlashcardsScreen).
28. src/constants/achievements.ts: Definicje odznak i progów statystyk. Używany: tak (LearningStatsContext, AchievementsList).
29. src/constants/customCourse.ts: Dane i helpery kursów customowych (ikony, kolory). Używany: tak (CustomCourseForm, CourseIconColorSelector).
30. src/constants/languageFlags.ts: Mapa flag językowych i helper getFlagSource. Używany: tak (CourseActivateScreen, CoursePinScreen itd.).
31. src/constants/memoryGame.ts: Konfiguracja planszy memory i etykiety rozmiarów. Używany: tak (MemoryGameScreen, Settings).
32. src/constants/officialPacks.ts: Lista oficjalnych paczek kursów. Używany: tak (CourseActivateScreen, CoursePinScreen, CoursesReviewScreen).
33. src/contexts/LearningStatsContext.tsx: Kontekst postępów użytkownika (poznane słowa, odznaki). Używany: tak (wrapowany w app/_layout.tsx).
34. src/contexts/PopupContext.tsx: Kontekst odpowiedzialny za popup Boxika. Używany: tak (provider w app/_layout.tsx, hook usePopup).
35. src/contexts/SettingsContext.tsx: Główny kontekst ustawień i preferencji. Używany: tak (provider w app/_layout.tsx).
36. src/db/schema/schema.sql: Pełny schemat bazy SQLite do referencji. Używany: pośrednio (materiał źródłowy dla narzędzi/db).
37. src/db/sqlite/db.ts: Warstwa dostępu do bazy SQLite (query runtime). Używany: tak (liczne ekrany i hooki).
38. src/db/sqlite/dbGenerator.ts: Generator danych testowych (batch słówek). Używany: tak (FlashcardsScreen).
39. src/features/customCourse/manualCards/ManualCardsEditor.tsx: Komponent edycji fiszek customowych. Używany: tak (CustomCourseContentScreen, EditCustomCourseScreen).
40. src/features/customCourse/manualCards/useManualCardsForm.ts: Hook formularza fiszek (historia, walidacje). Używany: tak (CustomCourseContentScreen, EditCustomCourseScreen).
41. src/theme/createThemeStylesHook.ts: Fabryka hooków styli zależnych od motywu. Używany: tak (większość plików *-styles.ts).
42. src/theme/theme.ts: Definicja palety i typów motywu. Używany: tak (SettingsContext, komponenty styli).
43. src/types/boxes.ts: Typy danych pudełek i fiszek. Używany: tak (hooki SRS, komponenty).
44. src/types/course.ts: Typy kursów językowych/customowych. Używany: tak (ekrany i konteksty).
45. src/types/language.ts: Typy związane z językami i poziomami CEFR. Używany: tak (LevelScreen, Settings).
46. src/utils/diacritics.ts: Helper usuwający diakrytyki przy porównywaniu tekstu. Używany: tak (useSpellchecking, Card).
47. src/utils/flashcardsStorage.ts: Util do czyszczenia zapisanych pudełek w AsyncStorage. Używany: nie (tylko opis w dokumentacji).
