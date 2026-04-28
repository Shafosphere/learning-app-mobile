/* eslint-disable import/first */

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

jest.mock("react-native", () => ({
  Image: {
    getSize: jest.fn(),
  },
}));

import * as FileSystem from "expo-file-system/legacy";
import { Image as RNImage } from "react-native";
import {
  __getPreloadedImageCountForTests,
  __resetFlashcardImagePreloadForTests,
  __waitForFlashcardImagePreloadForTests,
  getPreloadedImage,
  parseSvgRatio,
  preloadFlashcardImageUris,
} from "@/src/features/flashcards/flashcardImagePreload";

const mockedFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockedGetSize = RNImage.getSize as jest.Mock;

describe("flashcardImagePreload", () => {
  beforeEach(() => {
    __resetFlashcardImagePreloadForTests();
    jest.clearAllMocks();
    mockedFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
    mockedFileSystem.readAsStringAsync.mockResolvedValue(
      '<svg viewBox="0 0 160 80"></svg>'
    );
    mockedGetSize.mockImplementation(
      (_uri: string, success: (width: number, height: number) => void) => {
        success(120, 60);
      }
    );
  });

  it("dedupes duplicate preload requests", async () => {
    preloadFlashcardImageUris(["file://flag.svg", "file://flag.svg"]);

    await __waitForFlashcardImagePreloadForTests();

    expect(mockedFileSystem.readAsStringAsync).toHaveBeenCalledTimes(1);
    expect(getPreloadedImage("file://flag.svg")).toMatchObject({
      kind: "svg",
      ratio: 2,
    });
  });

  it("keeps only the latest 8 cached images", async () => {
    preloadFlashcardImageUris(
      Array.from({ length: 8 }, (_, index) => `file://flag-${index}.svg`)
    );
    await __waitForFlashcardImagePreloadForTests();

    preloadFlashcardImageUris(["file://flag-8.svg"]);

    await __waitForFlashcardImagePreloadForTests();

    expect(__getPreloadedImageCountForTests()).toBe(8);
    expect(getPreloadedImage("file://flag-0.svg")).toBeNull();
    expect(getPreloadedImage("file://flag-8.svg")).toMatchObject({
      kind: "svg",
    });
  });

  it("does not throw when a preload fails", async () => {
    mockedFileSystem.getInfoAsync.mockRejectedValueOnce(new Error("missing"));

    preloadFlashcardImageUris(["file://missing.svg"]);
    await expect(__waitForFlashcardImagePreloadForTests()).resolves.toBeUndefined();

    expect(getPreloadedImage("file://missing.svg")).toBeNull();
  });

  it("parses SVG ratio from viewBox", () => {
    expect(parseSvgRatio('<svg viewBox="0 0 300 100"></svg>')).toBe(3);
  });

  it("decodes base64 data SVGs before caching", async () => {
    const xml = '<svg viewBox="0 0 240 80"></svg>';
    const encoded = btoa(xml);

    preloadFlashcardImageUris([`data:image/svg+xml;base64,${encoded}`]);

    await __waitForFlashcardImagePreloadForTests();

    expect(getPreloadedImage(`data:image/svg+xml;base64,${encoded}`)).toMatchObject({
      kind: "svg",
      xml,
      ratio: 3,
    });
  });

  it("does not cache remote SVGs as bitmaps", async () => {
    preloadFlashcardImageUris(["https://example.com/flag.svg"]);

    await __waitForFlashcardImagePreloadForTests();

    expect(mockedGetSize).not.toHaveBeenCalled();
    expect(getPreloadedImage("https://example.com/flag.svg")).toBeNull();
  });

  it("preloads bitmap dimensions", async () => {
    preloadFlashcardImageUris(["file://photo.png"]);

    await __waitForFlashcardImagePreloadForTests();

    expect(mockedGetSize).toHaveBeenCalledWith(
      "file://photo.png",
      expect.any(Function),
      expect.any(Function)
    );
    expect(getPreloadedImage("file://photo.png")).toMatchObject({
      kind: "bitmap",
      ratio: 2,
    });
  });
});
