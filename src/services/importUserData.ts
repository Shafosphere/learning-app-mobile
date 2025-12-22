import { getDB } from "@/src/db/sqlite/db";
import type { CustomFlashcardRecord } from "@/src/db/sqlite/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import type { CustomCourseExport, UserDataExport } from "./exportUserData";

export type ImportResult = {
    success: boolean;
    message?: string;
    stats?: {
        coursesCreated: number;
        flashcardsCreated: number;
        reviewsRestored: number;
        builtinReviewsRestored: number;
        boxesSnapshotsRestored: number;
        officialCoursesProcessed: number;
        officialReviewsRestored: number;
        officialHintsUpdated: number;
    };
};

async function restoreCustomCourse(
    db: any,
    courseExport: CustomCourseExport
): Promise<{ flashcardsCreated: number; reviewsRestored: number }> {
    const { course, flashcards, reviews } = courseExport;

    // 1. Create Course
    // We ignore the exported ID and create a new one to avoid conflicts
    const now = Date.now();
    const insertCourseResult = await db.runAsync(
        `INSERT INTO custom_courses (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        course.name,
        course.iconId,
        course.iconColor,
        course.colorId ?? null,
        course.reviewsEnabled ? 1 : 0,
        course.createdAt, // Preserve original creation date? Or use now? Let's preserve.
        now, // Updated at now
        course.isOfficial ? 1 : 0,
        course.slug ?? null
    );
    const newCourseId = insertCourseResult.lastInsertRowId;

    let flashcardsCreated = 0;
    let reviewsRestored = 0;
    const oldToNewFlashcardId = new Map<number, number>();

    // 2. Insert Flashcards
    for (const card of flashcards) {
        const insertCardResult = await db.runAsync(
            `INSERT INTO custom_flashcards
         (course_id, front_text, back_text, hint_front, hint_back, position, flipped, answer_only, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            newCourseId,
            card.frontText,
            card.backText,
            card.hintFront ?? null,
            card.hintBack ?? null,
            card.position,
            card.flipped ? 1 : 0,
            card.answerOnly ? 1 : 0,
            card.createdAt,
            now
        );
        const newFlashcardId = insertCardResult.lastInsertRowId;
        oldToNewFlashcardId.set(card.id, newFlashcardId);
        flashcardsCreated++;

        // Insert Answers
        // We can assume answers are derived from backText or we can try to restore them if we had them exported.
        // The export type CustomFlashcardRecord usually has 'answers' array if it came from getCustomFlashcards.
        // Let's check CustomFlashcardRecord definition in db.ts.
        // It has answers: string[].
        if (card.answers && card.answers.length > 0) {
            for (const answer of card.answers) {
                await db.runAsync(
                    `INSERT OR IGNORE INTO custom_flashcard_answers
             (flashcard_id, answer_text, created_at)
           VALUES (?, ?, ?);`,
                    newFlashcardId,
                    answer,
                    now
                );
            }
        }
    }

    // 3. Insert Reviews
    for (const review of reviews) {
        const newFlashcardId = oldToNewFlashcardId.get(review.flashcardId);
        if (!newFlashcardId) continue;

        await db.runAsync(
            `INSERT OR REPLACE INTO custom_reviews
         (course_id, flashcard_id, learned_at, next_review, stage)
       VALUES (?, ?, ?, ?, ?);`,
            newCourseId,
            newFlashcardId,
            review.learnedAt,
            review.nextReview,
            review.stage
        );
        reviewsRestored++;
    }

    return { flashcardsCreated, reviewsRestored };
}

async function restoreOfficialCourse(
    db: any,
    courseExport: CustomCourseExport
): Promise<{
    flashcardsCreated: number;
    reviewsRestored: number;
    hintsUpdated: number;
}> {
    const slug = courseExport.course.slug ?? null;
    let targetCourseId: number | null = null;

    if (slug) {
        const existing = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM custom_courses WHERE slug = ? LIMIT 1;`,
            slug
        );
        if (existing?.id) {
            targetCourseId = existing.id;
        }
    }

    if (targetCourseId == null) {
        const now = Date.now();
        const inserted = await db.runAsync(
            `INSERT INTO custom_courses (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?);`,
            courseExport.course.name,
            courseExport.course.iconId,
            courseExport.course.iconColor,
            courseExport.course.colorId ?? null,
            courseExport.course.reviewsEnabled ? 1 : 0,
            courseExport.course.createdAt ?? now,
            now,
            slug
        );
        targetCourseId = Number(inserted.lastInsertRowId ?? 0);
    }

    if (targetCourseId == null || targetCourseId === 0) {
        throw new Error("Nie udało się odnaleźć lub utworzyć kursu oficjalnego.");
    }

    const existingCards = await db.getAllAsync<{
        id: number;
        frontText: string;
        backText: string;
        hintFront: string | null;
        hintBack: string | null;
        position: number | null;
        flipped: number;
        answerOnly: number;
        createdAt: number;
        updatedAt: number;
        answerText: string | null;
    }>(
        `SELECT
           cf.id            AS id,
           cf.front_text    AS frontText,
           cf.back_text     AS backText,
           cf.hint_front    AS hintFront,
           cf.hint_back     AS hintBack,
           cf.position      AS position,
           cf.flipped       AS flipped,
           cf.answer_only  AS answerOnly,
           cf.created_at    AS createdAt,
           cf.updated_at    AS updatedAt,
           cfa.answer_text  AS answerText
         FROM custom_flashcards cf
         LEFT JOIN custom_flashcard_answers cfa ON cfa.flashcard_id = cf.id
         WHERE cf.course_id = ?
         ORDER BY cf.position IS NULL,
                  cf.position ASC,
                  cf.id ASC,
                  cfa.id ASC;`,
        targetCourseId
    );

    const existingById = new Map<number, CustomFlashcardRecord>();
    const positionMap = new Map<number, CustomFlashcardRecord>();
    const frontBackMap = new Map<string, CustomFlashcardRecord[]>();

    for (const row of existingCards) {
        let record = existingById.get(row.id);
        if (!record) {
            record = {
                id: row.id,
                courseId: targetCourseId,
                frontText: row.frontText,
                backText: row.backText,
                hintFront: row.hintFront,
                hintBack: row.hintBack,
                answers: [],
                position: row.position,
                flipped: row.flipped === 1,
                answerOnly: row.answerOnly === 1,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
            existingById.set(row.id, record);
            if (record.position != null) {
                positionMap.set(record.position, record);
            }
            const key = `${record.frontText}|||${record.backText}`;
            const list = frontBackMap.get(key) ?? [];
            list.push(record);
            frontBackMap.set(key, list);
        }
        if (row.answerText) {
            record.answers.push(row.answerText);
        }
    }

    const oldToNewFlashcardId = new Map<number, number>();
    let flashcardsCreated = 0;
    let hintsUpdated = 0;
    const now = Date.now();

    const findExistingCard = (
        card: CustomFlashcardRecord
    ): CustomFlashcardRecord | null => {
        if (card.position != null && positionMap.has(card.position)) {
            return positionMap.get(card.position) ?? null;
        }
        const key = `${card.frontText}|||${card.backText}`;
        const list = frontBackMap.get(key);
        return list?.[0] ?? null;
    };

    for (const card of courseExport.flashcards) {
        const existing = findExistingCard(card);
        if (existing) {
            oldToNewFlashcardId.set(card.id, existing.id);
            const nextHintFront = card.hintFront ?? null;
            const nextHintBack = card.hintBack ?? null;
            const nextAnswerOnly = card.answerOnly ?? false;
            const shouldUpdateHints =
                nextHintFront !== (existing.hintFront ?? null) ||
                nextHintBack !== (existing.hintBack ?? null);
            const shouldUpdateAnswerOnly =
                nextAnswerOnly !== (existing.answerOnly ?? false);
            if (shouldUpdateHints || shouldUpdateAnswerOnly) {
                await db.runAsync(
                    `UPDATE custom_flashcards
                       SET hint_front = ?, hint_back = ?, answer_only = ?, updated_at = ?
                     WHERE id = ?;`,
                    nextHintFront,
                    nextHintBack,
                    nextAnswerOnly ? 1 : 0,
                    now,
                    existing.id
                );
                if (shouldUpdateHints) {
                    hintsUpdated++;
                }
            }
            continue;
        }

        const insertCardResult = await db.runAsync(
            `INSERT INTO custom_flashcards
               (course_id, front_text, back_text, hint_front, hint_back, position, flipped, answer_only, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            targetCourseId,
            card.frontText,
            card.backText,
            card.hintFront ?? null,
            card.hintBack ?? null,
            card.position,
            card.flipped ? 1 : 0,
            card.answerOnly ? 1 : 0,
            card.createdAt ?? now,
            now
        );
        const newFlashcardId = insertCardResult.lastInsertRowId;
        oldToNewFlashcardId.set(card.id, newFlashcardId);
        flashcardsCreated++;

        if (card.answers && card.answers.length > 0) {
            for (const answer of card.answers) {
                await db.runAsync(
                    `INSERT OR IGNORE INTO custom_flashcard_answers
                       (flashcard_id, answer_text, created_at)
                     VALUES (?, ?, ?);`,
                    newFlashcardId,
                    answer,
                    now
                );
            }
        }
    }

    let reviewsRestored = 0;
    for (const review of courseExport.reviews) {
        const newFlashcardId = oldToNewFlashcardId.get(review.flashcardId);
        if (!newFlashcardId) continue;

        await db.runAsync(
            `INSERT OR REPLACE INTO custom_reviews
               (course_id, flashcard_id, learned_at, next_review, stage)
             VALUES (?, ?, ?, ?, ?);`,
            targetCourseId,
            newFlashcardId,
            review.learnedAt,
            review.nextReview,
            review.stage
        );
        reviewsRestored++;
    }

    return { flashcardsCreated, reviewsRestored, hintsUpdated };
}

export async function importUserData(): Promise<ImportResult> {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: "application/json",
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return { success: false, message: "Anulowano wybór pliku." };
        }

        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(fileContent) as UserDataExport;

        if (data.version !== 1) {
            return {
                success: false,
                message: `Nieobsługiwana wersja pliku: ${data.version}`,
            };
        }

    const db = await getDB();
    const hasBuiltinReviewsTableRow = await db.getFirstAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name = 'reviews' LIMIT 1;`
    );
    const builtinReviewsTableExists = Boolean(hasBuiltinReviewsTableRow?.name);
    let coursesCreated = 0;
    let flashcardsCreatedTotal = 0;
    let reviewsRestoredTotal = 0;
    let builtinReviewsRestored = 0;
        let officialCoursesProcessed = 0;
        let officialReviewsRestored = 0;
        let officialHintsUpdated = 0;

        await db.execAsync("BEGIN TRANSACTION;");
        try {
            // Restore Builtin Reviews
            if (data.builtinReviews && builtinReviewsTableExists) {
                for (const review of data.builtinReviews) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO reviews
               (word_id, source_lang_id, target_lang_id, level, stage, learned_at, next_review)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
                        review.wordId,
                        review.sourceLangId,
                        review.targetLangId,
                        review.level,
                        review.stage,
                        review.learnedAt,
                        review.nextReview
                    );
                    builtinReviewsRestored++;
                }
            }

            // Restore Custom Courses
            if (data.customCourses) {
                for (const courseExport of data.customCourses) {
                    const stats = await restoreCustomCourse(db, courseExport);
                    coursesCreated++;
                    flashcardsCreatedTotal += stats.flashcardsCreated;
                    reviewsRestoredTotal += stats.reviewsRestored;
                }
            }

            // Restore Official Courses (by slug if available)
            if (data.officialCourses) {
                for (const courseExport of data.officialCourses) {
                    const stats = await restoreOfficialCourse(db, courseExport);
                    officialCoursesProcessed++;
                    flashcardsCreatedTotal += stats.flashcardsCreated;
                    officialReviewsRestored += stats.reviewsRestored;
                    officialHintsUpdated += stats.hintsUpdated;
                }
            }

            await db.execAsync("COMMIT;");
        } catch (error) {
            await db.execAsync("ROLLBACK;");
            throw error;
        }

        // Restore AsyncStorage Snapshots
        const pairs: [string, string][] = [];
        let boxesSnapshotsRestored = 0;
        if (data.boxesSnapshots) {
            for (const [key, value] of Object.entries(data.boxesSnapshots)) {
                pairs.push([key, JSON.stringify(value)]);
                boxesSnapshotsRestored++;
            }
        }
        if (data.customBoxesSnapshots) {
            for (const [key, value] of Object.entries(data.customBoxesSnapshots)) {
                pairs.push([key, JSON.stringify(value)]);
                boxesSnapshotsRestored++;
            }
        }

        if (pairs.length > 0) {
            await AsyncStorage.multiSet(pairs);
        }

        return {
            success: true,
            stats: {
                coursesCreated,
                flashcardsCreated: flashcardsCreatedTotal,
                reviewsRestored: reviewsRestoredTotal,
                builtinReviewsRestored,
                boxesSnapshotsRestored,
                officialCoursesProcessed,
                officialReviewsRestored,
                officialHintsUpdated,
            },
        };
    } catch (error) {
        console.error("[importUserData] Error", error);
        return { success: false, message: "Wystąpił błąd podczas importu danych." };
    }
}
