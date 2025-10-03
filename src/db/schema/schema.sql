CREATE TABLE languages (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT    NOT NULL UNIQUE,   -- np. 'pl','en','es','fr'
  name TEXT    NOT NULL           -- np. 'Polski','English'
);
CREATE TABLE words (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  language_id INTEGER NOT NULL REFERENCES languages(id),
  text        TEXT    NOT NULL,
  cefr_level  TEXT    NOT NULL CHECK(cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  UNIQUE(language_id, text)
);
CREATE TABLE translations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  source_word_id      INTEGER NOT NULL REFERENCES words(id),
  target_language_id  INTEGER NOT NULL REFERENCES languages(id),
  translation_text    TEXT    NOT NULL,
  target_word_id      INTEGER REFERENCES words(id),
  UNIQUE(source_word_id, target_language_id, translation_text)
);
CREATE TABLE language_pairs (
  source_language_id INTEGER NOT NULL REFERENCES languages(id),
  target_language_id INTEGER NOT NULL REFERENCES languages(id),
  PRIMARY KEY (source_language_id, target_language_id)
);

CREATE TABLE custom_profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  icon_id     TEXT    NOT NULL,
  icon_color  TEXT    NOT NULL,
  color_id    TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE custom_flashcards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL REFERENCES custom_profiles(id) ON DELETE CASCADE,
  front_text  TEXT    NOT NULL,
  back_text   TEXT    NOT NULL,
  position    INTEGER,
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

CREATE TABLE reviews (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id          INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  source_lang_id   INTEGER NOT NULL REFERENCES languages(id),
  target_lang_id   INTEGER NOT NULL REFERENCES languages(id),
  level            TEXT    NOT NULL,
  learned_at       INTEGER NOT NULL,
  next_review      INTEGER NOT NULL,
  stage            INTEGER NOT NULL DEFAULT 0,
  UNIQUE(word_id, source_lang_id, target_lang_id)
);

-- Indeksy dla szybkich zapytań
CREATE INDEX idx_words_lang_cefr 
  ON words(language_id, cefr_level);
CREATE INDEX idx_trans_src_tgtlang 
  ON translations(source_word_id, target_language_id);
CREATE INDEX idx_custom_flashcards_profile
  ON custom_flashcards(profile_id, position);
CREATE INDEX idx_custom_flashcard_answers_card
  ON custom_flashcard_answers(flashcard_id);
CREATE INDEX idx_reviews_due
  ON reviews(next_review);
CREATE INDEX idx_reviews_pair
  ON reviews(source_lang_id, target_lang_id);
