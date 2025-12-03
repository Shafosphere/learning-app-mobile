# Dokumentacja bazy danych (Database Layer)

Ten folder zawiera całą logikę dostępu do lokalnej bazy danych SQLite. Baza jest zorganizowana według wzorca **Repository Pattern** z fasadą jako głównym punktem dostępu.

## 📁 Struktura

```
src/db/
├── index.ts                    # Główny punkt wejścia (Fasada)
├── README.md                   # Ten plik
└── sqlite/
    ├── core.ts                 # Zarządzanie połączeniem z bazą
    ├── schema.ts               # Definicje tabel i migracje
    ├── init.ts                 # Inicjalizacja i seedowanie
    ├── utils.ts                # Funkcje pomocnicze
    ├── db.ts                   # (Deprecated) Re-exporty dla kompatybilności
    └── repositories/           # Logika biznesowa podzielona tematycznie
        ├── courses.ts          # Operacje na kursach
        ├── flashcards.ts       # Operacje na fiszkach
        ├── reviews.ts          # System powtórek (SRS)
        ├── analytics.ts        # Statystyki i analizy
        └── dictionary.ts       # Słownik, języki, tłumaczenia
```

---

## 📄 Opisy plików

### `index.ts` - Główny punkt dostępu (Fasada)

**Odpowiedzialność:** Eksportuje obiekt `db`, który grupuje wszystkie funkcje bazodanowe w logiczne "serwisy".

**Zawartość:**
- Obiekt `db` z zagnieżdżonymi modułami:
  - `db.courses` - operacje na kursach
  - `db.flashcards` - operacje na fiszkach
  - `db.reviews` - system powtórek
  - `db.analytics` - statystyki
  - `db.dictionary` - słownik i języki
  - `db.system` - funkcje systemowe (inicjalizacja)
- Re-eksport typów TypeScript dla wygody

**Przykład użycia:**
```typescript
import { db } from '@/src/db';

// Pobierz wszystkie kursy
const courses = await db.courses.getCustomCourses();

// Zaplanuj powtórkę
await db.reviews.scheduleReview(wordId, sourceLangId, targetLangId, level, stage);

// Pobierz statystyki
const stats = await db.analytics.getDailyLearnedCountsBuiltin(fromMs, toMs);
```

---

### `sqlite/core.ts` - Zarządzanie połączeniem

**Odpowiedzialność:** Niskopoziomowe zarządzanie połączeniem z SQLite, singletony, listenery inicjalizacji.

**Zawiera:**
- `getDB()` - zwraca singleton instancji bazy danych
- `openDatabase()` - otwiera połączenie z SQLite
- `addDbInitializationListener()` - słuchacze zdarzeń inicjalizacji
- `notifyDbInitializationListeners()` - powiadamianie o statusie inicjalizacji
- `setDbInitializer()` - rejestracja funkcji inicjalizującej

**Kiedy używać:** Prawie nigdy bezpośrednio. Używane wewnętrznie przez repositories.

---

### `sqlite/schema.ts` - Definicje tabel i migracje

**Odpowiedzialność:** Tworzenie schematu bazy danych, dodawanie kolumn, migracje.

**Zawiera:**
- `applySchema()` - tworzy wszystkie tabele (languages, words, translations, custom_courses, reviews, itp.)
- `ensureColumn()` - dodaje kolumnę do tabeli, jeśli nie istnieje (migracje)
- `backfillCustomFlashcardAnswers()` - wypełnia brakujące odpowiedzi do fiszek
- `configurePragmas()` - konfiguruje ustawienia SQLite (WAL mode, cache, itp.)

**Kiedy używać:** Tylko podczas inicjalizacji lub dodawania nowych kolumn/tabel.

---

### `sqlite/init.ts` - Inicjalizacja i seedowanie

**Odpowiedzialność:** Pierwsza inicjalizacja bazy, import danych z CSV, seedowanie oficjalnych paczek.

**Zawiera:**
- `initializeDatabase()` - główna funkcja inicjalizująca (tworzy schemat, importuje CSV)
- `importInitialCsv()` - importuje słownictwo z `wordsENGtoPL.csv`
- `seedOfficialPacks()` - seeduje oficjalne kursy z `OFFICIAL_PACKS`
- `seedOfficialPacksWithDb()` - wersja wewnętrzna przyjmująca instancję db
- `readCsvAsset()` - helper do wczytywania CSV z assets
- `importOfficialPackIfEmpty()` - importuje oficjalny kurs tylko jeśli jest pusty

**Kiedy używać:** Automatycznie wywołane przy pierwszym uruchomieniu aplikacji. Możesz wywołać `db.system.seedOfficialPacks()` aby odświeżyć oficjalne paczki.

---

### `sqlite/utils.ts` - Funkcje pomocnicze

**Odpowiedzialność:** Małe, wielokrotnie używane funkcje narzędziowe.

**Zawiera:**
- `splitBackTextIntoAnswers()` - parsuje tekst odpowiedzi na tablicę (split po `;`, `,`, `\n`)
- `normalizeAnswersInput()` - normalizuje tablicę odpowiedzi (trim, deduplikacja)
- `dedupeOrdered()` - usuwa duplikaty zachowując kolejność
- `addAnswerIfPresent()` - dodaje odpowiedź do tablicy jeśli nie jest pusta
- `computeNextReviewFromStage()` - oblicza datę następnej powtórki na podstawie stage'u
- `createEmptyLevelCounts()` - tworzy pusty obiekt z licznikami dla poziomów CEFR

**Kiedy używać:** W repositories. Nie używaj bezpośrednio w UI.

---

### `sqlite/db.ts` - (Deprecated) Kompatybilność wsteczna

**Odpowiedzialność:** Re-eksportuje wszystkie funkcje z nowych plików, aby stare importy działały.

**Status:** Deprecated - używaj `src/db/index.ts` w nowym kodzie.

**Przykład starych importów (nadal działają):**
```typescript
import { getCustomCourses, scheduleReview } from '@/src/db/sqlite/db';
```

---

## 📂 Repositories - Logika biznesowa

### `repositories/courses.ts` - Kursy

**Odpowiedzialność:** CRUD dla kursów (zarówno custom jak i oficjalnych).

**Główne funkcje:**
- `getCustomCourses()` - pobiera wszystkie kursy
- `getCustomCoursesWithCardCounts()` - kursy z liczbą fiszek
- `getCustomCourseById(id)` - pojedynczy kurs
- `createCustomCourse(course)` - tworzy nowy kurs
- `updateCustomCourse(id, course)` - aktualizuje kurs
- `deleteCustomCourse(id)` - usuwa kurs
- `ensureOfficialCourse()` - tworzy/aktualizuje oficjalny kurs
- `getOfficialCustomCoursesWithCardCounts()` - tylko oficjalne kursy

**Typy:**
- `CustomCourseRecord` - rekord kursu z bazy
- `CustomCourseInput` - dane wejściowe do tworzenia kursu
- `CustomCourseSummary` - kurs + liczba fiszek

---

### `repositories/flashcards.ts` - Fiszki

**Odpowiedzialność:** CRUD dla fiszek w custom kursach.

**Główne funkcje:**
- `getCustomFlashcards(courseId)` - pobiera wszystkie fiszki z kursu
- `replaceCustomFlashcards(courseId, cards)` - zastępuje wszystkie fiszki w kursie
- `replaceCustomFlashcardsWithDb(db, courseId, cards)` - wersja wewnętrzna
- `countCustomFlashcardsForCourse(courseId)` - liczy fiszki w kursie

**Typy:**
- `CustomFlashcardRecord` - rekord fiszki z bazy
- `CustomFlashcardInput` - dane wejściowe do tworzenia fiszki
- `CustomFlashcardRow` - wersja SQL (flipped jako number)

**Specjalne:**
- Automatycznie parsuje `back_text` na tablicę `answers`
- Deduplikuje odpowiedzi

---

### `repositories/reviews.ts` - System powtórek (SRS)

**Odpowiedzialność:** Spaced Repetition System - zarządzanie harmonogramem powtórek.

**Główne funkcje:**

**Dla słownictwa (reviews):**
- `scheduleReview(wordId, sourceLangId, targetLangId, level, stage)` - planuje powtórkę
- `advanceReview(wordId, sourceLangId, targetLangId)` - przesuwa do następnego stage'u
- `removeReview(...)` - usuwa harmonogram powtórek
- `getDueReviews(sourceLangId, targetLangId, nowMs)` - pobiera słowa do powtórki
- `getRandomDueReviewWord(...)` - losowe słowo do powtórki
- `getDueReviewWordsBatch(...)` - batch słów do powtórki
- `countDueReviewsByLevel(...)` - ile słów czeka na powtórkę per poziom CEFR
- `countTotalDueReviews(...)` - łączna liczba powtórek
- `countLearnedWordsByLevel(...)` - ile słów opanowanych per poziom

**Dla custom fiszek (custom_reviews):**
- `scheduleCustomReview(flashcardId, courseId, stage)`
- `advanceCustomReview(flashcardId, courseId)`
- `removeCustomReview(flashcardId, courseId)`
- `getDueCustomReviewFlashcards(courseId, limit, nowMs)`
- `countDueCustomReviews(courseId, nowMs)`
- `clearCustomReviewsForCourse(courseId)`

**Debug/testing:**
- `addRandomReviewsForPair(sourceLangId, targetLangId, level, count)` - dodaje losowe słowa do powtórek
- `addRandomCustomReviews(courseId, count)` - dodaje losowe fiszki do powtórek
- `resetReviewsForPair(...)` - resetuje wszystkie powtórki dla pary językowej
- `resetCustomReviewsForCourse(courseId)` - resetuje powtórki dla kursu

**Globalne:**
- `countTotalLearnedWordsGlobal()` - łączna liczba opanowanych słów (reviews + custom_reviews)
- `countCustomLearnedForCourse(courseId)` - liczba opanowanych fiszek w kursie

**Typy:**
- `CustomReviewFlashcard` - fiszka z informacją o stage i next_review

---

### `repositories/analytics.ts` - Statystyki i analityka

**Odpowiedzialność:** Logowanie zdarzeń nauki, statystyki, analizy postępów.

**Główne funkcje:**

**Logowanie zdarzeń:**
- `logLearningEvent(params)` - loguje pojedyncze zdarzenie nauki (ok/wrong)
- `logCustomLearningEvent(params)` - loguje zdarzenie dla custom fiszki
- `logWordBoxMove(params)` - loguje przesunięcie słowa między boxami Leitnera

**Statystyki czasowe:**
- `getDailyLearnedCountsBuiltin(fromMs, toMs)` - liczba nauczonych słów per dzień (builtin)
- `getDailyLearnedCountsCustom(fromMs, toMs)` - liczba nauczonych fiszek per dzień (custom)
- `getHourlyActivityCounts(fromMs, toMs)` - aktywność per godzina dnia (0-23)
- `getTotalLearningTimeMs(fromMs, toMs)` - łączny czas nauki w ms

**Analiza trudności:**
- `getStubbornWords(sourceLangId, targetLangId, level, limit)` - "uparte" słowa (najwięcej przesunięć)
- `getHardWords(sourceLangId, targetLangId, limit)` - "trudne" słowa (najwięcej błędów przed nauczeniem)

**Typy:**
- `DailyCount` - `{ date: string, count: number }`
- `StubbornWord` - słowo z liczbą przesunięć
- `HardWord` - słowo z liczbą błędów

---

### `repositories/dictionary.ts` - Słownik i języki

**Odpowiedzialność:** Operacje na słowach, językach, tłumaczeniach, parach językowych.

**Główne funkcje:**

**Języki:**
- `seedLanguages(db)` - seeduje języki (en, pl)
- `getLanguagePairs()` - pobiera wszystkie pary językowe
- `getLanguageIdByCode(code)` - zwraca ID języka po kodzie (np. 'en' → 1)

**Słownik:**
- `getTotalWordsForLevel(languageId, level)` - liczba słów dla poziomu CEFR
- `getRandomEnglishWord()` - losowe angielskie słowo
- `getRandomTranslationsForLevel(...)` - losowe tłumaczenia dla poziomu CEFR

**Debug:**
- `logTableContents()` - loguje zawartość tabel do konsoli (debug)

**Typy:**
- `LanguagePair` - para językowa z kodami i ID

---

## 🔄 Workflow typowego użycia

### 1. Tworzenie nowego kursu
```typescript
import { db } from '@/src/db';

const courseId = await db.courses.createCustomCourse({
  name: "Mój kurs",
  iconId: "book",
  iconColor: "#FF5733",
  reviewsEnabled: true
});
```

### 2. Dodawanie fiszek do kursu
```typescript
await db.flashcards.replaceCustomFlashcards(courseId, [
  { frontText: "cat", backText: "kot" },
  { frontText: "dog", backText: "pies" }
]);
```

### 3. Sprawdzanie powtórek
```typescript
const dueCount = await db.reviews.countDueCustomReviews(courseId);
const dueCards = await db.reviews.getDueCustomReviewFlashcards(courseId, 10);
```

### 4. Zapisywanie wyniku nauki
```typescript
// Loguj zdarzenie
await db.analytics.logCustomLearningEvent({
  flashcardId: 123,
  courseId: courseId,
  result: 'ok',
  durationMs: 2500
});

// Zaplanuj kolejną powtórkę
await db.reviews.advanceCustomReview(123, courseId);
```

### 5. Pobieranie statystyk
```typescript
const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
const dailyStats = await db.analytics.getDailyLearnedCountsCustom(last7Days, Date.now());
```

---

## 🚀 Migracje i rozszerzanie

Jeśli chcesz dodać nową tabelę lub kolumnę:

1. **Dodaj definicję w `schema.ts`:**
   ```typescript
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS my_new_table (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL
     );
   `);
   ```

2. **Jeśli dodajesz kolumnę do istniejącej tabeli, użyj `ensureColumn()`:**
   ```typescript
   await ensureColumn(db, "custom_courses", "my_column", "TEXT");
   ```

3. **Stwórz nowe repository jeśli to nowa funkcjonalność:**
   ```typescript
   // src/db/sqlite/repositories/my_feature.ts
   import { getDB } from "../core";
   
   export async function getMyData() {
     const db = await getDB();
     return db.getAllAsync("SELECT * FROM my_new_table");
   }
   ```

4. **Dodaj do fasady w `index.ts`:**
   ```typescript
   import * as myFeature from "./sqlite/repositories/my_feature";
   
   export const db = {
     // ...
     myFeature,
   };
   ```

---

## ⚠️ Ważne uwagi

1. **Nie importuj bezpośrednio z repositories** - zawsze używaj `db` z `index.ts`
2. **Nie wywołuj `getDB()` w UI** - używaj funkcji z repositories
3. **Transakcje**: Jeśli robisz wiele operacji, rozważ użycie `BEGIN/COMMIT`
4. **Performance**: Używaj batch queries zamiast pętli z pojedynczymi zapytaniami
5. **Indexes**: Wszystkie często używane kolumny mają indexy (zdefiniowane w `schema.ts`)

---