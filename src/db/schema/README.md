# Model danych aplikacji do nauki słówek

Aktualny schemat SQLite (zgodny z `applySchema` w `src/db/sqlite/schema.ts`) obejmuje wyłącznie kursy customowe/fiszki wraz z powtórkami i logami zdarzeń. Stary słownik builtin został usunięty.

---

## Kursy customowe i fiszki

- **`custom_courses`** — definicja kursu (`name`, `icon_id`, `icon_color`, `color_id`, `reviews_enabled`, `is_official`, `slug`, `created_at`, `updated_at`).
  - Indeks: `idx_custom_courses_slug` (`UNIQUE`, tylko gdy `slug` nie jest NULL).
- **`custom_flashcards`** — fiszki w kursie (`course_id`, `front_text`, `back_text`, `hint_front`, `hint_back`, `position`, `flipped`, `created_at`, `updated_at`).
- **`custom_flashcard_answers`** — znormalizowane odpowiedzi z pola `back_text` (`flashcard_id`, `answer_text`, `created_at`), `UNIQUE(flashcard_id, answer_text)`.
- **`custom_reviews`** — SRS dla fiszek (`course_id`, `flashcard_id`, `learned_at`, `next_review`, `stage`), `UNIQUE(flashcard_id)`.
- **`custom_learning_events`** — logowanie prób nauki fiszek (`flashcard_id`, `course_id`, `box`, `result`, `duration_ms`, `created_at`).

Indeksy: `idx_custom_flashcards_course`, `idx_custom_flashcard_answers_card`, `idx_custom_reviews_course`, `idx_custom_reviews_due`, `idx_custom_learning_events_card`, `idx_custom_learning_events_time`.

---

## Uwagi implementacyjne

- `reviews_enabled`, `flipped`, `is_official` są `INTEGER NOT NULL DEFAULT 0/1` (bo SQLite).
- Kolumny `slug` (kursy), `flipped`, `hint_front` i `hint_back` (fiszki) zostały dodane w późniejszych migracjach — w kodzie są wymuszane przez `ensureColumn`.
- Wszystkie tabele używają kluczy obcych i indeksów zdefiniowanych w `schema.sql`; PRAGMA są ustawiane w kodzie (`configurePragmas`).
