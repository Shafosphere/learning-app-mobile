import {
    addDbInitializationListener,
    DbInitializationEvent,
    DbInitializationListener,
    getDB,
    setDbInitializer,
} from "./sqlite/core";
import { initializeDatabase, seedOfficialPacks } from "./sqlite/init";
import * as analytics from "./sqlite/repositories/analytics";
import * as courses from "./sqlite/repositories/courses";
import * as flashcards from "./sqlite/repositories/flashcards";
import * as reviews from "./sqlite/repositories/reviews";
import * as learningHistory from "./sqlite/repositories/learningHistory";

// Register the initializer to avoid circular dependencies
setDbInitializer(initializeDatabase);

export const db = {
    getDB,
    addDbInitializationListener,
    courses,
    flashcards,
    reviews,
    learningHistory,
    analytics,
    system: {
        initializeDatabase,
        seedOfficialPacks,
    },
};

// Re-export types for convenience
export * from "./sqlite/repositories/analytics";
export * from "./sqlite/repositories/courses";
export * from "./sqlite/repositories/flashcards";
export * from "./sqlite/repositories/reviews";
export * from "./sqlite/repositories/learningHistory";
export type { DbInitializationEvent, DbInitializationListener };
