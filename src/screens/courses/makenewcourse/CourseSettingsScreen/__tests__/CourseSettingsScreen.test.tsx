import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CourseSettingsScreen from "../CourseSettingsScreen";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  createCustomCourse,
  getCustomCourseNameCandidates,
  replaceCustomFlashcards,
} from "@/src/db/sqlite/db";
import { CONTENT_DRAFT_STORAGE_KEY } from "@/src/features/customCourse/contentDraft";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSetPopup = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  usePathname: () => "/custom_course/settings",
  useLocalSearchParams: () => ({
    name: "Flags",
    iconId: "flag",
    iconColor: "#123456",
    reviewsEnabled: "1",
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "screens.courses.makenewcourse.courseSettings.courseSettings.text.stworz": "Create",
        "screens.courses.makenewcourse.courseSettings.courseSettings.accessibilityLabel.stworzKursZAktualnaZawartoscia":
          "Create course",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/src/contexts/PopupContext", () => ({
  usePopup: jest.fn(),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  createCustomCourse: jest.fn(),
  getCustomCourseNameCandidates: jest.fn(),
  replaceCustomFlashcards: jest.fn(),
}));

jest.mock("@/src/components/courseEditor/CourseSettingsPanel", () => ({
  CourseSettingsPanel: () => null,
}));

jest.mock("@expo/vector-icons/Ionicons", () => () => null);

jest.mock("@/src/screens/courses/makenewcourse/CourseSettingsScreen/CourseSettingsScreen-styles", () => ({
  useCourseEditStyles: () => new Proxy({}, { get: () => ({}) }),
}));

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
        disabled={disabled}
        onPress={onPress}
      >
        {children ?? <Text>{text}</Text>}
      </Pressable>
    ),
  };
});

const mockedUsePopup = usePopup as jest.Mock;
const mockedUseSettings = useSettings as jest.Mock;
const mockedCreateCustomCourse = createCustomCourse as jest.Mock;
const mockedGetCustomCourseNameCandidates =
  getCustomCourseNameCandidates as jest.Mock;
const mockedReplaceCustomFlashcards = replaceCustomFlashcards as jest.Mock;

describe("CourseSettingsScreen image-only cards", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockedUsePopup.mockReturnValue(mockSetPopup);
    mockedGetCustomCourseNameCandidates.mockResolvedValue([]);
    mockedCreateCustomCourse.mockResolvedValue(42);
    mockedReplaceCustomFlashcards.mockResolvedValue(undefined);
    mockedUseSettings.mockReturnValue({
      colors: {
        background: "#fff",
        border: "#ddd",
        my_green: "#0a0",
        headline: "#111",
      },
      getCustomCourseBoxZeroEnabled: () => false,
      setCustomCourseBoxZeroEnabled: jest.fn(),
      getCustomCourseAutoflowEnabled: () => false,
      setCustomCourseAutoflowEnabled: jest.fn(),
      getCustomCourseShowExplanationEnabled: () => false,
      setCustomCourseShowExplanationEnabled: jest.fn(),
      getCustomCourseExplanationOnlyOnWrong: () => false,
      setCustomCourseExplanationOnlyOnWrong: jest.fn(),
      getCustomCourseSkipCorrectionEnabled: () => false,
      setCustomCourseSkipCorrectionEnabled: jest.fn(),
      getCustomCourseCardSize: () => "large",
      setCustomCourseCardSize: jest.fn(),
      getCustomCourseImageSize: () => "dynamic",
      setCustomCourseImageSize: jest.fn(),
      getCustomCourseImageFrameEnabled: () => false,
      setCustomCourseImageFrameEnabled: jest.fn(),
      getCustomCourseTrueFalseButtonsVariant: () => "true_false",
      setCustomCourseTrueFalseButtonsVariant: jest.fn(),
    });
    await AsyncStorage.setItem(
      CONTENT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        scopeKey: "Flags|flag|#123456||1",
        addMode: "manual",
        newCardType: "text",
        csvFileName: "flags.zip",
        manualCards: [
          {
            id: "back-image-only",
            front: "",
            answers: [""],
            flipped: false,
            type: "text",
            imageFront: "file://images/ae.svg",
            imageBack: null,
          },
        ],
      })
    );
  });

  it("persists a flashcard whose only content is a front image", async () => {
    const screen = render(<CourseSettingsScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText("Create course")).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText("Create course"));

    await waitFor(() => {
      expect(mockedReplaceCustomFlashcards).toHaveBeenCalledWith(
        42,
        [
          expect.objectContaining({
            frontText: "",
            answers: [],
            imageFront: "file://images/ae.svg",
            imageBack: null,
          }),
        ]
      );
    });
  });

  it("rejects a draft flashcard whose only content is a back image", async () => {
    await AsyncStorage.setItem(
      CONTENT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        scopeKey: "Flags|flag|#123456||1",
        addMode: "manual",
        newCardType: "text",
        csvFileName: "flags.zip",
        manualCards: [
          {
            id: "back-image-only",
            front: "",
            answers: [""],
            flipped: false,
            type: "text",
            imageFront: null,
            imageBack: "file://images/ae.svg",
          },
        ],
      })
    );

    render(<CourseSettingsScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/custom_course/content" })
      );
    });
    expect(mockedCreateCustomCourse).not.toHaveBeenCalled();
    expect(mockedReplaceCustomFlashcards).not.toHaveBeenCalled();
  });
});
