CREATE TABLE custom_courses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  icon_id         TEXT    NOT NULL,
  icon_color      TEXT    NOT NULL,
  color_id        TEXT,
  reviews_enabled INTEGER NOT NULL DEFAULT 0,
  is_official     INTEGER NOT NULL DEFAULT 0,
  slug            TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_custom_courses_slug
  ON custom_courses(slug)
  WHERE slug IS NOT NULL;

CREATE TABLE custom_flashcards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES custom_courses(id) ON DELETE CASCADE,
  front_text  TEXT    NOT NULL,
  back_text   TEXT    NOT NULL,
  hint_front  TEXT,
  hint_back   TEXT,
  position    INTEGER,
  flipped     INTEGER NOT NULL DEFAULT 1,
  answer_only INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE custom_flashcard_answers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id  INTEGER NOT NULL REFERENCES custom_flashcards(id) ON DELETE CASCADE,
  answer_text   TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  UNIQUE(flashcard_id, answer_text)
);

CREATE TABLE custom_reviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id      INTEGER NOT NULL REFERENCES custom_courses(id) ON DELETE CASCADE,
  flashcard_id   INTEGER NOT NULL REFERENCES custom_flashcards(id) ON DELETE CASCADE,
  learned_at     INTEGER NOT NULL,
  next_review    INTEGER NOT NULL,
  stage          INTEGER NOT NULL DEFAULT 0,
  UNIQUE(flashcard_id)
);

CREATE TABLE custom_learning_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id   INTEGER NOT NULL,
  course_id      INTEGER,
  box            TEXT,
  result         TEXT NOT NULL,
  duration_ms    INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE INDEX idx_custom_flashcards_course
  ON custom_flashcards(course_id, position);

CREATE INDEX idx_custom_flashcard_answers_card
  ON custom_flashcard_answers(flashcard_id);

CREATE INDEX idx_custom_reviews_course
  ON custom_reviews(course_id);

CREATE INDEX idx_custom_reviews_due
  ON custom_reviews(next_review);

CREATE INDEX idx_custom_learning_events_card
  ON custom_learning_events(flashcard_id);

CREATE INDEX idx_custom_learning_events_time
  ON custom_learning_events(created_at);
