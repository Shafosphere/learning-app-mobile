import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  buildUserDataExport,
  restoreUserData,
  type UserDataExport,
} from "@/src/services/userDataBackup";
import { getDB } from "@/src/db/sqlite/db";
import { getCustomCourses } from "@/src/db/sqlite/repositories/courses";
import { getCustomFlashcards } from "@/src/db/sqlite/repositories/flashcards";

jest.mock("@/src/db/sqlite/db", () => ({
  getDB: jest.fn(),
  deleteAndReinitializeDB: jest.fn(),
}));

jest.mock("@/src/db/sqlite/repositories/courses", () => ({
  getCustomCourses: jest.fn(),
}));

jest.mock("@/src/db/sqlite/repositories/flashcards", () => ({
  getCustomFlashcards: jest.fn(),
}));

jest.mock("@/src/services/imageService", () => ({
  imagesDir: "/tmp/images",
  importImageFromZip: jest.fn(async () => "/tmp/imported.jpg"),
  isManagedImageUri: jest.fn(() => false),
  saveImage: jest.fn(async (uri: string) => `managed:${uri}`),
}));

jest.mock("@/src/utils/flashcardsMapper", () => ({
  mapCustomCardToWord: jest.fn((card: any) => ({
    id: card.id,
    text: card.frontText,
    translations: card.answers?.length ? card.answers : [card.backText],
    flipped: card.flipped,
    answerOnly: card.answerOnly,
    stage: undefined,
    nextReview: undefined,
    hintFront: card.hintFront ?? null,
    hintBack: card.hintBack ?? null,
    imageFront: card.imageFront ?? null,
    imageBack: card.imageBack ?? null,
    explanation: card.explanation ?? null,
    type: card.type ?? "text",
  })),
}));

type MockDb = {
  execAsync: jest.Mock<Promise<void>, [string]>;
  getAllAsync: jest.Mock<Promise<any[]>, [string, ...any[]]>;
  getFirstAsync: jest.Mock<Promise<any>, [string, ...any[]]>;
  runAsync: jest.Mock<Promise<{ lastInsertRowId: number }>, [string, ...any[]]>;
};

const mockedGetDb = getDB as jest.MockedFunction<typeof getDB>;
const mockedGetCustomCourses = getCustomCourses as jest.MockedFunction<
  typeof getCustomCourses
>;
const mockedGetCustomFlashcards = getCustomFlashcards as jest.MockedFunction<
  typeof getCustomFlashcards
>;

function makeSnapshot(courseId: number, wordId: number, front = "front", back = "back") {
  return {
    v: 2 as const,
    updatedAt: 1700000000000,
    courseId: `${courseId}-${courseId}-custom-${courseId}`,
    sourceLangId: courseId,
    targetLangId: courseId,
    level: `custom-${courseId}`,
    batchIndex: 0,
    flashcards: {
      boxZero: [],
      boxOne: [
        {
          id: wordId,
          text: front,
          translations: [back],
          flipped: false,
          answerOnly: false,
          hintFront: null,
          hintBack: null,
          imageFront: null,
          imageBack: null,
          explanation: null,
          type: "text",
        },
      ],
      boxTwo: [],
      boxThree: [],
      boxFour: [],
      boxFive: [],
    },
    usedWordIds: [wordId],
    lastWriteMs: 1700000000001,
  };
}

function createMockDb(): MockDb {
  let nextCustomCourseId = 501;
  let nextFlashcardId = 601;

  return {
    execAsync: jest.fn(async () => {}),
    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes("sqlite_master")) {
        return { name: "reviews" };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql: string, ...params: any[]) => {
      if (sql.includes("FROM reviews")) {
        return [
          {
            wordId: 1,
            sourceLangId: 1,
            targetLangId: 2,
            level: "A1",
            stage: 2,
            learnedAt: 111,
            nextReview: 222,
          },
        ];
      }

      if (sql.includes("FROM custom_reviews") && sql.includes("WHERE course_id = ?")) {
        const [courseId] = params;
        if (courseId === 22) {
          return [
            {
              flashcardId: 2201,
              courseId: 22,
              stage: 3,
              learnedAt: 333,
              nextReview: 444,
            },
          ];
        }
        return [];
      }

      if (
        sql.includes("FROM custom_learning_events") &&
        sql.includes("WHERE course_id = ?")
      ) {
        const [courseId] = params;
        if (courseId === 22) {
          return [
            {
              flashcardId: 2201,
              courseId: 22,
              box: "boxTwo",
              result: "ok",
              durationMs: 1200,
              createdAt: 555,
            },
          ];
        }
        return [];
      }

      if (
        sql.includes("FROM custom_courses") &&
        sql.includes("COALESCE(is_official, 0) = 1")
      ) {
        return [{ id: 700, slug: "official-slug" }];
      }

      if (
        sql.includes("FROM custom_flashcards cf") &&
        sql.includes("WHERE cf.course_id = ?")
      ) {
        const [courseId] = params;
        if (courseId === 700) {
          return [
            {
              id: 701,
              frontText: "official-front",
              backText: "official-back",
              hintFront: null,
              hintBack: null,
              imageFront: null,
              imageBack: null,
              explanation: null,
              position: 0,
              flipped: 0,
              answerOnly: 0,
              externalId: "official-card-1",
              isOfficial: 1,
              resetProgressOnUpdate: 0,
              type: "text",
              createdAt: 100,
              updatedAt: 200,
              answerText: "official-back",
            },
          ];
        }
        return [];
      }

      return [];
    }),
    runAsync: jest.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO custom_courses")) {
        return { lastInsertRowId: nextCustomCourseId++ };
      }
      if (sql.includes("INSERT INTO custom_flashcards")) {
        return { lastInsertRowId: nextFlashcardId++ };
      }
      return { lastInsertRowId: 0 };
    }),
  };
}

describe("userDataBackup", () => {
  beforeEach(async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("exports stats state, custom course state and splits box snapshots by course type", async () => {
    const db = createMockDb();
    mockedGetDb.mockResolvedValue(db as never);
    mockedGetCustomCourses.mockResolvedValue([
      {
        id: 11,
        name: "Official",
        iconId: "star",
        iconColor: "#fff",
        colorId: null,
        reviewsEnabled: true,
        createdAt: 10,
        updatedAt: 20,
        isOfficial: true,
        slug: "official-slug",
        packVersion: 1,
      },
      {
        id: 22,
        name: "Custom",
        iconId: "book",
        iconColor: "#000",
        colorId: null,
        reviewsEnabled: true,
        createdAt: 30,
        updatedAt: 40,
        isOfficial: false,
        slug: null,
        packVersion: 1,
      },
    ] as any);

    mockedGetCustomFlashcards.mockImplementation(async (courseId: number) => {
      if (courseId === 11) {
        return [
          {
            id: 1101,
            courseId: 11,
            frontText: "official-front",
            backText: "official-back",
            answers: ["official-back"],
            hintFront: "hf",
            hintBack: "hb",
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 0,
            flipped: false,
            answerOnly: false,
            externalId: "official-card-1",
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
        ] as any;
      }

      return [
        {
          id: 2201,
          courseId: 22,
          frontText: "custom-front",
          backText: "custom-back",
          answers: ["custom-back"],
          hintFront: null,
          hintBack: null,
          imageFront: null,
          imageBack: null,
          explanation: "note",
          position: 0,
          flipped: false,
          answerOnly: false,
          externalId: null,
          isOfficial: false,
          resetProgressOnUpdate: false,
          type: "text",
          createdAt: 3,
          updatedAt: 4,
        },
      ] as any;
    });

    await AsyncStorage.multiSet([
      ["knownWords", JSON.stringify({ ids: [9, 7], lastLearnedDate: "2026-04-20" })],
      ["dailyProgress", JSON.stringify({ date: "2026-04-21", count: 5 })],
      ["stats.fireEffectEnabled", JSON.stringify(true)],
      ["stats.bookshelfEnabled", JSON.stringify(false)],
      ["officialPinnedCourseIds", JSON.stringify([11])],
      ["activeCustomCourseId", JSON.stringify(11)],
      ["boxes:1-2-A1", JSON.stringify(makeSnapshot(1, 10, "hello", "czesc"))],
      ["customBoxes:11-11-custom-11", JSON.stringify(makeSnapshot(11, 1101, "official-front", "official-back"))],
      ["customBoxes:22-22-custom-22", JSON.stringify(makeSnapshot(22, 2201, "custom-front", "custom-back"))],
    ]);

    const payload = await buildUserDataExport();

    expect(payload.statsState).toEqual({
      knownWords: { ids: [9, 7], lastLearnedDate: "2026-04-20" },
      dailyProgress: { date: "2026-04-21", count: 5 },
      statsUi: { fireEffectEnabled: true, bookshelfEnabled: false },
    });
    expect(payload.boxesSnapshots).toHaveProperty("boxes:1-2-A1");
    expect(payload.customCourseBoxSnapshots).toEqual({
      "custom-course:22": expect.objectContaining({
        sourceLangId: 22,
        targetLangId: 22,
        level: "custom-22",
      }),
    });
    expect(payload.officialCourseState.boxSnapshots).toEqual({
      "official-slug": expect.objectContaining({
        sourceLangId: 11,
        targetLangId: 11,
        level: "custom-11",
      }),
    });
    expect(payload.officialCourseState.pinnedOfficialCourseSlugs).toEqual([
      "official-slug",
    ]);
    expect(payload.officialCourseState.lastActiveOfficialCourseSlug).toBe(
      "official-slug"
    );
    expect(payload.customCourses).toEqual([
      expect.objectContaining({
        backupCourseKey: "custom-course:22",
        reviews: [
          expect.objectContaining({
            flashcardId: 2201,
            courseId: 22,
            stage: 3,
          }),
        ],
        learningEvents: [
          expect.objectContaining({
            flashcardId: 2201,
            courseId: 22,
            result: "ok",
          }),
        ],
      }),
    ]);
  });

  it("exports full officialCourseState including reviews, learning events and hints by slug", async () => {
    const db = createMockDb();
    mockedGetDb.mockResolvedValue(db as never);
    mockedGetCustomCourses.mockResolvedValue([
      {
        id: 11,
        name: "Official one",
        iconId: "star",
        iconColor: "#fff",
        colorId: null,
        reviewsEnabled: true,
        createdAt: 10,
        updatedAt: 20,
        isOfficial: true,
        slug: "official-slug",
        packVersion: 1,
      },
      {
        id: 12,
        name: "Ignored official without slug",
        iconId: "moon",
        iconColor: "#000",
        colorId: null,
        reviewsEnabled: true,
        createdAt: 11,
        updatedAt: 21,
        isOfficial: true,
        slug: "   ",
        packVersion: 1,
      },
    ] as any);

    db.getAllAsync.mockImplementation(async (sql: string, ...params: any[]) => {
      if (sql.includes("FROM reviews")) {
        return [];
      }

      if (sql.includes("FROM custom_reviews") && sql.includes("WHERE course_id = ?")) {
        const [courseId] = params;
        if (courseId === 11) {
          return [
            {
              flashcardId: 1101,
              courseId: 11,
              stage: 4,
              learnedAt: 1000,
              nextReview: 2000,
            },
            {
              flashcardId: 9999,
              courseId: 11,
              stage: 5,
              learnedAt: 3000,
              nextReview: 4000,
            },
          ];
        }
        return [];
      }

      if (
        sql.includes("FROM custom_learning_events") &&
        sql.includes("WHERE course_id = ?")
      ) {
        const [courseId] = params;
        if (courseId === 11) {
          return [
            {
              flashcardId: 1101,
              courseId: 11,
              box: "boxFour",
              result: "ok",
              durationMs: 777,
              createdAt: 5000,
            },
            {
              flashcardId: 9999,
              courseId: 11,
              box: "boxOne",
              result: "wrong",
              durationMs: 888,
              createdAt: 6000,
            },
          ];
        }
        return [];
      }

      return [];
    });

    mockedGetCustomFlashcards.mockImplementation(async (courseId: number) => {
      if (courseId === 11) {
        return [
          {
            id: 1101,
            courseId: 11,
            frontText: "official-front",
            backText: "official-back",
            answers: ["official-back"],
            hintFront: "front-hint",
            hintBack: "back-hint",
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 3,
            flipped: false,
            answerOnly: false,
            externalId: "official-card-1",
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
        ] as any;
      }

      if (courseId === 12) {
        return [
          {
            id: 1201,
            courseId: 12,
            frontText: "ignored",
            backText: "ignored",
            answers: ["ignored"],
            hintFront: null,
            hintBack: null,
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 0,
            flipped: false,
            answerOnly: false,
            externalId: "ignored-card",
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
        ] as any;
      }

      return [];
    });

    await AsyncStorage.multiSet([
      ["officialPinnedCourseIds", JSON.stringify([11, 12])],
      ["activeCustomCourseId", JSON.stringify(11)],
      ["stats.fireEffectEnabled", JSON.stringify(false)],
      ["stats.bookshelfEnabled", JSON.stringify(false)],
    ]);

    const payload = await buildUserDataExport();

    expect(payload.officialCourseState.pinnedOfficialCourseSlugs).toEqual([
      "official-slug",
    ]);
    expect(payload.officialCourseState.lastActiveOfficialCourseSlug).toBe(
      "official-slug"
    );
    expect(payload.officialCourseState.courses).toEqual([
      {
        slug: "official-slug",
        reviews: [
          {
            externalId: "official-card-1",
            position: 3,
            frontText: "official-front",
            backText: "official-back",
            stage: 4,
            learnedAt: 1000,
            nextReview: 2000,
          },
        ],
        learningEvents: [
          {
            externalId: "official-card-1",
            position: 3,
            frontText: "official-front",
            backText: "official-back",
            box: "boxFour",
            result: "ok",
            durationMs: 777,
            createdAt: 5000,
          },
        ],
        hints: [
          {
            externalId: "official-card-1",
            position: 3,
            frontText: "official-front",
            backText: "official-back",
            hintFront: "front-hint",
            hintBack: "back-hint",
          },
        ],
      },
    ]);
  });

  it("restores stats state, remaps custom course ids and restores snapshots for custom and official courses", async () => {
    const db = createMockDb();
    mockedGetCustomFlashcards.mockImplementation(async (courseId: number) => {
      if (courseId === 700) {
        return [
          {
            id: 777,
            courseId: 700,
            frontText: "official-front",
            backText: "official-back",
            answers: ["official-back"],
            hintFront: null,
            hintBack: null,
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 0,
            flipped: false,
            answerOnly: false,
            externalId: "official-card-1",
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
        ] as any;
      }
      return [];
    });

    await AsyncStorage.multiSet([
      ["officialPinnedCourseIds", JSON.stringify([])],
      ["activeCustomCourseId", JSON.stringify(null)],
      ["activeCourseIdx", JSON.stringify(null)],
    ]);

    const payload: UserDataExport = {
      version: 3,
      generatedAt: 123,
      builtinReviews: [
        {
          wordId: 1,
          sourceLangId: 1,
          targetLangId: 2,
          level: "A1",
          stage: 1,
          learnedAt: 111,
          nextReview: 222,
        },
      ],
      boxesSnapshots: {
        "boxes:1-2-A1": makeSnapshot(1, 10, "hello", "czesc"),
      },
      customCourseBoxSnapshots: {
        "custom-course:22": makeSnapshot(22, 2201, "custom-front", "custom-back"),
      },
      customCourses: [
        {
          backupCourseKey: "custom-course:22",
          course: {
            id: 22,
            name: "Imported custom",
            iconId: "book",
            iconColor: "#000",
            colorId: null,
            reviewsEnabled: true,
            createdAt: 10,
            updatedAt: 20,
            isOfficial: false,
            slug: null,
            packVersion: 1,
          },
          flashcards: [
            {
              id: 2201,
              courseId: 22,
              frontText: "custom-front",
              backText: "custom-back",
              answers: ["custom-back"],
              hintFront: null,
              hintBack: null,
              imageFront: null,
              imageBack: null,
              explanation: null,
              position: 0,
              flipped: false,
              answerOnly: false,
              externalId: null,
              isOfficial: false,
              resetProgressOnUpdate: false,
              type: "text",
              createdAt: 30,
              updatedAt: 40,
            },
          ],
          reviews: [
            {
              flashcardId: 2201,
              courseId: 22,
              stage: 2,
              learnedAt: 333,
              nextReview: 444,
            },
          ],
          learningEvents: [
            {
              flashcardId: 2201,
              courseId: 22,
              box: "boxTwo",
              result: "ok",
              durationMs: 1500,
              createdAt: 555,
            },
          ],
        },
      ],
      officialCourseState: {
        pinnedOfficialCourseSlugs: ["official-slug"],
        lastActiveOfficialCourseSlug: "official-slug",
        boxSnapshots: {
          "official-slug": makeSnapshot(
            11,
            1101,
            "official-front",
            "official-back"
          ),
        },
        courses: [
          {
            slug: "official-slug",
            reviews: [
              {
                externalId: "official-card-1",
                position: 0,
                frontText: "official-front",
                backText: "official-back",
                stage: 4,
                learnedAt: 777,
                nextReview: 888,
              },
            ],
            learningEvents: [
              {
                externalId: "official-card-1",
                position: 0,
                frontText: "official-front",
                backText: "official-back",
                box: "boxThree",
                result: "ok",
                durationMs: 1900,
                createdAt: 999,
              },
            ],
            hints: [],
          },
        ],
      },
      statsState: {
        knownWords: { ids: [4, 8], lastLearnedDate: "2026-04-21" },
        dailyProgress: { date: "2026-04-21", count: 9 },
        statsUi: { fireEffectEnabled: true, bookshelfEnabled: true },
      },
    };

    const result = await restoreUserData(payload, { targetDb: db as never });

    expect(result.success).toBe(true);
    expect(result.restoredState?.shouldMarkOnboardingDone).toBe(true);
    expect(result.restoredState?.progressStateApplied).toBe(true);
    expect(result.restoredState?.statsUiStateApplied).toBe(true);
    expect(result.stats).toEqual(
      expect.objectContaining({
        coursesCreated: 1,
        flashcardsCreated: 1,
        reviewsRestored: 1,
        builtinReviewsRestored: 1,
        officialPinnedCoursesRestored: 1,
        officialActiveCourseRestored: 1,
        boxSnapshotsRestored: 3,
        officialReviewsRestored: 1,
        officialCoursesSkipped: 0,
        learningEventsRestored: 2,
      })
    );

    expect(JSON.parse((await AsyncStorage.getItem("knownWords")) ?? "null")).toEqual(
      payload.statsState.knownWords
    );
    expect(
      JSON.parse((await AsyncStorage.getItem("dailyProgress")) ?? "null")
    ).toEqual(payload.statsState.dailyProgress);
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.fireEffectEnabled")) ?? "false"
      )
    ).toBe(true);
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.bookshelfEnabled")) ?? "false"
      )
    ).toBe(true);
    expect(
      JSON.parse((await AsyncStorage.getItem("officialPinnedCourseIds")) ?? "[]")
    ).toEqual([700]);
    expect(
      JSON.parse((await AsyncStorage.getItem("activeCustomCourseId")) ?? "null")
    ).toBe(700);

    const remappedCustomSnapshot = JSON.parse(
      (await AsyncStorage.getItem("customBoxes:501-501-custom-501")) ?? "null"
    );
    expect(remappedCustomSnapshot).toEqual(
      expect.objectContaining({
        sourceLangId: 501,
        targetLangId: 501,
        level: "custom-501",
        courseId: "501-501-custom-501",
      })
    );

    const remappedOfficialSnapshot = JSON.parse(
      (await AsyncStorage.getItem("customBoxes:700-700-custom-700")) ?? "null"
    );
    expect(remappedOfficialSnapshot).toEqual(
      expect.objectContaining({
        sourceLangId: 700,
        targetLangId: 700,
        level: "custom-700",
        courseId: "700-700-custom-700",
      })
    );
    expect(remappedOfficialSnapshot.flashcards.boxOne[0]).toEqual(
      expect.objectContaining({
        id: 777,
        text: "official-front",
        translations: ["official-back"],
      })
    );

    const customReviewInsert = db.runAsync.mock.calls.find(([sql]) =>
      sql.includes("INSERT OR REPLACE INTO custom_reviews")
    );
    expect(customReviewInsert?.slice(1, 6)).toEqual([501, 601, 333, 444, 2]);

    const customLearningEventInsert = db.runAsync.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO custom_learning_events")
    );
    expect(customLearningEventInsert?.slice(1, 7)).toEqual([
      601,
      501,
      "boxTwo",
      "ok",
      1500,
      555,
    ]);
  });

  it("restores old backups without statsState using default stats values", async () => {
    const db = createMockDb();

    const legacyPayload = {
      version: 3,
      generatedAt: 123,
      builtinReviews: [],
      boxesSnapshots: {},
      customCourseBoxSnapshots: {},
      customCourses: [],
      officialCourseState: {
        pinnedOfficialCourseSlugs: [],
        lastActiveOfficialCourseSlug: null,
        boxSnapshots: {},
        courses: [],
      },
    } as UserDataExport;

    const result = await restoreUserData(legacyPayload, { targetDb: db as never });

    expect(result.success).toBe(true);
    expect(result.restoredState?.progressStateApplied).toBe(true);
    expect(result.restoredState?.statsUiStateApplied).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem("knownWords")) ?? "null")).toEqual({
      ids: [],
      lastLearnedDate: "",
    });
    expect(
      JSON.parse((await AsyncStorage.getItem("dailyProgress")) ?? "null")
    ).toEqual({
      date: "",
      count: 0,
    });
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.fireEffectEnabled")) ?? "false"
      )
    ).toBe(false);
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.bookshelfEnabled")) ?? "false"
      )
    ).toBe(false);
  });

  it("preserves local stats during non-destructive import when progress already exists", async () => {
    const db = createMockDb();
    await AsyncStorage.multiSet([
      ["knownWords", JSON.stringify({ ids: [10, 11, 12], lastLearnedDate: "2026-04-21" })],
      ["dailyProgress", JSON.stringify({ date: "2026-04-21", count: 7 })],
      ["stats.fireEffectEnabled", JSON.stringify(false)],
      ["stats.bookshelfEnabled", JSON.stringify(false)],
    ]);

    const payload: UserDataExport = {
      version: 3,
      generatedAt: 123,
      builtinReviews: [],
      boxesSnapshots: {},
      customCourseBoxSnapshots: {},
      customCourses: [],
      officialCourseState: {
        pinnedOfficialCourseSlugs: [],
        lastActiveOfficialCourseSlug: null,
        boxSnapshots: {},
        courses: [],
      },
      statsState: {
        knownWords: { ids: [4, 8], lastLearnedDate: "2026-04-20" },
        dailyProgress: { date: "2026-04-20", count: 2 },
        statsUi: { fireEffectEnabled: true, bookshelfEnabled: true },
      },
    };

    const result = await restoreUserData(payload, { targetDb: db as never });

    expect(result.success).toBe(true);
    expect(result.restoredState?.progressStateApplied).toBe(false);
    expect(result.restoredState?.statsUiStateApplied).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem("knownWords")) ?? "null")).toEqual({
      ids: [10, 11, 12],
      lastLearnedDate: "2026-04-21",
    });
    expect(
      JSON.parse((await AsyncStorage.getItem("dailyProgress")) ?? "null")
    ).toEqual({
      date: "2026-04-21",
      count: 7,
    });
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.fireEffectEnabled")) ?? "false"
      )
    ).toBe(true);
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.bookshelfEnabled")) ?? "false"
      )
    ).toBe(true);
  });

  it("restores progress during non-destructive import even when local stats UI prefs were changed", async () => {
    const db = createMockDb();
    await AsyncStorage.multiSet([
      ["knownWords", JSON.stringify({ ids: [], lastLearnedDate: "" })],
      ["dailyProgress", JSON.stringify({ date: "", count: 0 })],
      ["stats.fireEffectEnabled", JSON.stringify(true)],
      ["stats.bookshelfEnabled", JSON.stringify(false)],
    ]);

    const payload: UserDataExport = {
      version: 3,
      generatedAt: 123,
      builtinReviews: [],
      boxesSnapshots: {},
      customCourseBoxSnapshots: {},
      customCourses: [],
      officialCourseState: {
        pinnedOfficialCourseSlugs: [],
        lastActiveOfficialCourseSlug: null,
        boxSnapshots: {},
        courses: [],
      },
      statsState: {
        knownWords: { ids: [4, 8], lastLearnedDate: "2026-04-20" },
        dailyProgress: { date: "2026-04-20", count: 2 },
        statsUi: { fireEffectEnabled: false, bookshelfEnabled: true },
      },
    };

    const result = await restoreUserData(payload, { targetDb: db as never });

    expect(result.success).toBe(true);
    expect(result.restoredState?.progressStateApplied).toBe(true);
    expect(result.restoredState?.statsUiStateApplied).toBe(false);
    expect(JSON.parse((await AsyncStorage.getItem("knownWords")) ?? "null")).toEqual(
      payload.statsState.knownWords
    );
    expect(
      JSON.parse((await AsyncStorage.getItem("dailyProgress")) ?? "null")
    ).toEqual(payload.statsState.dailyProgress);
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.fireEffectEnabled")) ?? "false"
      )
    ).toBe(true);
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("stats.bookshelfEnabled")) ?? "false"
      )
    ).toBe(false);
  });

  it("restores full officialCourseState including hints and identity fallback by position/front-back", async () => {
    const db = createMockDb();

    db.getAllAsync.mockImplementation(async (sql: string, ...params: any[]) => {
      if (
        sql.includes("FROM custom_courses") &&
        sql.includes("COALESCE(is_official, 0) = 1")
      ) {
        return [{ id: 700, slug: "official-slug" }];
      }

      if (
        sql.includes("FROM custom_flashcards cf") &&
        sql.includes("WHERE cf.course_id = ?")
      ) {
        const [courseId] = params;
        if (courseId === 700) {
          return [
            {
              id: 701,
              frontText: "match-by-external",
              backText: "answer-a",
              hintFront: null,
              hintBack: null,
              imageFront: null,
              imageBack: null,
              explanation: null,
              position: 0,
              flipped: 0,
              answerOnly: 0,
              externalId: "card-a",
              isOfficial: 1,
              resetProgressOnUpdate: 0,
              type: "text",
              createdAt: 1,
              updatedAt: 2,
              answerText: "answer-a",
            },
            {
              id: 702,
              frontText: "match-by-position",
              backText: "answer-b",
              hintFront: null,
              hintBack: null,
              imageFront: null,
              imageBack: null,
              explanation: null,
              position: 2,
              flipped: 0,
              answerOnly: 0,
              externalId: null,
              isOfficial: 1,
              resetProgressOnUpdate: 0,
              type: "text",
              createdAt: 1,
              updatedAt: 2,
              answerText: "answer-b",
            },
            {
              id: 703,
              frontText: "match-by-front-back",
              backText: "answer-c",
              hintFront: "old-front",
              hintBack: "old-back",
              imageFront: null,
              imageBack: null,
              explanation: null,
              position: 9,
              flipped: 0,
              answerOnly: 0,
              externalId: null,
              isOfficial: 1,
              resetProgressOnUpdate: 0,
              type: "text",
              createdAt: 1,
              updatedAt: 2,
              answerText: "answer-c",
            },
          ];
        }
        return [];
      }

      return [];
    });

    mockedGetCustomFlashcards.mockImplementation(async (courseId: number) => {
      if (courseId === 700) {
        return [
          {
            id: 701,
            courseId: 700,
            frontText: "match-by-external",
            backText: "answer-a",
            answers: ["answer-a"],
            hintFront: null,
            hintBack: null,
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 0,
            flipped: false,
            answerOnly: false,
            externalId: "card-a",
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
          {
            id: 702,
            courseId: 700,
            frontText: "match-by-position",
            backText: "answer-b",
            answers: ["answer-b"],
            hintFront: null,
            hintBack: null,
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 2,
            flipped: false,
            answerOnly: false,
            externalId: null,
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
          {
            id: 703,
            courseId: 700,
            frontText: "match-by-front-back",
            backText: "answer-c",
            answers: ["answer-c"],
            hintFront: "old-front",
            hintBack: "old-back",
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 9,
            flipped: false,
            answerOnly: false,
            externalId: null,
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
        ] as any;
      }

      return [];
    });

    const payload: UserDataExport = {
      version: 3,
      generatedAt: 123,
      builtinReviews: [],
      boxesSnapshots: {},
      customCourseBoxSnapshots: {},
      customCourses: [],
      officialCourseState: {
        pinnedOfficialCourseSlugs: ["official-slug"],
        lastActiveOfficialCourseSlug: "official-slug",
        boxSnapshots: {
          "official-slug": makeSnapshot(
            11,
            111,
            "match-by-front-back",
            "answer-c"
          ),
        },
        courses: [
          {
            slug: "official-slug",
            reviews: [
              {
                externalId: "card-a",
                position: 99,
                frontText: "ignored",
                backText: "ignored",
                stage: 3,
                learnedAt: 1111,
                nextReview: 2222,
              },
              {
                externalId: null,
                position: 2,
                frontText: "ignored-too",
                backText: "ignored-too",
                stage: 4,
                learnedAt: 3333,
                nextReview: 4444,
              },
            ],
            learningEvents: [
              {
                externalId: null,
                position: null,
                frontText: "match-by-front-back",
                backText: "answer-c",
                box: "boxFour",
                result: "wrong",
                durationMs: 5555,
                createdAt: 6666,
              },
            ],
            hints: [
              {
                externalId: "card-a",
                position: null,
                frontText: "match-by-external",
                backText: "answer-a",
                hintFront: "new-front-a",
                hintBack: "new-back-a",
              },
              {
                externalId: null,
                position: null,
                frontText: "match-by-front-back",
                backText: "answer-c",
                hintFront: "new-front-c",
                hintBack: "new-back-c",
              },
            ],
          },
        ],
      },
      statsState: {
        knownWords: { ids: [], lastLearnedDate: "" },
        dailyProgress: { date: "", count: 0 },
        statsUi: { fireEffectEnabled: false, bookshelfEnabled: false },
      },
    };

    const result = await restoreUserData(payload, { targetDb: db as never });

    expect(result.success).toBe(true);
    expect(result.stats).toEqual(
      expect.objectContaining({
        officialReviewsRestored: 2,
        learningEventsRestored: 1,
        boxSnapshotsRestored: 1,
        officialCoursesSkipped: 0,
      })
    );

    const hintUpdates = db.runAsync.mock.calls.filter(([sql]) =>
      sql.includes("UPDATE custom_flashcards")
    );
    expect(hintUpdates).toHaveLength(2);
    expect(hintUpdates[0]?.slice(1, 5)).toEqual([
      "new-front-a",
      "new-back-a",
      1700000000000,
      701,
    ]);
    expect(hintUpdates[1]?.slice(1, 5)).toEqual([
      "new-front-c",
      "new-back-c",
      1700000000000,
      703,
    ]);

    const officialReviewInserts = db.runAsync.mock.calls.filter(([sql]) =>
      sql.includes("INSERT OR REPLACE INTO custom_reviews")
    );
    expect(officialReviewInserts.map((call) => call.slice(1, 6))).toEqual([
      [700, 701, 1111, 2222, 3],
      [700, 702, 3333, 4444, 4],
    ]);

    const officialEventInserts = db.runAsync.mock.calls.filter(([sql]) =>
      sql.includes("INSERT INTO custom_learning_events")
    );
    expect(officialEventInserts.map((call) => call.slice(1, 7))).toEqual([
      [703, 700, "boxFour", "wrong", 5555, 6666],
    ]);

    const officialSnapshot = JSON.parse(
      (await AsyncStorage.getItem("customBoxes:700-700-custom-700")) ?? "null"
    );
    expect(officialSnapshot.flashcards.boxOne[0]).toEqual(
      expect.objectContaining({
        id: 703,
        text: "match-by-front-back",
        translations: ["answer-c"],
      })
    );
  });

  it("skips missing official slugs and cards during import without overwriting existing selection", async () => {
    const db = createMockDb();

    db.getAllAsync.mockImplementation(async (sql: string, ...params: any[]) => {
      if (
        sql.includes("FROM custom_courses") &&
        sql.includes("COALESCE(is_official, 0) = 1")
      ) {
        return [{ id: 700, slug: "official-slug" }];
      }

      if (
        sql.includes("FROM custom_flashcards cf") &&
        sql.includes("WHERE cf.course_id = ?")
      ) {
        const [courseId] = params;
        if (courseId === 700) {
          return [
            {
              id: 701,
              frontText: "known-front",
              backText: "known-back",
              hintFront: null,
              hintBack: null,
              imageFront: null,
              imageBack: null,
              explanation: null,
              position: 0,
              flipped: 0,
              answerOnly: 0,
              externalId: "known-card",
              isOfficial: 1,
              resetProgressOnUpdate: 0,
              type: "text",
              createdAt: 1,
              updatedAt: 2,
              answerText: "known-back",
            },
          ];
        }
        return [];
      }

      return [];
    });

    mockedGetCustomFlashcards.mockImplementation(async (courseId: number) => {
      if (courseId === 700) {
        return [
          {
            id: 701,
            courseId: 700,
            frontText: "known-front",
            backText: "known-back",
            answers: ["known-back"],
            hintFront: null,
            hintBack: null,
            imageFront: null,
            imageBack: null,
            explanation: null,
            position: 0,
            flipped: false,
            answerOnly: false,
            externalId: "known-card",
            isOfficial: true,
            resetProgressOnUpdate: false,
            type: "text",
            createdAt: 1,
            updatedAt: 2,
          },
        ] as any;
      }
      return [];
    });

    await AsyncStorage.multiSet([
      ["officialPinnedCourseIds", JSON.stringify([123])],
      ["activeCustomCourseId", JSON.stringify(456)],
      ["activeCourseIdx", JSON.stringify(7)],
    ]);

    const payload: UserDataExport = {
      version: 3,
      generatedAt: 123,
      builtinReviews: [],
      boxesSnapshots: {},
      customCourseBoxSnapshots: {},
      customCourses: [],
      officialCourseState: {
        pinnedOfficialCourseSlugs: ["official-slug", "missing-slug"],
        lastActiveOfficialCourseSlug: "missing-slug",
        boxSnapshots: {
          "official-slug": makeSnapshot(11, 111, "unknown-front", "unknown-back"),
          "missing-slug": makeSnapshot(12, 222, "ghost-front", "ghost-back"),
        },
        courses: [
          {
            slug: "official-slug",
            reviews: [
              {
                externalId: "missing-card",
                position: null,
                frontText: "missing-front",
                backText: "missing-back",
                stage: 1,
                learnedAt: 11,
                nextReview: 22,
              },
            ],
            learningEvents: [
              {
                externalId: "missing-card",
                position: null,
                frontText: "missing-front",
                backText: "missing-back",
                box: "boxOne",
                result: "ok",
                durationMs: 33,
                createdAt: 44,
              },
            ],
            hints: [
              {
                externalId: "missing-card",
                position: null,
                frontText: "missing-front",
                backText: "missing-back",
                hintFront: "x",
                hintBack: "y",
              },
            ],
          },
          {
            slug: "missing-slug",
            reviews: [],
            learningEvents: [],
            hints: [],
          },
        ],
      },
      statsState: {
        knownWords: { ids: [], lastLearnedDate: "" },
        dailyProgress: { date: "", count: 0 },
        statsUi: { fireEffectEnabled: false, bookshelfEnabled: false },
      },
    };

    const result = await restoreUserData(payload, { targetDb: db as never });

    expect(result.success).toBe(true);
    expect(result.stats).toEqual(
      expect.objectContaining({
        officialPinnedCoursesRestored: 1,
        officialActiveCourseRestored: 0,
        officialReviewsRestored: 0,
        learningEventsRestored: 0,
        boxSnapshotsRestored: 1,
        officialCoursesSkipped: 1,
      })
    );
    expect(result.restoredState?.shouldApplySelection).toBe(false);

    expect(
      JSON.parse((await AsyncStorage.getItem("officialPinnedCourseIds")) ?? "[]")
    ).toEqual([123]);
    expect(
      JSON.parse((await AsyncStorage.getItem("activeCustomCourseId")) ?? "null")
    ).toBe(456);
    expect(
      JSON.parse((await AsyncStorage.getItem("activeCourseIdx")) ?? "null")
    ).toBe(7);

    const officialSnapshot = JSON.parse(
      (await AsyncStorage.getItem("customBoxes:700-700-custom-700")) ?? "null"
    );
    expect(officialSnapshot.flashcards.boxOne[0]).toEqual(
      expect.objectContaining({
        id: 111,
        imageFront: null,
        imageBack: null,
      })
    );

    const writesThatShouldNotExist = db.runAsync.mock.calls.filter(([sql]) =>
      sql.includes("UPDATE custom_flashcards") ||
      sql.includes("INSERT OR REPLACE INTO custom_reviews") ||
      sql.includes("INSERT INTO custom_learning_events")
    );
    expect(writesThatShouldNotExist).toHaveLength(0);
  });
});
