import * as SQLite from "expo-sqlite";

export type DbInitializationEvent =
  | { type: "start" }
  | { type: "import-start" }
  | { type: "import-finish" }
  | { type: "ready"; initialImport: boolean }
  | { type: "error"; error: unknown };

export type DbInitializationListener = (event: DbInitializationEvent) => void;

const dbInitializationListeners = new Set<DbInitializationListener>();
let lastDbInitializationEvent: DbInitializationEvent | null = null;
export const DATABASE_NAME = "mygame.db";

export function addDbInitializationListener(
  listener: DbInitializationListener
): () => void {
  dbInitializationListeners.add(listener);
  if (lastDbInitializationEvent) {
    try {
      listener(lastDbInitializationEvent);
    } catch (error) {
      console.warn("[DB] DbInitializationListener threw on subscribe", error);
    }
  }
  return () => {
    dbInitializationListeners.delete(listener);
  };
}

export function notifyDbInitializationListeners(
  event: DbInitializationEvent
): void {
  lastDbInitializationEvent = event;
  dbInitializationListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn("[DB] DbInitializationListener threw", error);
    }
  });
}

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
}

let dbInitializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let dbInitializer: (() => Promise<SQLite.SQLiteDatabase>) | null = null;
let activeDb: SQLite.SQLiteDatabase | null = null;

export function setDbInitializer(
  initializer: () => Promise<SQLite.SQLiteDatabase>
) {
  dbInitializer = initializer;
}

export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInitializationPromise) {
    if (!dbInitializer) {
      throw new Error(
        "DB Initializer not set! Make sure to import the db setup."
      );
    }
    dbInitializationPromise = dbInitializer()
      .then((db) => {
        activeDb = db;
        return db;
      })
      .catch((error) => {
        dbInitializationPromise = null;
        throw error;
      });
  }
  return dbInitializationPromise;
}

export function getActiveDb(): SQLite.SQLiteDatabase | null {
  return activeDb;
}

export async function closeActiveDb(): Promise<void> {
  if (!activeDb) {
    return;
  }
  try {
    await activeDb.closeAsync();
  } catch (error) {
    console.warn("[DB] Failed to close active database", error);
  } finally {
    activeDb = null;
  }
}

export async function resetDbInitializationState(): Promise<void> {
  dbInitializationPromise = null;
  await closeActiveDb();
}

export async function retryDbInitialization(): Promise<SQLite.SQLiteDatabase> {
  await resetDbInitializationState();
  return getDB();
}

export async function deleteAndReinitializeDB(): Promise<SQLite.SQLiteDatabase> {
  await resetDbInitializationState();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  return getDB();
}
