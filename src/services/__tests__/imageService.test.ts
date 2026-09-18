import * as FileSystem from "expo-file-system/legacy";
import {
  prepareImagesDirectory,
  saveImageInDirectory,
} from "@/src/services/imageService";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///documents/",
  cacheDirectory: null,
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("managed image saving", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 1024,
    });
  });

  it("prepares image directory once and gives repeated sources separate files", async () => {
    const directory = await prepareImagesDirectory();
    const [first, second] = await Promise.all([
      saveImageInDirectory("file:///assets/flag.png", directory, "png"),
      saveImageInDirectory("file:///assets/flag.png", directory, "png"),
    ]);

    expect(directory).toBe("file:///documents/images/");
    expect(first).not.toBe(second);
    expect(first).toMatch(/\.png$/);
    expect(second).toMatch(/\.png$/);
    expect(FileSystem.copyAsync).toHaveBeenCalledTimes(2);
  });
});
