import { getDB } from "@/src/db/sqlite/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import type {
    CustomCourseExport,
    UserDataExport
} from "./exportUserData";

export type ImportResult = {
    success: boolean;
    message?: string;
    stats?: {
        coursesCreated: number;
        flashcardsCreated: number;
        reviewsRestored: number;
        builtinReviewsRestored: number;
        boxesSnapshotsRestored: number;
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
         (course_id, front_text, back_text, position, flipped, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
            newCourseId,
            card.frontText,
            card.backText,
            card.position,
            card.flipped ? 1 : 0,
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
        let coursesCreated = 0;
        let flashcardsCreatedTotal = 0;
        let reviewsRestoredTotal = 0;
        let builtinReviewsRestored = 0;

        await db.execAsync("BEGIN TRANSACTION;");
        try {
            // Restore Builtin Reviews
            if (data.builtinReviews) {
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
            },
        };
    } catch (error) {
        console.error("[importUserData] Error", error);
        return { success: false, message: "Wystąpił błąd podczas importu danych." };
    }
}
