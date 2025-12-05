// This file is deprecated. Please use @/src/db/index.ts or specific repositories.
// Re-exporting for backward compatibility.

import { setDbInitializer } from "./core";
import { initializeDatabase } from "./init";

// Ensure legacy imports still register the initializer.
setDbInitializer(initializeDatabase);

export * from "./core";
export * from "./init";
export * from "./repositories/analytics";
export * from "./repositories/courses";
export * from "./repositories/flashcards";
export * from "./repositories/reviews";
export * from "./utils";
