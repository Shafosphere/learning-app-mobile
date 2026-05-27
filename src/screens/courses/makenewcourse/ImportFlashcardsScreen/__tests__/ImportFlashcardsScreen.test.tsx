import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CustomCourseContentScreen from "../ImportFlashcardsScreen";
import { usePopup } from "@/src/contexts/PopupContext";
import { mapAnalysisToManualCards } from "@/src/features/customCourse/csvImport/mapToManualCards";
import { parseImportFile } from "@/src/features/customCourse/csvImport/parseFile";
import { analyzeRows } from "@/src/features/customCourse/csvImport/analyzeRows";
import { CONTENT_DRAFT_STORAGE_KEY } from "@/src/features/customCourse/contentDraft";
import { deleteImage } from "@/src/services/imageService";
import * as DocumentPicker from "expo-document-picker";
import type { ManualCard } from "@/src/hooks/useManualCardsForm";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSetPopup = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => "/custom_course/content",
  useLocalSearchParams: () => ({
    name: "Flags",
    iconId: "flag",
    iconColor: "#123456",
    reviewsEnabled: "1",
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: "en" },
    t: (key: string) => {
      const translations: Record<string, string> = {
        "app.actions.next": "Next",
        "courseCreator.import.addModeCsv": "Import from file",
        "courseCreator.import.addModeManual": "Add manually",
        "courseCreator.import.previewTitle": "Import preview",
        "courseCreator.import.stats.flashcards": "Flashcards",
        "courseCreator.import.stats.errors": "Errors",
        "courseCreator.import.issuesToReview": "To review",
        "courseCreator.import.errorRow": "Row",
        "courseCreator.import.fileError": "File",
        "courseCreator.import.moreIssuesCompact": "More issues",
        "courseCreator.import.importFlashcards": "Import flashcards",
        "courseCreator.import.discardImport": "Discard file",
        "courseCreator.import.undoImport": "Undo import",
        "courseCreator.import.nextA11y": "Go to course settings",
        "courseCreator.import.popups.noCardsToImport": "No cards to import",
        "courseCreator.import.popups.importError": "Import error",
        "courseCreator.import.popups.confirmPendingImport": "Confirm pending import",
        "courseCreator.import.popups.addAtLeastOne": "Add at least one flashcard",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/src/contexts/PopupContext", () => ({
  usePopup: jest.fn(),
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock("@/src/features/customCourse/csvImport/parseFile", () => ({
  parseImportFile: jest.fn(),
}));

jest.mock("@/src/features/customCourse/csvImport/analyzeRows", () => ({
  analyzeRows: jest.fn(),
}));

jest.mock("@/src/features/customCourse/csvImport/mapToManualCards", () => ({
  mapAnalysisToManualCards: jest.fn(),
}));

jest.mock("@/src/services/imageService", () => ({
  deleteImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/screens/courses/makenewcourse/ImportFlashcardsScreen/ImportFlashcardsScreen-styles", () => ({
  useStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock("@/src/components/segmentedTabs/SegmentedTabs", () => {
  const React = jest.requireActual("react");
  const { Text, View } = jest.requireActual("react-native");
  return {
    SegmentedTabs: ({
      options,
      onChange,
    }: {
      options: { key: string; label: string }[];
      onChange: (key: string) => void;
    }) => (
      <View>
        {options.map((option) => (
          <Text key={option.key} onPress={() => onChange(option.key)}>
            {option.label}
          </Text>
        ))}
      </View>
    ),
  };
});

jest.mock("@/src/components/courseEditor/CsvImportGuide", () => {
  const React = jest.requireActual("react");
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    CsvImportGuide: ({
      onPickFile,
      isAnalyzing,
      selectedFileName,
    }: {
      onPickFile: () => void;
      isAnalyzing?: boolean;
      selectedFileName?: string | null;
    }) => (
      <>
        <Pressable
          accessibilityLabel={isAnalyzing ? "Analyzing" : "Choose file"}
          accessibilityState={{ disabled: Boolean(isAnalyzing) }}
          disabled={isAnalyzing}
          onPress={onPickFile}
        >
          <Text>{isAnalyzing ? "Analyzing" : "Choose file"}</Text>
        </Pressable>
        <Text testID="selected-file-name">{selectedFileName ?? ""}</Text>
      </>
    ),
  };
});

jest.mock("@/src/components/courseEditor/editFlashcards/editFlashcards", () => ({
  ManualCardsEditor: ({
    manualCards,
    onCardFrontChange,
    onCardImageChange,
    onManagedImageCreated,
  }: {
    manualCards: { id: string; front: string; imageFront?: string | null }[];
    onCardFrontChange: (id: string, value: string) => void;
    onCardImageChange: (id: string, side: "front" | "back", uri: string | null) => void;
    onManagedImageCreated?: (uri: string) => void;
  }) => {
    const React = jest.requireActual("react");
    const { Text, View } = jest.requireActual("react-native");
    const firstCard = manualCards[0];
    return (
      <View>
        <Text testID="manual-card-state">
          {firstCard?.front ?? ""}|{firstCard?.imageFront ?? ""}
        </Text>
        <Text onPress={() => onCardFrontChange(firstCard.id, "Original prompt")}>
          Set original card
        </Text>
        <Text onPress={() => onCardFrontChange(firstCard.id, "Edited prompt")}>
          Edit imported card
        </Text>
        <Text
          onPress={() => {
            onManagedImageCreated?.("file://images/manually-added.jpg");
            onCardImageChange(firstCard.id, "front", "file://images/manually-added.jpg")
          }}
        >
          Add image to imported card
        </Text>
      </View>
    );
  },
}));

jest.mock("@/src/components/courseEditor/CardTypeSelector", () => ({
  CardTypeSelector: () => null,
}));

jest.mock("@expo/vector-icons/Ionicons", () => () => null);

jest.mock("@/src/components/button/button", () => {
  const React = jest.requireActual("react");
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: ({
      text,
      onPress,
      disabled,
      accessibilityLabel,
      children,
    }: {
      text?: string;
      onPress?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
      children?: React.ReactNode;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? text}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onPress}
      >
        {children ?? <Text>{text}</Text>}
      </Pressable>
    ),
  };
});

const mockedUsePopup = usePopup as jest.Mock;
const mockedDocumentPicker = DocumentPicker.getDocumentAsync as jest.Mock;
const mockedParseImportFile = parseImportFile as jest.Mock;
const mockedAnalyzeRows = analyzeRows as jest.Mock;
const mockedMapAnalysisToManualCards = mapAnalysisToManualCards as jest.Mock;
const mockedDeleteImage = deleteImage as jest.Mock;

const analysis = {
  source: "zip",
  fileName: "flags.zip",
  totalRows: 1,
  validRows: [{ rowNumber: 2 }],
  invalidRowsCount: 0,
  issues: [],
  statsByType: { traditional: 1, true_false: 0, self_assess: 0 },
  inferredTypeCount: 0,
  missingImageCount: 0,
  resolveImage: jest.fn(),
  getCreatedImageUris: jest.fn(() => ["file://images/ae.svg"]),
};

const frontImageCard: ManualCard = {
  id: "csv-1",
  front: "",
  answers: ["United Arab Emirates"],
  flipped: false,
  type: "text",
  imageFront: "file://images/ae.svg",
  imageBack: null,
};

const partialAnalysis = {
  ...analysis,
  totalRows: 2,
  invalidRowsCount: 1,
  issues: [
    {
      row: 7,
      field: "front_text",
      severity: "error",
      code: "missing_front_text",
      message: "Question is required.",
    },
  ],
};

const beginZipSelection = (screen: ReturnType<typeof render>) => {
  fireEvent.press(screen.getByText("Import from file"));
  fireEvent.press(screen.getByText("Choose file"));
};

const selectZip = async (screen: ReturnType<typeof render>) => {
  beginZipSelection(screen);
  await waitFor(() => {
    expect(screen.getByText("Undo import")).toBeTruthy();
  });
};

describe("ImportFlashcardsScreen file import", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockedUsePopup.mockReturnValue(mockSetPopup);
    mockedDocumentPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://flags.zip", name: "flags.zip" }],
    });
    mockedParseImportFile.mockResolvedValue({ source: "zip" });
    mockedAnalyzeRows.mockReturnValue(analysis);
    mockedMapAnalysisToManualCards.mockResolvedValue([frontImageCard]);
  });

  it("automatically imports a ZIP and renders only the compact preview", async () => {
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    expect(mockedDocumentPicker).toHaveBeenCalledWith({
      type: [
        "text/csv",
        "text/plain",
        "application/zip",
        "application/x-zip-compressed",
        "*/*",
      ],
      copyToCacheDirectory: true,
    });
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Import preview")).toBeTruthy();
    expect(screen.getByText("Flashcards")).toBeTruthy();
    expect(screen.getByText("Errors")).toBeTruthy();
    expect(screen.queryByText("Import valid")).toBeNull();
    expect(screen.queryByText("Clear report")).toBeNull();
    expect(screen.queryByText("courseCreator.import.stats.rows")).toBeNull();
    expect(screen.queryByText("courseCreator.import.stats.warnings")).toBeNull();
    expect(screen.queryByText(/courseCreator\.import\.cardTypes\.text:/)).toBeNull();
  });

  it("keeps a partially invalid import pending without modifying cards", async () => {
    mockedAnalyzeRows.mockReturnValueOnce({
      ...partialAnalysis,
      validRows: [{ rowNumber: 2 }, { rowNumber: 3 }, { rowNumber: 4 }],
      issues: [
        { row: 7, field: "front_text", severity: "error", code: "missing_front_text", message: "Question is required." },
        { row: 8, field: "front_image", severity: "warning", code: "missing_image", message: "Warning one" },
        { row: 9, field: "back_image", severity: "warning", code: "missing_image", message: "Warning two" },
      ],
    });
    mockedMapAnalysisToManualCards.mockResolvedValueOnce([
      frontImageCard,
      { ...frontImageCard, id: "csv-2" },
      { ...frontImageCard, id: "csv-3" },
    ]);
    const screen = render(<CustomCourseContentScreen />);
    fireEvent.press(screen.getByText("Set original card"));
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Import flashcards")).toBeTruthy();
    });

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("To review")).toBeTruthy();
    expect(screen.getByText("Row - question")).toBeTruthy();
    expect(screen.getByText("Row - front_image")).toBeTruthy();
    expect(screen.getByText("Row - back_image")).toBeTruthy();
    expect(screen.queryByText("Question is required.")).toBeNull();
    expect(screen.queryByText("Undo import")).toBeNull();
    expect(screen.getByText("Discard file")).toBeTruthy();
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();
    expect(screen.queryByText("Warning one")).toBeNull();
    expect(screen.queryByText("Warning two")).toBeNull();
    expect(screen.queryByText("courseCreator.import.stats.warnings")).toBeNull();

    fireEvent.press(screen.getByText("Add manually"));
    expect(screen.queryByText("Import preview")).toBeNull();
    expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
      "Original prompt|"
    );
    fireEvent.press(screen.getByText("Import from file"));
    expect(screen.getByText("Import flashcards")).toBeTruthy();
  });

  it("limits error locations in a pending panel to a compact list", async () => {
    mockedAnalyzeRows.mockReturnValueOnce({
      ...partialAnalysis,
      validRows: [{ rowNumber: 2 }],
      issues: [
        { row: 3, field: "type", severity: "error", code: "invalid_type", message: "Problem 1" },
        { row: 4, field: "front_text", severity: "error", code: "missing_front_text", message: "Problem 2" },
        { row: 5, field: "tf_answer", severity: "error", code: "missing_tf_answer", message: "Problem 3" },
        { row: 6, field: "type", severity: "error", code: "invalid_type", message: "Problem 4" },
      ],
    });
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Import flashcards")).toBeTruthy();
    });

    expect(screen.getByText("Row - type")).toBeTruthy();
    expect(screen.getByText("Row - question")).toBeTruthy();
    expect(screen.getByText("Row - tf_answer")).toBeTruthy();
    expect(screen.queryByText("Problem 1")).toBeNull();
    expect(screen.queryByText("Problem 2")).toBeNull();
    expect(screen.queryByText("Problem 3")).toBeNull();
    expect(screen.queryByText("Problem 4")).toBeNull();
    expect(screen.getByText("More issues")).toBeTruthy();
  });

  it("imports a partially invalid file only after confirmation and makes it undoable", async () => {
    mockedAnalyzeRows.mockReturnValueOnce(partialAnalysis);
    const screen = render(<CustomCourseContentScreen />);
    fireEvent.press(screen.getByText("Set original card"));
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Import flashcards")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Import flashcards"));
    await waitFor(() => {
      expect(screen.getByText("Undo import")).toBeTruthy();
    });

    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
      "file://images/ae.svg"
    );

    fireEvent.press(screen.getByText("Undo import"));
    expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
      "Original prompt|"
    );
  });

  it("blocks Next while a partial import is waiting for confirmation", async () => {
    mockedAnalyzeRows.mockReturnValueOnce(partialAnalysis);
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Import flashcards")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Go to course settings"));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSetPopup).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Confirm pending import" })
    );
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();
  });

  it("allows continuing with manual cards after discarding a pending partial import", async () => {
    mockedAnalyzeRows.mockReturnValueOnce(partialAnalysis);
    const screen = render(<CustomCourseContentScreen />);
    fireEvent.press(screen.getByText("Set original card"));
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Discard file")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Discard file"));
    fireEvent.press(screen.getByText("Add manually"));
    fireEvent.press(screen.getByLabelText("Go to course settings"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();
    expect(screen.queryByText("Import flashcards")).toBeNull();
  });

  it("replaces the pending panel after choosing another partially invalid file", async () => {
    mockedAnalyzeRows.mockReturnValueOnce(partialAnalysis);
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Import flashcards")).toBeTruthy();
    });

    mockedDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://second.zip", name: "second.zip" }],
    });
    mockedAnalyzeRows.mockReturnValueOnce({
      ...partialAnalysis,
      totalRows: 4,
      validRows: [{ rowNumber: 2 }, { rowNumber: 3 }],
      invalidRowsCount: 2,
      issues: [
        { severity: "error", code: "first", message: "First error" },
        { severity: "error", code: "second", message: "Second error" },
      ],
    });
    fireEvent.press(screen.getByText("Choose file"));

    await waitFor(() => {
      expect(screen.getAllByText("2")).toHaveLength(2);
    });
    expect(screen.getByText("Import flashcards")).toBeTruthy();
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();
  });

  it("clears a pending panel if a newly selected replacement file cannot be analyzed", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockedAnalyzeRows.mockReturnValueOnce(partialAnalysis);
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Import flashcards")).toBeTruthy();
    });

    mockedDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://broken.zip", name: "broken.zip" }],
    });
    mockedParseImportFile.mockRejectedValueOnce(new Error("broken archive"));
    fireEvent.press(screen.getByText("Choose file"));

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "courseCreator.import.popups.analysisError" })
      );
    });
    expect(screen.queryByText("Import flashcards")).toBeNull();
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();
  });

  it("keeps warning-only files pending until user confirms affected locations", async () => {
    mockedAnalyzeRows.mockReturnValueOnce({
      ...analysis,
      issues: [
        {
          row: 4,
          field: "front_image",
          severity: "warning",
          code: "missing_image",
          message: "Warning only",
        },
      ],
    });
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(screen.getByText("Import flashcards")).toBeTruthy();
    });

    expect(screen.getByText("Row - front_image")).toBeTruthy();
    expect(screen.queryByText("Warning only")).toBeNull();
    expect(screen.queryByText("Undo import")).toBeNull();
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Import flashcards"));
    await waitFor(() => {
      expect(screen.getByText("Undo import")).toBeTruthy();
    });
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
  });

  it("keeps the import preview visible after returning to the file tab", async () => {
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByText("Import from file"));

    expect(screen.getByText("Import preview")).toBeTruthy();
    expect(screen.getByText("Flashcards")).toBeTruthy();
    expect(screen.getByText("Errors")).toBeTruthy();
    expect(screen.getByText("Undo import")).toBeTruthy();
  });

  it("preserves a successful import when analyzing a replacement file fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByText("Import from file"));
    mockedDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://broken.zip", name: "broken.zip" }],
    });
    mockedParseImportFile.mockRejectedValueOnce(new Error("broken archive"));
    fireEvent.press(screen.getByText("Choose file"));

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "courseCreator.import.popups.analysisError",
        })
      );
    });

    fireEvent.press(screen.getByText("Add manually"));
    expect(screen.getByText("Undo import")).toBeTruthy();
    expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
      "file://images/ae.svg"
    );
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
  });

  it("persists already imported ZIP cards on Next without remapping", async () => {
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByLabelText("Go to course settings"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
    const saved = JSON.parse(
      (await AsyncStorage.getItem(CONTENT_DRAFT_STORAGE_KEY)) ?? "{}"
    );
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
    expect(saved.addMode).toBe("manual");
    expect(saved.manualCards).toEqual([frontImageCard]);
    expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
      "file://images/ae.svg"
    );
    expect(mockSetPopup).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "Add at least one flashcard" })
    );
  });

  it("does not remap an applied import over later edits", async () => {
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByText("Edit imported card"));
    await waitFor(() => {
      expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
        "Edited prompt"
      );
    });
    fireEvent.press(screen.getByText("Import from file"));
    fireEvent.press(screen.getByLabelText("Go to course settings"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
    const saved = JSON.parse(
      (await AsyncStorage.getItem(CONTENT_DRAFT_STORAGE_KEY)) ?? "{}"
    );
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
    expect(saved.manualCards[0].front).toBe("Edited prompt");
  });

  it("undoes an import by restoring the cards that existed beforehand", async () => {
    const screen = render(<CustomCourseContentScreen />);
    fireEvent.press(screen.getByText("Set original card"));
    await selectZip(screen);

    fireEvent.press(screen.getByText("Undo import"));

    expect(screen.queryByText("Import preview")).toBeNull();
    expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
      "Original prompt|"
    );
    expect(screen.getByText("Set original card")).toBeTruthy();
    await waitFor(() => {
      expect(mockedDeleteImage).toHaveBeenCalledWith("file://images/ae.svg");
    });
  });

  it("deletes an image materialized from a CSV reference when import is undone", async () => {
    mockedAnalyzeRows.mockReturnValueOnce({ ...analysis, source: "csv" });
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByText("Undo import"));

    await waitFor(() => {
      expect(mockedDeleteImage).toHaveBeenCalledWith("file://images/ae.svg");
    });
  });

  it("does not delete an already managed CSV image when import is undone", async () => {
    mockedAnalyzeRows.mockReturnValueOnce({
      ...analysis,
      source: "csv",
      getCreatedImageUris: () => [],
    });
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByText("Undo import"));

    await waitFor(() => {
      expect(screen.queryByText("Undo import")).toBeNull();
    });
    expect(mockedDeleteImage).not.toHaveBeenCalledWith("file://images/ae.svg");
  });

  it("deletes an image manually attached to imported cards before undo", async () => {
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);
    fireEvent.press(screen.getByText("Add image to imported card"));

    fireEvent.press(screen.getByText("Undo import"));

    await waitFor(() => {
      expect(mockedDeleteImage).toHaveBeenCalledWith("file://images/ae.svg");
      expect(mockedDeleteImage).toHaveBeenCalledWith("file://images/manually-added.jpg");
    });
  });

  it("undoes post-import edits as part of the full rollback", async () => {
    const screen = render(<CustomCourseContentScreen />);
    fireEvent.press(screen.getByText("Set original card"));
    await selectZip(screen);
    fireEvent.press(screen.getByText("Edit imported card"));

    fireEvent.press(screen.getByText("Undo import"));

    const restoredCard = screen.getByTestId("manual-card-state").props.children.join("");
    expect(restoredCard).toContain("Original prompt|");
    expect(restoredCard).not.toContain("Edited prompt");
    expect(screen.queryByText("Undo import")).toBeNull();
  });

  it("undoing a replacement import restores the previous import metadata and undo state", async () => {
    const firstImportedCard = { ...frontImageCard, id: "csv-a", front: "File A" };
    const secondImportedCard = {
      ...frontImageCard,
      id: "csv-b",
      front: "File B",
      imageFront: "file://images/b.svg",
    };
    mockedAnalyzeRows
      .mockReturnValueOnce({
        ...analysis,
        getCreatedImageUris: () => ["file://images/ae.svg"],
      })
      .mockReturnValueOnce({
        ...analysis,
        getCreatedImageUris: () => ["file://images/b.svg"],
      });
    mockedMapAnalysisToManualCards
      .mockResolvedValueOnce([firstImportedCard])
      .mockResolvedValueOnce([secondImportedCard]);
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByText("Import from file"));
    mockedDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://second.zip", name: "second.zip" }],
    });
    fireEvent.press(screen.getByText("Choose file"));
    await waitFor(() => {
      expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
        "File B"
      );
    });

    fireEvent.press(screen.getByText("Undo import"));
    expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
      "File A"
    );
    expect(screen.getByText("Undo import")).toBeTruthy();
    await waitFor(() => {
      expect(mockedDeleteImage).toHaveBeenCalledWith("file://images/b.svg");
    });
    expect(mockedDeleteImage).not.toHaveBeenCalledWith("file://images/ae.svg");

    fireEvent.press(screen.getByText("Import from file"));
    expect(screen.getByTestId("selected-file-name").props.children).toBe("flags.zip");

    fireEvent.press(screen.getByText("Undo import"));
    expect(screen.queryByText("Undo import")).toBeNull();
    await waitFor(() => {
      expect(mockedDeleteImage).toHaveBeenCalledWith("file://images/ae.svg");
    });
  });

  it("rejects an imported card containing only a back image", async () => {
    mockedMapAnalysisToManualCards.mockResolvedValueOnce([
      { ...frontImageCard, answers: [""], imageFront: null, imageBack: "file://images/ae.svg" },
    ]);
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByLabelText("Go to course settings"));

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Add at least one flashcard" })
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("stays in file import when analysis cannot create cards", async () => {
    mockedMapAnalysisToManualCards.mockResolvedValueOnce([]);
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "No cards to import" })
      );
    });
    expect(screen.queryByText("Undo import")).toBeNull();
  });

  it("does not offer importing when every analyzed row has an error", async () => {
    mockedAnalyzeRows.mockReturnValueOnce({
      ...partialAnalysis,
      validRows: [],
    });
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "courseCreator.import.popups.noRows" })
      );
    });
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();
    expect(screen.queryByText("Import flashcards")).toBeNull();
    expect(screen.queryByText("Import preview")).toBeNull();
  });

  it("stays on the screen and reports an import mapping error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockedMapAnalysisToManualCards.mockRejectedValueOnce(new Error("zip failure"));
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Import error" })
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("disables Next while the selected file is analyzed and then imports it", async () => {
    let resolveParsed: (parsed: { source: string }) => void = () => {};
    mockedParseImportFile.mockImplementationOnce(
      () =>
        new Promise<{ source: string }>((resolve) => {
          resolveParsed = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Go to course settings").props.accessibilityState.disabled
      ).toBe(true);
    });

    resolveParsed({ source: "zip" });
    await waitFor(() => {
      expect(screen.getByText("Undo import")).toBeTruthy();
    });
  });

  it("blocks navigation while automatic ZIP materialization is pending", async () => {
    let resolveCards: (cards: ManualCard[]) => void = () => {};
    mockedMapAnalysisToManualCards.mockImplementationOnce(
      () =>
        new Promise<ManualCard[]>((resolve) => {
          resolveCards = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
    });
    const nextButton = screen.getByLabelText("Go to course settings");

    fireEvent.press(nextButton);
    fireEvent.press(nextButton);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);

    resolveCards([frontImageCard]);
    await waitFor(() => {
      expect(screen.getByText("Undo import")).toBeTruthy();
    });
    fireEvent.press(nextButton);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
  });

  it("blocks picking another file while automatic import is materializing", async () => {
    let resolveCards: (cards: ManualCard[]) => void = () => {};
    mockedMapAnalysisToManualCards.mockImplementationOnce(
      () =>
        new Promise<ManualCard[]>((resolve) => {
          resolveCards = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
    });
    expect(mockedDocumentPicker).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByLabelText("Analyzing").props.accessibilityState.disabled).toBe(
        true
      );
    });
    fireEvent.press(screen.getByLabelText("Analyzing"));
    expect(mockedDocumentPicker).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCards([frontImageCard]);
      await Promise.resolve();
    });
  });

  it("blocks Back during automatic import and avoids applying it after unmount", async () => {
    let resolveCards: (cards: ManualCard[]) => void = () => {};
    mockedMapAnalysisToManualCards.mockImplementationOnce(
      () =>
        new Promise<ManualCard[]>((resolve) => {
          resolveCards = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    beginZipSelection(screen);
    await waitFor(() => {
      expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
    });
    const backButton = screen.getByLabelText("courseCreator.import.backA11y");
    await waitFor(() => {
      expect(backButton.props.accessibilityState.disabled).toBe(true);
    });
    fireEvent.press(backButton);
    expect(mockBack).not.toHaveBeenCalled();

    screen.unmount();
    await act(async () => {
      resolveCards([frontImageCard]);
      await Promise.resolve();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
