- `src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen.tsx` - ekran wyboru aktywnego kursu. Grupuje kursy wbudowane i oficjalne, pozwala przełączać kurs aktywny oraz zapamiętuje ostatni wybór użytkownika.
- `src/screens/courses/editcourse/CourseEditScreen/CourseEditScreen.tsx` - główny edytor kursu. Obsługuje kursy wbudowane i własne.
- `src/screens/courses/makenewcourse/CourseAppearanceScreen/CourseAppearanceScreen.tsx` - pierwszy krok kreatora nowego kursu: nazwa, ikona i kolor.
- `src/screens/courses/makenewcourse/ImportFlashcardsScreen/ImportFlashcardsScreen.tsx` - drugi krok kreatora: import CSV lub ręczne dodawanie fiszek.
- `src/screens/courses/makenewcourse/CourseSettingsScreen/CourseSettingsScreen.tsx` - ustawienia nowego kursu przed zapisem.
- `src/screens/courses/pincourse/CoursePinScreen/CoursePinScreen.tsx` - ekran przypinania kursów.
- `src/components/courseEditor/` - komponenty edytora kursu: ustawienia, nazwa, ikona, ręczna edycja fiszek, selector typu karty i przewodnik importu CSV.
- `src/components/course/` - komponenty list, sekcji i akordeonów kursów używane przez ekrany kursów.
- `src/features/customCourse/` - drafty, typy pomocnicze i import CSV dla kursów własnych.

Wartości domyślne kursów określa `src/contexts/settings/courseSettingsDefaults.ts`.
Kreator kursów własnych, inicjalizacja kursów oficjalnych i reset ustawień korzystają z tego samego resolvera.
Przy uruchomieniu kursy oficjalne uzupełniają brakujące ustawienia, również opcje dodane po instalacji kursu.
Istniejące wpisy pozostają zachowane; ręczny wybór równy wartości domyślnej jest zapisywany jawnie, aby kolejna inicjalizacja go nie cofnęła.

| Opcja | Domyślne zachowanie |
| --- | --- |
| Audio | Włączone dla oficjalnych kursów wymienionych w `AUDIO_ENABLED_PACK_SLUGS` (pokrycie katalogu nagrań sprawdza test); w pozostałych i własnych wyłączone |
| Automatyczne audio | `non_native`: tylko język inny niż ojczysty; ręczne odtwarzanie pozostaje dostępne przy włączonym audio |
| Języki audio | `null` / automatyczne dla kursów oficjalnych; użytkownik może wskazać języki we własnych kursach |
| Autoflow | Włączone, chyba że manifest kursu stanowi inaczej |
| Wyjaśnienia | Włączone, nie tylko po błędzie |
| Pomijanie korekty | Wyłączone; włączone dla kursów wyłącznie P/F lub samooceny |
| Box 0 | Wyłączony, odpowiedź na odwrocie; manifest może zmienić oba ustawienia |
| Podpowiedzi literowe | Wyłączone poza pakietami startowymi wskazanymi w manifeście |
| Wygląd | Duża karta, dynamiczny obraz, ramka włączona, standardowa rola obrazu; manifest może określić wyjątki |
| Powtórki | Oficjalne: według manifestu (domyślnie włączone); własne: według wyboru w kreatorze (domyślnie wyłączone) |

Starsze zapisy audio bez `autoplayMode` używają `non_native`. Zapisane tryby `all` i `off` oraz jawne wyłączenie audio pozostają zachowane.
