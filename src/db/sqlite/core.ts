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
  return SQLite.openDatabaseAsync("mygame.db");
}

let dbInitializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let dbInitializer: (() => Promise<SQLite.SQLiteDatabase>) | null = null;

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
    dbInitializationPromise = dbInitializer();
  }
  return dbInitializationPromise;
}
