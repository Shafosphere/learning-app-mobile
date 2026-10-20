import { completePagerSelection } from "@/src/components/settings/testing/completePagerSelection";
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
import { CONTENT_DRAFT_STORAGE_KEY, SETTINGS_DRAFT_STORAGE_KEY } from "@/src/features/customCourse/contentDraft";

const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockSetPopup = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, dismissTo: mockDismissTo }),
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

jest.mock("@/src/contexts/SettingsContext", () => { const useSettings = jest.fn(); return { useSettings, useThemeSettings: useSettings }; });

jest.mock("@/src/db/sqlite/db", () => ({
  createCustomCourse: jest.fn(),
  getCustomCourseNameCandidates: jest.fn(),
  replaceCustomFlashcards: jest.fn(),
}));

jest.mock("@/src/components/courseEditor/CourseSettingsPanel", () => ({
  CourseSettingsPanel: ({ settingsProps }: { settingsProps: {
    skipCorrectionEnabled: boolean;
    onToggleSkipCorrection: (value: boolean) => void;
    skipCorrectionLocked: boolean;
  } }) => {
    const React = jest.requireActual("react");
    const { Switch } = jest.requireActual("react-native");
    return <Switch testID="skip-correction" value={settingsProps.skipCorrectionEnabled}
      onValueChange={settingsProps.onToggleSkipCorrection} disabled={settingsProps.skipCorrectionLocked} />;
  },
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
      skipCorrectionDefaultEnabled: false,
      setCustomCourseAudioSettings: jest.fn(),
      colors: {
        background: "#fff",
        border: "#ddd",
        my_green: "#0a0",
        headline: "#111",
      },
      getCustomCourseBoxZeroAnswerSide: () => "back",
      setCustomCourseBoxZeroAnswerSide: jest.fn(),
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
      setCustomCourseFrontImageRole: jest.fn(),
      setCustomCourseLetterHintSettings: jest.fn(),
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
    expect(screen.queryByRole("tab", { name: "courseSettingsGroups.progress.title" })).toBeNull();
    for (const category of ["answers", "audio", "appearance", "learning"]) {
      fireEvent.press(screen.getByRole("tab", { name: `courseSettingsGroups.${category}.title` }));
      completePagerSelection(category);
      expect(screen.getByLabelText("Create course")).toBeEnabled();
    }
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
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/coursepanel"));
    expect(mockReplace).not.toHaveBeenCalledWith("/coursepanel");
  });

  it("creates courses with reset defaults while leaving skip correction inherited", async () => {
    const { resolveCourseSettingsDefaults } = jest.requireActual("@/src/contexts/settings/courseSettingsDefaults");
    const defaults = resolveCourseSettingsDefaults();
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    fireEvent.press(screen.getByLabelText("Create course"));
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/coursepanel"));
    const settings = mockedUseSettings();
    for (const [setter, field] of [
      ["setCustomCourseAudioSettings", "audioSettings"],
      ["setCustomCourseBoxZeroEnabled", "boxZeroEnabled"],
      ["setCustomCourseBoxZeroAnswerSide", "boxZeroAnswerSide"],
      ["setCustomCourseAutoflowEnabled", "autoflowEnabled"],
      ["setCustomCourseShowExplanationEnabled", "showExplanationEnabled"],
      ["setCustomCourseExplanationOnlyOnWrong", "explanationOnlyOnWrong"],
      ["setCustomCourseTrueFalseButtonsVariant", "trueFalseButtonsVariant"],
      ["setCustomCourseFrontImageRole", "frontImageRole"],
      ["setCustomCourseLetterHintSettings", "letterHintSettings"],
      ["setCustomCourseCardSize", "cardSize"],
      ["setCustomCourseImageSize", "imageSize"],
      ["setCustomCourseImageFrameEnabled", "imageFrameEnabled"],
    ]) {
      expect(settings[setter]).toHaveBeenCalledWith(42, defaults[field]);
    }
    expect(settings.setCustomCourseSkipCorrectionEnabled).not.toHaveBeenCalled();
  });

  it.each([false, true])("inherits global skip correction %s through draft saving and reopening", async (value) => {
    const settings = mockedUseSettings();
    settings.skipCorrectionDefaultEnabled = value;
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    expect(screen.getAllByTestId("skip-correction")[0].props.value).toBe(value);
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(SETTINGS_DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).not.toHaveProperty("skipCorrectionEnabled");
    });
    screen.unmount();

    settings.skipCorrectionDefaultEnabled = !value;
    const reopened = render(<CourseSettingsScreen />);
    await waitFor(() => expect(reopened.getByLabelText("Create course")).toBeEnabled());
    expect(reopened.getAllByTestId("skip-correction")[0].props.value).toBe(!value);

    settings.skipCorrectionDefaultEnabled = value;
    reopened.rerender(<CourseSettingsScreen />);
    expect(reopened.getAllByTestId("skip-correction")[0].props.value).toBe(value);
    fireEvent.press(reopened.getByLabelText("Create course"));
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/coursepanel"));
    expect(settings.setCustomCourseSkipCorrectionEnabled).not.toHaveBeenCalled();
  });

  it.each([false, true])("keeps an explicit skip-correction choice %s equal to global through draft reopening", async (value) => {
    const settings = mockedUseSettings();
    settings.skipCorrectionDefaultEnabled = value;
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    fireEvent(screen.getAllByTestId("skip-correction")[0], "valueChange", !value);
    fireEvent(screen.getAllByTestId("skip-correction")[0], "valueChange", value);
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(SETTINGS_DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).skipCorrectionEnabled).toBe(value);
    });
    screen.unmount();

    settings.skipCorrectionDefaultEnabled = !value;
    const reopened = render(<CourseSettingsScreen />);
    await waitFor(() => expect(reopened.getByLabelText("Create course")).toBeEnabled());
    expect(reopened.getAllByTestId("skip-correction")[0].props.value).toBe(value);
    fireEvent.press(reopened.getByLabelText("Create course"));
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/coursepanel"));
    expect(settings.setCustomCourseSkipCorrectionEnabled).toHaveBeenCalledWith(42, value);
  });

  it.each(["true_false", "know_dont_know"])("skips correction by default for a course containing only %s cards", async (type) => {
    const draft = JSON.parse((await AsyncStorage.getItem(CONTENT_DRAFT_STORAGE_KEY))!);
    draft.manualCards = [{ id: "1", front: "Question", answers: ["Answer"], flipped: false, type }];
    await AsyncStorage.setItem(CONTENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    fireEvent.press(screen.getByLabelText("Create course"));
    await waitFor(() => expect(mockedUseSettings().setCustomCourseSkipCorrectionEnabled).toHaveBeenCalledWith(42, true));
  });

  it("restores audio languages and autoplay mode from the draft and saves them for the new course", async () => {
    const audioSettings = { enabled: true, frontLanguage: "fr-FR", backLanguage: "pl-PL", autoplayMode: "off" };
    await AsyncStorage.setItem(SETTINGS_DRAFT_STORAGE_KEY, JSON.stringify({
      scopeKey: "Flags|flag|#123456||1", audioSettings,
    }));
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    fireEvent.press(screen.getByLabelText("Create course"));
    await waitFor(() => expect(mockedUseSettings().setCustomCourseAudioSettings).toHaveBeenCalledWith(42, audioSettings));
  });

  it("restores all remaining settings from draft and persists them on course creation", async () => {
    const settings = {
      boxZeroEnabled: true, boxZeroAnswerSide: "front", autoflowEnabled: false,
      reviewsEnabled: false, showExplanationEnabled: false, explanationOnlyOnWrong: false,
      skipCorrectionEnabled: true, trueFalseButtonsVariant: "know_dont_know",
      cardSize: "small", imageSize: "very_large", imageFrameEnabled: false,
    };
    await AsyncStorage.setItem(SETTINGS_DRAFT_STORAGE_KEY, JSON.stringify({
      scopeKey: "Flags|flag|#123456||1", ...settings,
    }));
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    fireEvent.press(screen.getByLabelText("Create course"));
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/coursepanel"));
    const saved = mockedUseSettings();
    expect(mockedCreateCustomCourse).toHaveBeenCalledWith(expect.objectContaining({ reviewsEnabled: false }));
    for (const [setting, value] of Object.entries(settings)) {
      if (setting === "reviewsEnabled") continue;
      const suffix = setting[0].toUpperCase() + setting.slice(1);
      expect(saved[`setCustomCourse${suffix}`]).toHaveBeenCalledWith(42, value);
    }
    expect(await AsyncStorage.getItem(SETTINGS_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("restores answer side from draft and saves it for the new course", async () => {
    await AsyncStorage.setItem(SETTINGS_DRAFT_STORAGE_KEY, JSON.stringify({
      scopeKey: "Flags|flag|#123456||1", boxZeroAnswerSide: "front", boxZeroEnabled: true,
    }));
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    fireEvent.press(screen.getByLabelText("Create course"));
    await waitFor(() => expect(mockedUseSettings().setCustomCourseBoxZeroAnswerSide).toHaveBeenCalledWith(42, "front"));
  });

  it("restores image role from draft, keeps it in the draft and saves it for the new id", async () => {
    await AsyncStorage.setItem(SETTINGS_DRAFT_STORAGE_KEY, JSON.stringify({
      scopeKey: "Flags|flag|#123456||1", frontImageRole: "replace_back",
    }));
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_DRAFT_STORAGE_KEY))!).frontImageRole).toBe("replace_back"));
    fireEvent.press(screen.getByLabelText("Create course"));
    await waitFor(() => expect(mockedUseSettings().setCustomCourseFrontImageRole).toHaveBeenCalledWith(42, "replace_back"));
  });

  it("restores letter hint personalization from draft and saves it for the new course", async () => {
    const letterHintSettings = { enabled: true, profile: "custom", boxOneLimit: 3, boxTwoLimit: 0 };
    await AsyncStorage.setItem(SETTINGS_DRAFT_STORAGE_KEY, JSON.stringify({
      scopeKey: "Flags|flag|#123456||1", letterHintSettings,
    }));
    const screen = render(<CourseSettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Create course")).toBeEnabled());
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_DRAFT_STORAGE_KEY))!).letterHintSettings).toEqual(letterHintSettings));
    fireEvent.press(screen.getByLabelText("Create course"));
    await waitFor(() => expect(mockedUseSettings().setCustomCourseLetterHintSettings).toHaveBeenCalledWith(42, letterHintSettings));
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
