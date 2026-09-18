import {
  StartupTimer,
  errorMessage,
  isInitialDatabaseImport,
  toFileSystemUri,
} from "@/src/services/startupTiming";

describe("StartupTimer", () => {
  it("uses monotonic clock and records completed stages", async () => {
    let now = 10;
    const timer = new StartupTimer(() => now);

    await timer.measure("databaseImport", async () => {
      now = 38.6;
    });

    expect(timer.snapshot()).toEqual({ databaseImport: { durationMs: 29 } });
    now = 52;
    expect(timer.elapsedMs()).toBe(42);
  });

  it("keeps duration and failure state when a stage throws", async () => {
    let now = 0;
    const timer = new StartupTimer(() => now);

    await expect(
      timer.measure("schema", async () => {
        now = 17;
        throw new Error("schema failed");
      })
    ).rejects.toThrow("schema failed");

    expect(timer.snapshot()).toEqual({ schema: { durationMs: 17, failed: true } });
    expect(errorMessage(new Error("schema failed"))).toBe("schema failed");
  });
});

describe("initial database import classification", () => {
  it("marks only a missing device database as initial import", () => {
    expect(isInitialDatabaseImport(false)).toBe(true);
    expect(isInitialDatabaseImport(true)).toBe(false);
  });

  it("uses a file URI for Expo SQLite's native Android path", () => {
    expect(toFileSystemUri("/data/user/0/app/files/SQLite/mygame.db")).toBe(
      "file:///data/user/0/app/files/SQLite/mygame.db"
    );
    expect(toFileSystemUri("file:///data/user/0/app/files/SQLite/mygame.db")).toBe(
      "file:///data/user/0/app/files/SQLite/mygame.db"
    );
  });
});
