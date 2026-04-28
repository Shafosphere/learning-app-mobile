// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const Papa = require("papaparse");

const ROOT_DIR = path.resolve(__dirname, "../..");
const SOURCE_DIR = path.join(ROOT_DIR, "tools", "prebuild-data");
const OUTPUT_DB_PATH = path.join(ROOT_DIR, "assets", "data", "sqlite", "prebuilt.db");

const OFFICIAL_PACKS = [
  {
    slug: "eng_to_pl_a1",
    name: "Ang A1",
    iconId: "flag:en",
    iconColor: "#10B981",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "ENGtoPL_A1.csv",
  },
  {
    slug: "eng_to_pl_a2",
    name: "Ang A2",
    iconId: "flag:en",
    iconColor: "#FBBF24",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "ENGtoPL_A2.csv",
  },
  {
    slug: "eng_to_pl_b1",
    name: "Ang B1",
    iconId: "flag:en",
    iconColor: "#6366F1",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "ENGtoPL_B1.csv",
  },
  {
    slug: "eng_to_pl_b2",
    name: "Ang B2",
    iconId: "flag:en",
    iconColor: "#EC4899",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "ENGtoPL_B2.csv",
  },
  {
    slug: "fiszki_podstawy_en_pl_slowa",
    name: "Ang Podstawy",
    iconId: "flag:en",
    iconColor: "#14B8A6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    packVersion: 2,
    csvFile: "fiszki_podstawy_EN-PL_slowa.csv",
  },
  {
    slug: "astronomia",
    name: "Astronomia",
    iconId: "planet",
    iconColor: "#8B5CF6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: false,
    csvFile: "astronomia.csv",
  },
  {
    slug: "polska_historia",
    name: "Historia Polski",
    iconId: "book",
    iconColor: "#DC2626",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: false,
    csvFile: "polska_historia.csv",
  },
  {
    slug: "math",
    name: "Matematyka Podstawa",
    iconId: "calculator",
    iconColor: "#38BDF8",
    reviewsEnabled: true,
    defaultType: "self_assess",
    defaultFlip: false,
    csvFile: "math.csv",
  },
  {
    slug: "grecka_mitologia_prawda_falsz_50",
    name: "Mitologia Grecka (P/F)",
    iconId: "book",
    iconColor: "#A855F7",
    reviewsEnabled: true,
    defaultType: "true_false",
    defaultFlip: false,
    csvFile: "grecka_mitologia_prawda_falsz_50.csv",
  },
  {
    slug: "flagi_europy",
    name: "Flagi Europy",
    iconId: "flag",
    iconColor: "#2563EB",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "flagi_europy.csv",
  },
  {
    slug: "flagi_afryki",
    name: "Flagi Afryki",
    iconId: "flag",
    iconColor: "#F97316",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    packVersion: 2,
    csvFile: "flagi_afryki.csv",
  },
  {
    slug: "flagi_azji",
    name: "Flagi Azji",
    iconId: "flag",
    iconColor: "#FBBF24",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "flagi_azji.csv",
  },
  {
    slug: "flagi_ameryki",
    name: "Flagi Ameryki",
    iconId: "flag",
    iconColor: "#EF4444",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    packVersion: 3,
    csvFile: "flagi_ameryki.csv",
  },
  {
    slug: "flagi_oceanii",
    name: "Flagi Oceanii",
    iconId: "flag",
    iconColor: "#8B5CF6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    packVersion: 2,
    csvFile: "flagi_oceanii.csv",
  },
  {
    slug: "flagi_swiata",
    name: "Flagi Świata",
    iconId: "flag",
    iconColor: "#0EA5E9",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    packVersion: 3,
    csvFile: "flagi_swiata.csv",
  },
  {
    slug: "panstwa_i_stolice_europy",
    name: "Państwa i Stolice Europy",
    iconId: "city",
    iconColor: "#2563EB",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "panstwa_i_stolice_europy.csv",
  },
  {
    slug: "panstwa_i_stolice_afryki",
    name: "Państwa i Stolice Afryki",
    iconId: "city",
    iconColor: "#F97316",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "panstwa_i_stolice_afryki.csv",
  },
  {
    slug: "panstwa_i_stolice_azji",
    name: "Państwa i Stolice Azji",
    iconId: "city",
    iconColor: "#FBBF24",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "panstwa_i_stolice_azji.csv",
  },
  {
    slug: "panstwa_i_stolice_ameryki",
    name: "Państwa i Stolice Ameryki",
    iconId: "city",
    iconColor: "#EF4444",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "panstwa_i_stolice_ameryki.csv",
  },
  {
    slug: "panstwa_i_stolice_oceanii",
    name: "Państwa i Stolice Oceanii",
    iconId: "city",
    iconColor: "#8B5CF6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "panstwa_i_stolice_oceanii.csv",
  },
  {
    slug: "panstwa_i_stolice_swiata",
    name: "Państwa i Stolice Świata",
    iconId: "city",
    iconColor: "#0EA5E9",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    csvFile: "panstwa_i_stolice_swiata.csv",
  },
].map((pack) => ({
  packVersion: 1,
  ...pack,
}));

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "tak", "t"]);
const KNOWN_CSV_HEADERS = new Set([
  "external_id",
  "type",
  "front_text",
  "back_text",
  "front_image",
  "back_image",
  "tf_answer",
  "flip",
  "explanation",
  "reset_progress_on_update",
]);

const ANSWER_SPLIT_REGEX = /[;,\n]/;

function parseBooleanValue(value) {
  if (value == null) return false;
  return TRUE_VALUES.has(String(value).trim().toLowerCase());
}

function parseCardType(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (
    normalized === "traditional" ||
    normalized === "true_false" ||
    normalized === "self_assess"
  ) {
    return normalized;
  }
  return null;
}

function dedupeOrdered(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function splitBackTextIntoAnswers(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return [];
  const tentative = trimmed
    .split(ANSWER_SPLIT_REGEX)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const candidates = tentative.length > 0 ? tentative : [trimmed];
  return dedupeOrdered(candidates);
}

function escapeSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlValue(value) {
  if (value == null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return escapeSqlString(value);
}

function readCardsFromCsv(pack) {
  const csvPath = path.join(SOURCE_DIR, pack.csvFile);
  const rawCsv = fs.readFileSync(csvPath, "utf8");
  const normalizedCsv = rawCsv.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parsed = Papa.parse(normalizedCsv, {
    header: true,
    skipEmptyLines: true,
  });
  const headerFields = (parsed.meta?.fields ?? []).map((field) =>
    field.trim().toLowerCase()
  );
  const hasKnownHeader = headerFields.some((field) => KNOWN_CSV_HEADERS.has(field));
  const rows = hasKnownHeader ? parsed.data : [];

  const cards = [];
  rows.forEach((row, idx) => {
    const explicitType = parseCardType(row.type);
    const resolvedType = explicitType ?? pack.defaultType ?? null;
    if (!resolvedType) return;

    const frontText = String(row.front_text ?? "").trim();
    const backRaw = String(row.back_text ?? "").trim();
    const externalIdRaw = row.external_id;
    const tfAnswerRaw = row.tf_answer;
    const hasTrueFalseFlag =
      tfAnswerRaw != null && String(tfAnswerRaw).trim().length > 0;
    const resetProgressRaw = row.reset_progress_on_update;

    const imageFront =
      row.front_image != null && String(row.front_image).trim().length > 0
        ? String(row.front_image).trim()
        : null;
    const imageBack =
      row.back_image != null && String(row.back_image).trim().length > 0
        ? String(row.back_image).trim()
        : null;

    const explanationRaw = row.explanation;
    const explanation =
      typeof explanationRaw === "string" && explanationRaw.trim().length > 0
        ? explanationRaw.trim()
        : null;

    const flipRaw = row.flip;
    const hasFlipOverride = flipRaw != null && String(flipRaw).trim().length > 0;
    const flipped = hasFlipOverride
      ? parseBooleanValue(flipRaw)
      : Boolean(pack.defaultFlip ?? false);

    const mappedType =
      resolvedType === "traditional"
        ? "text"
        : resolvedType === "true_false"
          ? "true_false"
          : "know_dont_know";

    let answers =
      mappedType === "true_false" && hasTrueFalseFlag
        ? [parseBooleanValue(tfAnswerRaw) ? "true" : "false"]
        : splitBackTextIntoAnswers(backRaw);

    let answerOnly = false;
    let finalFlipped = flipped;
    let finalExplanation = explanation;

    if (mappedType === "know_dont_know") {
      answers = [];
      answerOnly = true;
      finalFlipped = false;
      finalExplanation = explanation || backRaw || null;
    } else if (mappedType === "true_false") {
      answers = hasTrueFalseFlag
        ? [parseBooleanValue(tfAnswerRaw) ? "true" : "false"]
        : [];
    }

    if (
      frontText.length === 0 &&
      answers.length === 0 &&
      imageFront == null &&
      imageBack == null
    ) {
      return;
    }

    const backText = answers.length > 0 ? answers.join("; ") : backRaw;
    const normalizedExternalId =
      externalIdRaw != null && String(externalIdRaw).trim().length > 0
        ? String(externalIdRaw).trim()
        : null;

    if (!normalizedExternalId) {
      throw new Error(
        `Missing external_id in official pack CSV "${pack.csvFile}" at row ${idx + 2}. ` +
          `Official cards must use stable external_id values.`
      );
    }

    cards.push({
      externalId: normalizedExternalId,
      frontText,
      backText,
      answers,
      hintFront: null,
      hintBack: null,
      imageFront,
      imageBack,
      explanation: finalExplanation,
      position: idx,
      flipped: finalFlipped,
      answerOnly,
      isOfficial: true,
      resetProgressOnUpdate: parseBooleanValue(resetProgressRaw),
      type: mappedType,
    });
  });

  return cards;
}

function buildSchemaSql() {
  return `
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS custom_courses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  icon_id         TEXT    NOT NULL,
  icon_color      TEXT    NOT NULL,
  color_id        TEXT,
  reviews_enabled INTEGER NOT NULL DEFAULT 0,
  is_official     INTEGER NOT NULL DEFAULT 0,
  slug            TEXT,
  pack_version    INTEGER NOT NULL DEFAULT 1,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_courses_slug
  ON custom_courses(slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS custom_flashcards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES custom_courses(id) ON DELETE CASCADE,
  front_text  TEXT    NOT NULL,
  back_text   TEXT    NOT NULL,
  hint_front  TEXT,
  hint_back   TEXT,
  image_front TEXT,
  image_back  TEXT,
  explanation TEXT,
  position    INTEGER,
  flipped     INTEGER NOT NULL DEFAULT 0,
  answer_only INTEGER NOT NULL DEFAULT 0,
  type        TEXT NOT NULL DEFAULT 'text',
  external_id TEXT,
  is_official INTEGER NOT NULL DEFAULT 0,
  reset_progress_on_update INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_flashcards_course_external_id
  ON custom_flashcards(course_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS custom_flashcard_answers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id  INTEGER NOT NULL REFERENCES custom_flashcards(id) ON DELETE CASCADE,
  answer_text   TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  UNIQUE(flashcard_id, answer_text)
);

CREATE TABLE IF NOT EXISTS custom_reviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id      INTEGER NOT NULL REFERENCES custom_courses(id) ON DELETE CASCADE,
  flashcard_id   INTEGER NOT NULL REFERENCES custom_flashcards(id) ON DELETE CASCADE,
  learned_at     INTEGER NOT NULL,
  next_review    INTEGER NOT NULL,
  stage          INTEGER NOT NULL DEFAULT 0,
  UNIQUE(flashcard_id)
);

CREATE TABLE IF NOT EXISTS custom_learning_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id   INTEGER NOT NULL,
  course_id      INTEGER,
  box            TEXT,
  result         TEXT NOT NULL,
  duration_ms    INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_flashcards_course
  ON custom_flashcards(course_id, position);
CREATE INDEX IF NOT EXISTS idx_custom_flashcard_answers_card
  ON custom_flashcard_answers(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_custom_reviews_course
  ON custom_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_custom_reviews_due
  ON custom_reviews(next_review);
CREATE INDEX IF NOT EXISTS idx_custom_learning_events_card
  ON custom_learning_events(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_custom_learning_events_time
  ON custom_learning_events(created_at);
`;
}

function buildDataSql() {
  const now = Date.now();
  let courseId = 1;
  let flashcardId = 1;
  let answerId = 1;

  const statements = ["BEGIN TRANSACTION;"];

  for (const pack of OFFICIAL_PACKS) {
    const cards = readCardsFromCsv(pack);

    statements.push(
      `INSERT INTO custom_courses (id, name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug, pack_version) VALUES (${sqlValue(courseId)}, ${sqlValue(pack.name)}, ${sqlValue(pack.iconId)}, ${sqlValue(pack.iconColor)}, NULL, ${sqlValue(pack.reviewsEnabled ? 1 : 0)}, ${sqlValue(now)}, ${sqlValue(now)}, 1, ${sqlValue(pack.slug)}, ${sqlValue(pack.packVersion ?? 1)});`
    );

    for (const card of cards) {
      statements.push(
        `INSERT INTO custom_flashcards (id, course_id, front_text, back_text, hint_front, hint_back, image_front, image_back, explanation, position, flipped, answer_only, type, external_id, is_official, reset_progress_on_update, created_at, updated_at) VALUES (${sqlValue(flashcardId)}, ${sqlValue(courseId)}, ${sqlValue(card.frontText)}, ${sqlValue(card.backText)}, ${sqlValue(card.hintFront)}, ${sqlValue(card.hintBack)}, ${sqlValue(card.imageFront)}, ${sqlValue(card.imageBack)}, ${sqlValue(card.explanation)}, ${sqlValue(card.position)}, ${sqlValue(card.flipped ? 1 : 0)}, ${sqlValue(card.answerOnly ? 1 : 0)}, ${sqlValue(card.type)}, ${sqlValue(card.externalId)}, 1, ${sqlValue(card.resetProgressOnUpdate ? 1 : 0)}, ${sqlValue(now)}, ${sqlValue(now)});`
      );

      for (const answer of card.answers) {
        statements.push(
          `INSERT INTO custom_flashcard_answers (id, flashcard_id, answer_text, created_at) VALUES (${sqlValue(answerId)}, ${sqlValue(flashcardId)}, ${sqlValue(answer)}, ${sqlValue(now)});`
        );
        answerId += 1;
      }

      flashcardId += 1;
    }

    courseId += 1;
  }

  statements.push("COMMIT;");
  return statements.join("\n");
}

function ensurePaths() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Missing source directory: ${SOURCE_DIR}`);
  }
  fs.mkdirSync(path.dirname(OUTPUT_DB_PATH), { recursive: true });
}

function runSqliteFile(dbPath, filePath) {
  execFileSync("sqlite3", [dbPath, `.read ${filePath}`], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

function runSqliteStatement(dbPath, sql) {
  execFileSync("sqlite3", [dbPath, sql], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

function main() {
  ensurePaths();

  const tempSqlPath = path.join(os.tmpdir(), `prebuilt-${Date.now()}.sql`);
  const tempDbPath = path.join(
    path.dirname(OUTPUT_DB_PATH),
    `.prebuilt-${process.pid}-${Date.now()}.db`
  );
  const schemaSql = buildSchemaSql();
  const dataSql = buildDataSql();
  const fullSql = `${schemaSql}\n${dataSql}\n`;

  let movedTempDb = false;
  fs.writeFileSync(tempSqlPath, fullSql, "utf8");
  try {
    runSqliteFile(tempDbPath, tempSqlPath);
    runSqliteStatement(tempDbPath, "ANALYZE; VACUUM;");
    fs.renameSync(tempDbPath, OUTPUT_DB_PATH);
    movedTempDb = true;
  } finally {
    fs.rmSync(tempSqlPath, { force: true });
    if (!movedTempDb) {
      fs.rmSync(tempDbPath, { force: true });
    }
  }

  const sizeBytes = fs.statSync(OUTPUT_DB_PATH).size;
  const sizeMb = (sizeBytes / 1024 / 1024).toFixed(2);
  console.log(`Generated prebuilt database: ${OUTPUT_DB_PATH} (${sizeMb} MB)`);
}

main();
