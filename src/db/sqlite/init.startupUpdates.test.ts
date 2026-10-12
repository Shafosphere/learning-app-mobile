import * as SQLite from "expo-sqlite";
import { seedOfficialPacksWithDb } from "./init";
import { ensureOfficialCourse } from "./repositories/courses";
import { notifyDbInitializationListeners } from "./core";

let mockCourseCount = 1;
jest.mock("@/src/constants/officialPacks", () => ({
  get OFFICIAL_PACKS() {
    return Array.from({ length: mockCourseCount }, (_, index) => ({
      slug: `course-${index}`, name: "Course", iconId: "flag:en", iconColor: "#10B981",
    }));
  },
}));
jest.mock("@/assets/data/sqlite/prebuilt.db", () => 1);
jest.mock("expo-sqlite", () => ({ importDatabaseFromAssetAsync: jest.fn(), openDatabaseAsync: jest.fn() }));
jest.mock("./repositories/courses", () => ({ ensureOfficialCourse: jest.fn() }));
jest.mock("./core", () => ({ notifyDbInitializationListeners: jest.fn() }));
jest.mock("./schema", () => ({ applySchema: jest.fn(), configurePragmas: jest.fn() }));
jest.mock("@/src/services/imageService", () => ({ deleteImage: jest.fn(), prepareImagesDirectory: jest.fn(), saveImageInDirectory: jest.fn() }));

describe("startup content update detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCourseCount = 1;
  });

  it.each([
    { name: "newer pack", localVersion: 1, localCount: 2, expectedUpdates: 1 },
    { name: "new course", localVersion: 0, localCount: 0, expectedUpdates: 1 },
    { name: "current data", localVersion: 2, localCount: 2, expectedUpdates: 0 },
    { name: "count repair only", localVersion: 2, localCount: 1, expectedUpdates: 0 },
    { name: "older bundled data", localVersion: 3, localCount: 2, expectedUpdates: 0 },
    { name: "first installation", localVersion: 0, localCount: 0, initialImport: true, expectedUpdates: 0 },
    { name: "background sync", localVersion: 1, localCount: 2, reportStartupProgress: false, expectedUpdates: 0 },
    { name: "multiple newer packs", localVersion: 1, localCount: 2, courseCount: 3, expectedUpdates: 1 },
  ])("reports $name correctly before card synchronization", async (scenario) => {
    mockCourseCount = scenario.courseCount ?? 1;
    const updateEvents = () => jest.mocked(notifyDbInitializationListeners).mock.calls
      .filter(([event]) => event.type === "content-update-detected");
    const local = {
      getFirstAsync: jest.fn().mockResolvedValue({ flashcardsCount: scenario.localCount }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      execAsync: jest.fn().mockImplementation(async () => {
        // The UI must receive detection before the first card transaction starts.
        expect(updateEvents()).toHaveLength(scenario.expectedUpdates);
      }),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    const bundled = {
      getFirstAsync: jest.fn().mockResolvedValue({ id: 5, packVersion: 2, flashcardsCount: 2 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      closeAsync: jest.fn().mockResolvedValue(undefined),
    };
    jest.mocked(SQLite.openDatabaseAsync).mockResolvedValue(bundled as unknown as SQLite.SQLiteDatabase);
    jest.mocked(ensureOfficialCourse).mockResolvedValue({ id: 7, packVersion: scenario.localVersion });

    await seedOfficialPacksWithDb(local as unknown as SQLite.SQLiteDatabase, {
      initialImport: scenario.initialImport,
      reportStartupProgress: scenario.reportStartupProgress,
    });

    expect(updateEvents()).toHaveLength(scenario.expectedUpdates);
    const shouldSync = scenario.localVersion < 2 || scenario.localCount !== 2;
    expect(local.execAsync).toHaveBeenCalledTimes(shouldSync ? 2 * mockCourseCount : 0);
    expect(bundled.closeAsync).toHaveBeenCalledTimes(1);
    if (scenario.reportStartupProgress === false) {
      expect(notifyDbInitializationListeners).not.toHaveBeenCalled();
    }
  });
});
