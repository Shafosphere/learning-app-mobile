import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CustomCourseContentScreen from "../ImportFlashcardsScreen";
import { usePopup } from "@/src/contexts/PopupContext";
import { mapAnalysisToManualCards } from "@/src/features/customCourse/csvImport/mapToManualCards";
import { parseImportFile } from "@/src/features/customCourse/csvImport/parseFile";
import { analyzeRows } from "@/src/features/customCourse/csvImport/analyzeRows";
import { CONTENT_DRAFT_STORAGE_KEY } from "@/src/features/customCourse/contentDraft";
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
        "courseCreator.import.importValid": "Import valid",
        "courseCreator.import.importing": "Importing",
        "courseCreator.import.clearReport": "Clear report",
        "courseCreator.import.nextA11y": "Go to course settings",
        "courseCreator.import.popups.noCardsToImport": "No cards to import",
        "courseCreator.import.popups.importError": "Import error",
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
    }: {
      onPickFile: () => void;
      isAnalyzing?: boolean;
    }) => (
      <Pressable
        accessibilityLabel={isAnalyzing ? "Analyzing" : "Choose file"}
        accessibilityState={{ disabled: Boolean(isAnalyzing) }}
        disabled={isAnalyzing}
        onPress={onPickFile}
      >
        <Text>{isAnalyzing ? "Analyzing" : "Choose file"}</Text>
      </Pressable>
    ),
  };
});

jest.mock("@/src/components/courseEditor/editFlashcards/editFlashcards", () => ({
  ManualCardsEditor: ({
    manualCards,
    onCardFrontChange,
  }: {
    manualCards: { id: string; front: string; imageFront?: string | null }[];
    onCardFrontChange: (id: string, value: string) => void;
  }) => {
    const React = jest.requireActual("react");
    const { Text, View } = jest.requireActual("react-native");
    const firstCard = manualCards[0];
    return (
      <View>
        <Text testID="manual-card-state">
          {firstCard?.front ?? ""}|{firstCard?.imageFront ?? ""}
        </Text>
        <Text onPress={() => onCardFrontChange(firstCard.id, "Edited prompt")}>
          Edit imported card
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

const selectZip = async (screen: ReturnType<typeof render>) => {
  fireEvent.press(screen.getByText("Import from file"));
  fireEvent.press(screen.getByText("Choose file"));
  await waitFor(() => {
    expect(screen.getByText("Import valid")).toBeTruthy();
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

  it("accepts ZIP through the single file picker and builds its preview", async () => {
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
    expect(screen.getByText("Import preview")).toBeTruthy();
  });

  it("does not reuse an earlier preview after analyzing a replacement file fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    mockedDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://broken.zip", name: "broken.zip" }],
    });
    mockedParseImportFile.mockRejectedValueOnce(new Error("broken archive"));
    fireEvent.press(screen.getByText("Choose file"));

    await waitFor(() => {
      expect(screen.queryByText("Import valid")).toBeNull();
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "courseCreator.import.popups.analysisError",
        })
      );
    });

    fireEvent.press(screen.getByLabelText("Go to course settings"));

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Add at least one flashcard" })
      );
    });
    expect(mockedMapAnalysisToManualCards).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("imports pending ZIP cards on Next and persists the returned cards", async () => {
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

  it("does not remap applied analysis over edits after returning to the import tab", async () => {
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByText("Import valid"));
    await waitFor(() => {
      expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
      expect(
        screen.getByLabelText("Go to course settings").props.accessibilityState.disabled
      ).toBe(false);
    });
    fireEvent.press(screen.getByText("Edit imported card"));
    await waitFor(() => {
      expect(screen.getByTestId("manual-card-state").props.children.join("")).toContain(
        "Edited prompt"
      );
    });
    fireEvent.press(screen.getByText("Import from file"));
    expect(screen.queryByText("Import valid")).toBeNull();
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

  it("stays on the screen if pending analysis cannot create cards", async () => {
    mockedMapAnalysisToManualCards.mockResolvedValueOnce([]);
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByLabelText("Go to course settings"));

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "No cards to import" })
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("stays on the screen and reports an import mapping error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockedMapAnalysisToManualCards.mockRejectedValueOnce(new Error("zip failure"));
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByLabelText("Go to course settings"));

    await waitFor(() => {
      expect(mockSetPopup).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Import error" })
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("disables Next while the selected file is still being analyzed", async () => {
    let resolveParsed: (parsed: { source: string }) => void = () => {};
    mockedParseImportFile.mockImplementationOnce(
      () =>
        new Promise<{ source: string }>((resolve) => {
          resolveParsed = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    fireEvent.press(screen.getByText("Import from file"));
    fireEvent.press(screen.getByText("Choose file"));

    await waitFor(() => {
      expect(
        screen.getByLabelText("Go to course settings").props.accessibilityState.disabled
      ).toBe(true);
    });

    resolveParsed({ source: "zip" });
    await waitFor(() => {
      expect(screen.getByText("Import valid")).toBeTruthy();
    });
  });

  it("does not run pending ZIP materialization twice on rapid Next presses", async () => {
    let resolveCards: (cards: ManualCard[]) => void = () => {};
    mockedMapAnalysisToManualCards.mockImplementationOnce(
      () =>
        new Promise<ManualCard[]>((resolve) => {
          resolveCards = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);
    const nextButton = screen.getByLabelText("Go to course settings");

    fireEvent.press(nextButton);
    fireEvent.press(nextButton);
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);

    resolveCards([frontImageCard]);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
    expect(mockedMapAnalysisToManualCards).toHaveBeenCalledTimes(1);
  });

  it("blocks picking another file while Next is materializing the current import", async () => {
    let resolveCards: (cards: ManualCard[]) => void = () => {};
    mockedMapAnalysisToManualCards.mockImplementationOnce(
      () =>
        new Promise<ManualCard[]>((resolve) => {
          resolveCards = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);
    expect(mockedDocumentPicker).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Go to course settings"));
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

  it("blocks Back during Next import and does not navigate after the screen is left", async () => {
    let resolveCards: (cards: ManualCard[]) => void = () => {};
    mockedMapAnalysisToManualCards.mockImplementationOnce(
      () =>
        new Promise<ManualCard[]>((resolve) => {
          resolveCards = resolve;
        })
    );
    const screen = render(<CustomCourseContentScreen />);
    await selectZip(screen);

    fireEvent.press(screen.getByLabelText("Go to course settings"));
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
