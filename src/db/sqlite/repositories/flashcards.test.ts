import { replaceCustomFlashcardsWithDb } from "./flashcards";

jest.mock("@/src/services/imageService", () => ({
  deleteImage: jest.fn(() => Promise.resolve()),
}));

describe("flashcards repository image-only cards", () => {
  it("writes a card whose only content is a front image", async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };

    await replaceCustomFlashcardsWithDb(db as never, 42, [
      {
        frontText: "",
        answers: [],
        imageFront: "file://images/ae.svg",
        type: "text",
      },
    ]);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO custom_flashcards"),
      42,
      "",
      "",
      null,
      null,
      "file://images/ae.svg",
      null,
      null,
      0,
      0,
      0,
      null,
      0,
      0,
      "text",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("ignores a card whose only content is a back image", async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };

    await replaceCustomFlashcardsWithDb(db as never, 42, [
      {
        frontText: "",
        answers: [],
        imageBack: "file://images/ae.svg",
        type: "text",
      },
    ]);

    expect(
      db.runAsync.mock.calls.some(([sql]) =>
        `${sql}`.includes("INSERT INTO custom_flashcards")
      )
    ).toBe(false);
  });
});
