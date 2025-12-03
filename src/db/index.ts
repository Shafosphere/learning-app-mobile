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
import * as dictionary from "./sqlite/repositories/dictionary";
import * as flashcards from "./sqlite/repositories/flashcards";
import * as reviews from "./sqlite/repositories/reviews";

// Register the initializer to avoid circular dependencies
setDbInitializer(initializeDatabase);

export const db = {
    getDB,
    addDbInitializationListener,
    courses,
    flashcards,
    reviews,
    analytics,
    dictionary,
    system: {
        initializeDatabase,
        seedOfficialPacks,
    },
};

// Re-export types for convenience
export * from "./sqlite/repositories/analytics";
export * from "./sqlite/repositories/courses";
export * from "./sqlite/repositories/dictionary";
export * from "./sqlite/repositories/flashcards";
export * from "./sqlite/repositories/reviews";
export type { DbInitializationEvent, DbInitializationListener };

