import { Asset } from "expo-asset";
import { hydrateBundledImagePaths } from "@/src/db/sqlite/init";
import * as ImageService from "@/src/services/imageService";

jest.mock("@/src/constants/officialPacks", () => ({
  OFFICIAL_PACKS: [
    {
      slug: "flags",
      imageMap: { "flag.png": 101 },
    },
  ],
}));
jest.mock("@/assets/data/sqlite/prebuilt.db", () => 1);
jest.mock("expo-asset", () => ({
  Asset: { fromModule: jest.fn() },
}));
jest.mock("@/src/services/imageService", () => ({
  deleteImage: jest.fn(),
  prepareImagesDirectory: jest.fn().mockResolvedValue("file:///documents/images/"),
  saveImageInDirectory: jest.fn(),
}));
jest.mock("./core", () => ({
  DATABASE_NAME: "mygame.db",
  getDB: jest.fn(),
  notifyDbInitializationListeners: jest.fn(),
  openDatabase: jest.fn(),
}));
jest.mock("./schema", () => ({ applySchema: jest.fn(), configurePragmas: jest.fn() }));
jest.mock("./repositories/courses", () => ({ ensureOfficialCourse: jest.fn() }));

const mockDownloadAsync = jest.fn();
const mockSaveImageInDirectory = ImageService.saveImageInDirectory as jest.Mock;
const mockDeleteImage = ImageService.deleteImage as jest.Mock;
const mockPrepareImagesDirectory = ImageService.prepareImagesDirectory as jest.Mock;

describe("bundled image hydration", () => {
  const db = {
    getAllAsync: jest.fn(),
    execAsync: jest.fn(),
    runAsync: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadAsync.mockResolvedValue(undefined);
    (Asset.fromModule as jest.Mock).mockReturnValue({
      downloadAsync: mockDownloadAsync,
      localUri: "file:///assets/flag.png",
      type: "png",
    });
    mockSaveImageInDirectory
      .mockResolvedValueOnce("file:///documents/images/one.png")
      .mockResolvedValueOnce("file:///documents/images/two.png");
    db.execAsync.mockResolvedValue(undefined);
    db.runAsync.mockResolvedValue(undefined);
  });

  it("caches a repeated bundled asset but creates separate card files", async () => {
    db.getAllAsync.mockResolvedValue([
      { id: 1, imageFront: "flag.png", imageBack: null },
      { id: 2, imageFront: "flag.png", imageBack: "file:///existing.png" },
    ]);

    const result = await hydrateBundledImagePaths(db);

    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
    expect(mockSaveImageInDirectory).toHaveBeenCalledTimes(2);
    expect(db.runAsync.mock.calls[0][1]).not.toBe(db.runAsync.mock.calls[1][1]);
    expect(result).toMatchObject({
      imageReferences: 2,
      hydratedImages: 2,
      updatedRows: 2,
    });
  });

  it("leaves existing installed-device and user image paths untouched", async () => {
    db.getAllAsync.mockResolvedValue([
      {
        id: 1,
        imageFront: "file:///data/user/0/app/files/images/legacy.png",
        imageBack: "content://media/external/images/media/10",
      },
      {
        id: 2,
        imageFront: "https://example.test/user-image.png",
        imageBack: "data:image/png;base64,abc",
      },
    ]);

    await expect(hydrateBundledImagePaths(db)).resolves.toMatchObject({
      imageReferences: 0,
      hydratedImages: 0,
      updatedRows: 0,
    });
    expect(Asset.fromModule).not.toHaveBeenCalled();
    expect(mockPrepareImagesDirectory).not.toHaveBeenCalled();
    expect(mockSaveImageInDirectory).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
    expect(db.execAsync).not.toHaveBeenCalled();
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("rolls back path updates and deletes batch files when an update fails", async () => {
    db.getAllAsync.mockResolvedValue([
      { id: 1, imageFront: "flag.png", imageBack: null },
    ]);
    db.runAsync.mockRejectedValue(new Error("write failed"));

    await expect(hydrateBundledImagePaths(db)).rejects.toThrow("write failed");
    expect(db.execAsync).toHaveBeenCalledWith("BEGIN TRANSACTION;");
    expect(db.execAsync).toHaveBeenCalledWith("ROLLBACK;");
    expect(mockDeleteImage).toHaveBeenCalledWith("file:///documents/images/one.png");
  });

  it("can retry after a copy failure", async () => {
    db.getAllAsync.mockResolvedValue([
      { id: 1, imageFront: "flag.png", imageBack: null },
    ]);
    mockSaveImageInDirectory.mockReset();
    mockSaveImageInDirectory.mockRejectedValueOnce(new Error("copy failed"));

    await expect(hydrateBundledImagePaths(db)).rejects.toThrow("copy failed");
    expect(db.execAsync).not.toHaveBeenCalled();

    mockSaveImageInDirectory.mockResolvedValueOnce(
      "file:///documents/images/retry.png"
    );
    await expect(hydrateBundledImagePaths(db)).resolves.toMatchObject({
      updatedRows: 1,
    });
  });
});
