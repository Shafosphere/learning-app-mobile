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

-- Indeksy dla szybkich zapytań
CREATE INDEX idx_words_lang_cefr 
  ON words(language_id, cefr_level);
CREATE INDEX idx_trans_src_tgtlang 
  ON translations(source_word_id, target_language_id);

-- Ustawienia SQLite (wykonaj raz przy otwarciu DB)
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA page_size = 4096;