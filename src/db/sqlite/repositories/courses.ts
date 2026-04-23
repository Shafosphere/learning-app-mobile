import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { deleteImage } from "@/src/services/imageService";
import * as SQLite from "expo-sqlite";
import { getDB } from "../core";
import {
  clearCustomLearningEventsForCourseWithDb,
} from "./analytics";
import type { CustomFlashcardInput } from "./flashcards";
import { replaceCustomFlashcardsWithoutTransactionWithDb } from "./flashcards";
import { clearCustomReviewsForCourseWithDb } from "./reviews";

export interface CustomCourseRecord {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: boolean;
  createdAt: number;
  updatedAt: number;
  // optional metadata
  isOfficial?: boolean;
  slug?: string | null;
  packVersion?: number;
}

export interface CustomCourseInput {
  name: string;
  iconId: string;
  iconColor: string;
  colorId?: string | null;
  reviewsEnabled?: boolean;
}

export interface CustomCourseSummary extends CustomCourseRecord {
  cardsCount: number;
}

type CustomCourseSqlRow = {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: number;
  createdAt: number;
  updatedAt: number;
  isOfficial?: number;
  slug?: string | null;
  packVersion?: number;
};

type CustomCourseSummarySqlRow = CustomCourseSqlRow & {
  cardsCount: number;
};

export function mapCustomCourseRow(
  row: CustomCourseSqlRow
): CustomCourseRecord {
  return {
    ...row,
    reviewsEnabled: row.reviewsEnabled === 1,
    isOfficial: row.isOfficial === 1,
    slug: row.slug ?? null,
    packVersion: row.packVersion ?? 1,
  };
}

export function mapCustomCourseSummaryRow(
  row: CustomCourseSummarySqlRow
): CustomCourseSummary {
  const { cardsCount, ...rest } = row;
  const base = mapCustomCourseRow(rest as CustomCourseSqlRow);
  return {
    ...base,
    cardsCount,
  };
}

export async function getCustomCourses(): Promise<CustomCourseRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CustomCourseSqlRow>(
    `SELECT
       id,
       name,
       icon_id     AS iconId,
       icon_color  AS iconColor,
       color_id    AS colorId,
       COALESCE(reviews_enabled, 0) AS reviewsEnabled,
       created_at  AS createdAt,
       updated_at  AS updatedAt,
       COALESCE(is_official, 0) AS isOfficial,
       slug AS slug,
       COALESCE(pack_version, 1) AS packVersion
     FROM custom_courses
     ORDER BY created_at DESC, id DESC;`
  );
  return rows.map(mapCustomCourseRow);
}

export async function getCustomCourseNameCandidates(): Promise<
  { id: number; name: string }[]
> {
  const db = await getDB();
  return db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name
     FROM custom_courses
     ORDER BY created_at DESC, id DESC;`
  );
}

export async function getCustomCoursesWithCardCounts(): Promise<
  CustomCourseSummary[]
> {
  const db = await getDB();
  const rows = await db.getAllAsync<CustomCourseSummarySqlRow>(
    `SELECT
       cp.id,
       cp.name,
       cp.icon_id     AS iconId,
       cp.icon_color  AS iconColor,
       cp.color_id    AS colorId,
       COALESCE(cp.reviews_enabled, 0) AS reviewsEnabled,
       cp.created_at  AS createdAt,
       cp.updated_at  AS updatedAt,
       COALESCE(cp.is_official, 0) AS isOfficial,
       cp.slug AS slug,
       COALESCE(cp.pack_version, 1) AS packVersion,
       (
         SELECT COUNT(*)
         FROM custom_flashcards cf
         WHERE cf.course_id = cp.id
       ) AS cardsCount
     FROM custom_courses cp
     ORDER BY cp.created_at DESC, cp.id DESC;`
  );
  return rows.map(mapCustomCourseSummaryRow);
}

export async function getCustomCourseById(
  id: number
): Promise<CustomCourseRecord | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<CustomCourseSqlRow>(
    `SELECT
       id,
       name,
       icon_id     AS iconId,
       icon_color  AS iconColor,
       color_id    AS colorId,
       COALESCE(reviews_enabled, 0) AS reviewsEnabled,
       created_at  AS createdAt,
       updated_at  AS updatedAt,
       COALESCE(is_official, 0) AS isOfficial,
       slug,
       COALESCE(pack_version, 1) AS packVersion
     FROM custom_courses
     WHERE id = ?
     LIMIT 1;`,
    id
  );
  return row ? mapCustomCourseRow(row) : null;
}

export async function getCustomCourseBySlug(
  slug: string
): Promise<CustomCourseRecord | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }
  const db = await getDB();
  const row = await db.getFirstAsync<CustomCourseSqlRow>(
    `SELECT
       id,
       name,
       icon_id     AS iconId,
       icon_color  AS iconColor,
       color_id    AS colorId,
       COALESCE(reviews_enabled, 0) AS reviewsEnabled,
       created_at  AS createdAt,
       updated_at  AS updatedAt,
       COALESCE(is_official, 0) AS isOfficial,
       slug,
       COALESCE(pack_version, 1) AS packVersion
     FROM custom_courses
     WHERE slug = ?
     LIMIT 1;`,
    normalizedSlug
  );
  return row ? mapCustomCourseRow(row) : null;
}

export async function createCustomCourse(
  course: CustomCourseInput
): Promise<number> {
  const db = await getDB();
  const now = Date.now();
  const name = course.name.trim();
  if (!name) {
    throw new Error("Custom course name cannot be empty");
  }
  const reviewsEnabled = course.reviewsEnabled === true ? 1 : 0;
  const result = await db.runAsync(
    `INSERT INTO custom_courses (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    name,
    course.iconId,
    course.iconColor,
    course.colorId ?? null,
    reviewsEnabled,
    now,
    now
  );
  return Number(result.lastInsertRowId ?? 0);
}

export async function updateCustomCourseWithDb(
  db: SQLite.SQLiteDatabase,
  id: number,
  course: CustomCourseInput
): Promise<void> {
  const now = Date.now();
  const name = course.name.trim();
  if (!name) {
    throw new Error("Custom course name cannot be empty");
  }
  const reviewsEnabled = course.reviewsEnabled === true ? 1 : 0;
  await db.runAsync(
    `UPDATE custom_courses
     SET name = ?, icon_id = ?, icon_color = ?, color_id = ?, reviews_enabled = ?, updated_at = ?
     WHERE id = ?;`,
    name,
    course.iconId,
    course.iconColor,
    course.colorId ?? null,
    reviewsEnabled,
    now,
     id
  );
}

export async function updateCustomCourse(
  id: number,
  course: CustomCourseInput
): Promise<void> {
  const db = await getDB();
  await updateCustomCourseWithDb(db, id, course);
}

export async function saveCustomCourseEdits(
  id: number,
  course: CustomCourseInput,
  cards: CustomFlashcardInput[]
): Promise<void> {
  const db = await getDB();
  let deletedImages: string[] = [];
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    await updateCustomCourseWithDb(db, id, course);
    deletedImages = await replaceCustomFlashcardsWithoutTransactionWithDb(
      db,
      id,
      cards
    );
    await clearCustomReviewsForCourseWithDb(db, id);
    await clearCustomLearningEventsForCourseWithDb(db, id);
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }

  for (const uri of deletedImages) {
    await deleteImage(uri);
  }
}

export async function deleteCustomCourse(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM custom_courses WHERE id = ?;`, id);
}

export async function ensureOfficialCourse(
  db: SQLite.SQLiteDatabase,
  slug: string,
  name: string,
  iconId: string,
  iconColor: string,
  reviewsEnabled: boolean
): Promise<{ id: number; packVersion: number }> {
  console.log("[DB] ensureOfficialCourse: start", slug);
  const existing = await db.getFirstAsync<{ id: number; packVersion: number }>(
    `SELECT id, COALESCE(pack_version, 1) AS packVersion
     FROM custom_courses
     WHERE slug = ?
     LIMIT 1;`,
    slug
  );
  const now = Date.now();
  if (existing?.id) {
    console.log("[DB] ensureOfficialCourse: update existing", existing.id);
    await db.runAsync(
      `UPDATE custom_courses
       SET name = ?, icon_id = ?, icon_color = ?, reviews_enabled = ?, is_official = 1, updated_at = ?
       WHERE id = ?;`,
      name,
      iconId,
      iconColor,
      reviewsEnabled ? 1 : 0,
      now,
      existing.id
    );
    return {
      id: existing.id,
      packVersion: existing.packVersion ?? 1,
    };
  }
  console.log("[DB] ensureOfficialCourse: insert new", slug);
  const result = await db.runAsync(
    `INSERT INTO custom_courses
       (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug, pack_version)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 1, ?, 0);`,
    name,
    iconId,
    iconColor,
    reviewsEnabled ? 1 : 0,
    now,
    now,
    slug
  );
  console.log(
    "[DB] ensureOfficialCourse: inserted id=",
    Number(result.lastInsertRowId ?? 0)
  );
  return {
    id: Number(result.lastInsertRowId ?? 0),
    packVersion: 0,
  };
}

export async function getOfficialCustomCoursesWithCardCounts(): Promise<
  CustomCourseSummary[]
> {
  const db = await getDB();
  const officialSlugs = OFFICIAL_PACKS.map((pack) => pack.slug).filter(Boolean);
  if (officialSlugs.length === 0) {
    return [];
  }
  const placeholders = officialSlugs.map(() => "?").join(", ");
  const rows = await db.getAllAsync<CustomCourseSummarySqlRow>(
    `SELECT
       cp.id,
       cp.name,
       cp.icon_id     AS iconId,
       cp.icon_color  AS iconColor,
       cp.color_id    AS colorId,
       COALESCE(cp.reviews_enabled, 0) AS reviewsEnabled,
       cp.created_at  AS createdAt,
       cp.updated_at  AS updatedAt,
       COALESCE(cp.is_official, 0) AS isOfficial,
       cp.slug AS slug,
       COALESCE(cp.pack_version, 1) AS packVersion,
       (
         SELECT COUNT(*) FROM custom_flashcards cf WHERE cf.course_id = cp.id
       ) AS cardsCount
     FROM custom_courses cp
     WHERE COALESCE(cp.is_official, 0) = 1
       AND cp.slug IN (${placeholders})
     ORDER BY cp.created_at DESC, cp.id DESC;`,
    ...officialSlugs
  );
  return rows.map(mapCustomCourseSummaryRow);
}
