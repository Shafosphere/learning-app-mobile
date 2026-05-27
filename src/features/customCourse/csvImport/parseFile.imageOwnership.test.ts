import * as FileSystem from "expo-file-system/legacy";
import { saveImage } from "@/src/services/imageService";
import { analyzeRows } from "./analyzeRows";
import { parseImportFile } from "./parseFile";

jest.mock("expo-file-system/legacy", () => ({
  EncodingType: { UTF8: "utf8", Base64: "base64" },
  readAsStringAsync: jest.fn(),
}));

jest.mock("@/src/services/imageService", () => ({
  importImageFromZip: jest.fn(),
  saveImage: jest.fn(),
}));

const mockedReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const mockedSaveImage = saveImage as jest.Mock;

describe("CSV image ownership tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const parseCsvWithImage = async (imageUri: string) => {
    mockedReadAsStringAsync.mockResolvedValue(
      ["question,front_image", `Prompt,${imageUri}`].join("\n")
    );
    const parsed = await parseImportFile({
      uri: "file://import.csv",
      name: "import.csv",
      locale: "en",
    });
    return analyzeRows(parsed, { locale: "en" });
  };

  it("tracks a file newly copied while resolving a CSV image", async () => {
    mockedSaveImage.mockResolvedValue("file://documents/images/new.jpg");
    const analysis = await parseCsvWithImage("content://picker/source.jpg");

    await analysis.resolveImage("content://picker/source.jpg");

    expect(analysis.getCreatedImageUris?.()).toEqual([
      "file://documents/images/new.jpg",
    ]);
  });

  it("does not claim an already managed URI returned unchanged by saveImage", async () => {
    const existingUri = "file://documents/images/shared.jpg";
    mockedSaveImage.mockResolvedValue(existingUri);
    const analysis = await parseCsvWithImage(existingUri);

    await analysis.resolveImage(existingUri);

    expect(analysis.getCreatedImageUris?.()).toEqual([]);
  });
});
