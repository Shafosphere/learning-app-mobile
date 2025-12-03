import * as SQLite from "expo-sqlite";
import { getDB } from "../core";

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

export type CustomCourseSqlRow = {
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
};

export type CustomCourseSummarySqlRow = CustomCourseSqlRow & {
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
       slug AS slug
     FROM custom_courses
     ORDER BY created_at DESC, id DESC;`
  );
  return rows.map(mapCustomCourseRow);
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
       slug
     FROM custom_courses
     WHERE id = ?
     LIMIT 1;`,
    id
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

export async function updateCustomCourse(
  id: number,
  course: CustomCourseInput
): Promise<void> {
  const db = await getDB();
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
): Promise<number> {
  console.log("[DB] ensureOfficialCourse: start", slug);
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM custom_courses WHERE slug = ? LIMIT 1;`,
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
    return existing.id;
  }
  console.log("[DB] ensureOfficialCourse: insert new", slug);
  const result = await db.runAsync(
    `INSERT INTO custom_courses
       (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 1, ?);`,
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
  return Number(result.lastInsertRowId ?? 0);
}

export async function getOfficialCustomCoursesWithCardCounts(): Promise<
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
       (
         SELECT COUNT(*) FROM custom_flashcards cf WHERE cf.course_id = cp.id
       ) AS cardsCount
     FROM custom_courses cp
     WHERE COALESCE(cp.is_official, 0) = 1
     ORDER BY cp.created_at DESC, cp.id DESC;`
  );
  return rows.map(mapCustomCourseSummaryRow);
}
