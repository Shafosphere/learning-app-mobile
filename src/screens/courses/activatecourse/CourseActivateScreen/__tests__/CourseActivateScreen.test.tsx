import { StyleSheet } from "react-native";
import React from "react";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";

import { downloadPack, refreshPack } from "@/Audio/runtime/packDownloads";
import CourseActivateScreen from "@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import {
  getCompletedCustomCoursesWithCardCounts,
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";
import { getOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";

let mockDeviceLayout = { isTabletLayout: false, orientation: "portrait", width: 390 };
jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: () => mockDeviceLayout,
}));

const EMPTY_TEXT = "Nic tu nie ma :(, czas wybrać kurs!";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
const mockPopup = jest.fn();
const mockCardRender = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => mockRouter),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
}));

const mockAudioSnapshot = { name: "es_to_pl_first_50", phase: "missing", totalBytes: 223392, downloadedBytes: 0,
    errorCode: 0, nativeStatus: 8, confirmationReason: null, confirmationPending: false };
jest.mock("@/Audio/runtime/packDownloads", () => ({
  subscribePackDownloads: () => () => {}, getPackDownload: () => mockAudioSnapshot,
  refreshPack: jest.fn(async () => {}), downloadPack: jest.fn(), cancelPack: jest.fn(), confirmPackDownload: jest.fn(),
}));

jest.mock("@/src/contexts/PopupContext", () => ({
  usePopup: jest.fn(() => mockPopup),
}));

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = jest.fn();
  return {
    useSettings,
    useThemeSettings: () => {
      const settings = useSettings();
      return { ...settings, colors: { ...jest.requireActual("@/src/theme/theme").resolveThemeColors("light"), ...settings.colors }, fontScaleMultiplier: 1, accessibilityPreferences: {} };
    },
  };
});

jest.mock("react-i18next", () => {
  const t = (key: string) => {
      const translations: Record<string, string> = {
        "audioDownload.download": "Pobierz",
        "audioDownload.size": "0.22 MB",
        "screens.courses.activatecourse.courseActivate.courseActivate.textChild.nicTuNieMaCzas":
          "Nic tu nie ma :(, czas wybrać kurs!",
        "screens.courses.activatecourse.courseActivate.courseActivate.text.dodajKurs":
          "Przypnij kurs",
        "screens.courses.activatecourse.courseActivate.courseActivate.accessibilityLabel.dodajKurs":
          "Przypnij kurs",
        "screens.courses.activatecourse.courseActivate.courseActivate.text.graj":
          "Graj",
        "screens.courses.activatecourse.courseActivate.courseActivate.accessibilityLabel.graj":
          "Graj w aktywny kurs",
        "screens.courses.activatecourse.courseActivate.courseActivate.text.ukonczone":
          "completed",
        "screens.courses.activatecourse.courseActivate.courseActivate.accessibilityLabel.ukonczone":
          "Show completed courses",
      };
      return translations[key] ?? key;
  };
  return { useTranslation: () => ({ t, i18n: { language: "pl" } }) };
});

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCoursesWithCardCounts: jest.fn(),
  getOfficialCustomCoursesWithCardCounts: jest.fn(),
  getCompletedCustomCoursesWithCardCounts: jest.fn(),
}));

jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(() => ({
    isActive: false,
    currentStep: null,
    currentIndex: 0,
    totalSteps: 2,
    canGoBack: false,
    canGoNext: true,
    hasSeen: true,
    goBack: jest.fn(),
    goNext: jest.fn(),
    advanceByEvent: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({
  useCoachmarkLayerPortal: jest.fn(),
}));

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock("@/src/services/onboardingCheckpoint", () => ({
  getOnboardingCheckpoint: jest.fn(() => Promise.resolve("done")),
  setOnboardingCheckpoint: jest.fn(() => Promise.resolve()),
  subscribeOnboardingCheckpoint: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/components/course/CourseListCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  function MockCourseListCard(props: React.ComponentProps<typeof import("@/src/components/course/CourseListCard").CourseListCard>) {
    mockCardRender(props);
    return <View testID={`course-card-${props.title}`}>
      <Text onPress={props.onPress}>{props.title}</Text>
      {props.rightAccessory}
    </View>;
  }
  return {
    CourseListCard: MockCourseListCard,
  };
});

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;
const mockedGetOnboardingCheckpoint = getOnboardingCheckpoint as jest.Mock;
const mockedGetCustomCoursesWithCardCounts =
  getCustomCoursesWithCardCounts as jest.Mock;
const mockedGetOfficialCustomCoursesWithCardCounts =
  getOfficialCustomCoursesWithCardCounts as jest.Mock;
const mockedGetCompletedCustomCoursesWithCardCounts =
  getCompletedCustomCoursesWithCardCounts as jest.Mock;

describe("CourseActivateScreen loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceLayout = { isTabletLayout: false, orientation: "portrait", width: 390 };
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 2,
      canGoBack: false,
      canGoNext: true,
      hasSeen: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
    });
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      activeCustomCourseIdHydrated: true,
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([]);
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue([]);
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([]);
  });

  it("fits two course columns to the measured space between side rails and falls back on narrow windows", async () => {
    mockDeviceLayout = { isTabletLayout: false, orientation: "landscape", width: 923 };
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), activeCustomCourseId: 21, pinnedOfficialCourseIds: [21, 22] });
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue([
      { id: 21, name: "Spanish PL", slug: "es_to_pl_first_50", iconId: "flag:es", iconColor: "#000", cardsCount: 50, isOfficial: true },
      { id: 22, name: "Spanish EN", slug: "es_to_en_first_50", iconId: "flag:es", iconColor: "#000", cardsCount: 50, isOfficial: true },
    ]);
    const screen = render(<CourseActivateScreen />);
    fireEvent(screen.getByTestId("course-activate-viewport"), "layout", { nativeEvent: { layout: { width: 720, height: 333 } } });
    await screen.findByText("Spanish EN");
    expect(StyleSheet.flatten(screen.getByTestId("course-activate-content").props.style).width).toBe(688);
    expect(StyleSheet.flatten(screen.getByTestId("official-course-row-21").props.style).width).toBe(336);
    const list = within(screen.getByTestId("course-activate-scroll"));
    expect(list.queryByRole("button", { name: "Przypnij kurs" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Graj w aktywny kurs" }));
    expect(mockPush).toHaveBeenCalledWith("/flashcards");

    fireEvent(screen.getByTestId("course-activate-viewport"), "layout", { nativeEvent: { layout: { width: 480, height: 280 } } });
    expect(StyleSheet.flatten(screen.getByTestId("course-activate-content").props.style).width).toBe(448);
    expect(StyleSheet.flatten(screen.getByTestId("official-course-row-21").props.style)?.width).toBeUndefined();
    expect(screen.getByText("Spanish EN")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Przypnij kurs" }));
    expect(mockPush).toHaveBeenCalledWith("/createcourse");

    mockDeviceLayout = { isTabletLayout: false, orientation: "portrait", width: 390 };
    screen.rerender(<CourseActivateScreen />);
    expect(list.queryByRole("button", { name: "Przypnij kurs" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Graj w aktywny kurs" }));
    expect(mockPush).toHaveBeenCalledWith("/flashcards");
  });

  it("restores the portrait footer after repeated rotations with an active course", async () => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), activeCustomCourseId: 21 });
    const screen = render(<CourseActivateScreen />);
    await screen.findByText(EMPTY_TEXT);

    const getPinStyle = () => StyleSheet.flatten(
      screen.getByRole("button", { name: "Przypnij kurs" }).props.style,
    );
    const getPlayStyle = () => StyleSheet.flatten(
      screen.getByRole("button", { name: "Graj w aktywny kurs" }).props.style,
    );
    const initialPinStyle = getPinStyle();
    const initialPlayStyle = getPlayStyle();
    expect(initialPinStyle).toMatchObject({
      width: "auto", minWidth: 130, flexGrow: 0, flexShrink: 0, flexBasis: "auto",
    });
    expect(initialPlayStyle).toMatchObject({ width: 0, flexGrow: 1, flexBasis: 0 });

    for (let rotation = 0; rotation < 2; rotation++) {
      mockDeviceLayout = { isTabletLayout: false, orientation: "landscape", width: 923 };
      screen.rerender(<CourseActivateScreen />);
      fireEvent(screen.getByTestId("course-activate-viewport"), "layout", {
        nativeEvent: { layout: { width: 720, height: 333 } },
      });
      expect(getPinStyle()).toMatchObject({ width: 0, flexGrow: 1, flexShrink: 1, flexBasis: 0 });
      expect(getPlayStyle()).toMatchObject({ width: 0, flexGrow: 1, flexShrink: 1, flexBasis: 0 });

      mockDeviceLayout = { isTabletLayout: false, orientation: "portrait", width: 390 };
      screen.rerender(<CourseActivateScreen />);
      fireEvent(screen.getByTestId("course-activate-viewport"), "layout", {
        nativeEvent: { layout: { width: 390, height: 780 } },
      });
      expect(getPinStyle()).toEqual(initialPinStyle);
      expect(getPlayStyle()).toEqual(initialPlayStyle);
    }
  });

  it("keeps the fixed pin action available on an empty landscape phone", async () => {
    mockDeviceLayout = { isTabletLayout: false, orientation: "landscape", width: 923 };
    const screen = render(<CourseActivateScreen />);
    await screen.findByText(EMPTY_TEXT);
    expect(within(screen.getByTestId("course-activate-scroll")).queryByRole("button", { name: "Przypnij kurs" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Przypnij kurs" }));
    expect(mockPush).toHaveBeenCalledWith("/createcourse");
    expect(screen.queryByRole("button", { name: "Graj w aktywny kurs" })).toBeNull();
  });

  it("shows a single language panel outside course rows and downloads without activation", async () => {
    const courses = [
      { id: 21, name: "Spanish PL", slug: "es_to_pl_first_50", iconId: "flag:es", iconColor: "#000", cardsCount: 50, isOfficial: true },
      { id: 22, name: "Spanish EN", slug: "es_to_en_first_50", iconId: "flag:es", iconColor: "#000", cardsCount: 50, isOfficial: true },
      { id: 31, name: "English PL", slug: "eng_to_pl_first_50", iconId: "flag:en", iconColor: "#000", cardsCount: 50, isOfficial: true },
    ];
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), activeCustomCourseId: 31, pinnedOfficialCourseIds: [21, 22, 31] });
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue(courses);
    const screen = render(<CourseActivateScreen />);
    await waitFor(() => expect(screen.getByText("Spanish PL")).toBeTruthy());
    expect(screen.getAllByTestId("language-audio-panel-audio_es")).toHaveLength(1);
    expect(screen.getAllByTestId("language-audio-panel-audio_en")).toHaveLength(1);
    expect(within(screen.getByTestId("official-course-row-21")).queryByText("Pobierz")).toBeNull();
    expect(downloadPack).not.toHaveBeenCalled();
    fireEvent.press(within(screen.getByTestId("language-audio-panel-audio_es")).getByText("Pobierz"));
    expect(downloadPack).toHaveBeenCalledWith("audio_es");
    expect(mockedUseSettings().setActiveCustomCourseId).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows loading instead of empty state while course data is pending", () => {
    mockedGetCustomCoursesWithCardCounts.mockReturnValue(new Promise(() => {}));
    mockedGetOfficialCustomCoursesWithCardCounts.mockReturnValue(
      new Promise(() => {})
    );

    const screen = render(<CourseActivateScreen />);

    expect(screen.getByTestId("course-activate-loading")).toBeTruthy();
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
  });

  it("renders only the old and new cards across official and custom selections", async () => {
    const official = [
      { id: 21, name: "Spanish PL", slug: "es_to_pl_first_50", iconId: "flag:es", iconColor: "#000", cardsCount: 50, isOfficial: true },
      { id: 22, name: "Spanish EN", slug: "es_to_en_first_50", iconId: "flag:es", iconColor: "#000", cardsCount: 50, isOfficial: true },
      { id: 31, name: "English PL", slug: "eng_to_pl_first_50", iconId: "flag:en", iconColor: "#000", cardsCount: 50, isOfficial: true },
    ];
    const custom = [
      { id: 11, name: "Custom A", iconId: "book", iconColor: "#000", cardsCount: 12, isOfficial: false },
      { id: 12, name: "Custom B", iconId: "star", iconColor: "#111", cardsCount: 8, isOfficial: false },
    ];
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue(official);
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue(custom);
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), activeCustomCourseId: 21, pinnedOfficialCourseIds: [21, 22, 31] });
    const screen = render(<CourseActivateScreen />);
    await screen.findByText("Custom B");
    let previousName = "Spanish PL";
    let now = Date.now();
    const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
    try {
      for (const [id, name] of [[22, "Spanish EN"], [11, "Custom A"], [12, "Custom B"]] as const) {
        now += 100;
        mockCardRender.mockClear();
        await act(async () => { fireEvent.press(screen.getByText(name)); });
        expect(mockedUseSettings().setActiveCustomCourseId).toHaveBeenLastCalledWith(id);
        mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), activeCustomCourseId: id });
        // Changing unrelated coachmark fields must not invalidate every row's callback.
        mockedUseCoachmarkFlow.mockReturnValue({ ...mockedUseCoachmarkFlow(), canGoNext: false });
        screen.rerender(<CourseActivateScreen />);
        const rendered = mockCardRender.mock.calls.map(([props]) => [props.title, props.isHighlighted]);
        expect(rendered).toHaveLength(2);
        expect(rendered).toEqual(expect.arrayContaining([[previousName, false], [name, true]]));
        previousName = name;

        mockedUseSettings().setActiveCustomCourseId.mockClear();
        mockPopup.mockClear();
        await act(async () => { fireEvent.press(screen.getByText(name)); });
        expect(mockedUseSettings().setActiveCustomCourseId).not.toHaveBeenCalled();
        expect(mockPopup).not.toHaveBeenCalled();
      }
    } finally {
      clock.mockRestore();
    }
    expect(refreshPack).toHaveBeenCalledTimes(2);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("uses updated hydration, setter and coachmark callback after a parent update", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      { id: 11, name: "Custom", iconId: "book", iconColor: "#000", cardsCount: 12, isOfficial: false },
    ]);
    const originalSetter = mockedUseSettings().setActiveCustomCourseId;
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), activeCustomCourseIdHydrated: false });
    const screen = render(<CourseActivateScreen />);
    fireEvent.press(await screen.findByText("Custom"));
    expect(originalSetter).not.toHaveBeenCalled();

    const setter = jest.fn(async () => {});
    const advanceByEvent = jest.fn(async () => true);
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), activeCustomCourseIdHydrated: true, setActiveCustomCourseId: setter });
    mockedUseCoachmarkFlow.mockReturnValue({ ...mockedUseCoachmarkFlow(), advanceByEvent });
    screen.rerender(<CourseActivateScreen />);
    await act(async () => { fireEvent.press(screen.getByText("Custom")); });
    expect(setter).toHaveBeenCalledWith(11);
    expect(originalSetter).not.toHaveBeenCalled();
    expect(advanceByEvent).toHaveBeenCalledWith("activate_course");
    expect(mockPopup).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("edits a course without activation (official=%s)", async (isOfficial) => {
    const course = { id: 11, name: "Course & name", slug: "es_to_pl_first_50", iconId: "book", iconColor: "#000", cardsCount: 12, isOfficial };
    if (isOfficial) {
      mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue([course]);
      mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), pinnedOfficialCourseIds: [11] });
    } else {
      mockedGetCustomCoursesWithCardCounts.mockResolvedValue([course]);
    }
    const screen = render(<CourseActivateScreen />);
    const card = within(await screen.findByTestId("course-card-Course & name"));
    const stopPropagation = jest.fn();
    fireEvent.press(card.getByRole("button"), { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(`/editcourse?id=11&name=Course%20%26%20name${isOfficial ? "&lockAppearance=1" : ""}`);
    expect(mockedUseSettings().setActiveCustomCourseId).not.toHaveBeenCalled();
  });

  it("hides loading and shows courses when data resolves with courses", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("course-activate-loading")).toBeNull();
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
  });

  it("shows empty state only after data resolves empty", async () => {
    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("course-activate-loading")).toBeNull();
      expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
    });
  });

  it("hides completed courses from the activation list", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Visible course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        completedCardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Visible course")).toBeTruthy();
      expect(screen.queryByText("Completed course")).toBeNull();
      expect(screen.queryByText("completed")).toBeNull();
    });
  });

  it("does not show a completed courses footer button", async () => {
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        completedCardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("course-activate-loading")).toBeNull();
      expect(screen.queryByLabelText("Show completed courses")).toBeNull();
    });

    expect(mockPush).not.toHaveBeenCalledWith("/completed-courses");
  });

  it("shows play for an active course after onboarding and opens the course", async () => {
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
    });

    const screen = render(<CourseActivateScreen />);

    const playButton = await screen.findByText("Graj");
    fireEvent.press(playButton);

    expect(mockPush).toHaveBeenCalledWith("/flashcards");
  });

  it("keeps Play disabled until entry settings hydrate", async () => {
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: { paragraph: "#222", headline: "#111" },
      pinnedOfficialCourseIds: [],
      customCourseEntrySettingsSeenHydrated: false,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });

    const screen = render(<CourseActivateScreen />);
    const playButton = await screen.findByRole("button", { name: "Graj w aktywny kurs" });

    expect(playButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(playButton);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("opens required entry settings before playing an unconfigured course", async () => {
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });

    const screen = render(<CourseActivateScreen />);

    fireEvent.press(await screen.findByText("Graj"));

    expect(mockPush).toHaveBeenCalledWith("/course-entry-settings");
    expect(mockPush).not.toHaveBeenCalledWith("/flashcards");
  });

  it("keeps custom courses visible when official courses fail to load", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    mockedGetOfficialCustomCoursesWithCardCounts.mockRejectedValue(
      new Error("official load failed")
    );

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("course-activate-loading")).toBeNull();
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load official courses",
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it("blocks course activation during onboarding before the activation step is visible", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const advanceByEvent = jest.fn(() => Promise.resolve(true));
    mockedGetOnboardingCheckpoint.mockResolvedValue("activate_required");
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      activeCustomCourseIdHydrated: true,
      setActiveCustomCourseId,
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
    });
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 5,
      canGoBack: false,
      canGoNext: false,
      hasSeen: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent,
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Custom course"));

    expect(setActiveCustomCourseId).not.toHaveBeenCalled();
    expect(advanceByEvent).not.toHaveBeenCalled();
  });

  it("allows course activation on the onboarding activation step", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const advanceByEvent = jest.fn(() => Promise.resolve(true));
    mockedGetOnboardingCheckpoint.mockResolvedValue("activate_required");
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      activeCustomCourseIdHydrated: true,
      setActiveCustomCourseId,
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
    });
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      currentStep: {
        id: "course-activate-step-4",
        targetId: "course-activate-bubble-anchor",
        titleKey: "onboarding.courseActivate.step4.title",
        descriptionKey: "onboarding.courseActivate.step4.description",
        kind: "action",
        advanceOn: "activate_course",
      },
      currentIndex: 3,
      totalSteps: 5,
      canGoBack: true,
      canGoNext: false,
      hasSeen: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent,
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Custom course"));

    await waitFor(() => {
      expect(setActiveCustomCourseId).toHaveBeenCalledWith(11);
    });
    expect(advanceByEvent).toHaveBeenCalledWith("activate_course");
  });

  it("shows enabled onboarding next after restart with an active custom course", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("activate_required");
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
    });

    const screen = render(<CourseActivateScreen />);

    const nextButton = await screen.findByLabelText(
      "screens.courses.activatecourse.courseActivate.courseActivate.accessibilityLabel.przejdzDalej"
    );

    expect(nextButton.props.accessibilityState).toEqual({ disabled: false });
    expect(screen.getByText("app.actions.next")).toBeTruthy();
    expect(screen.queryByText("Graj")).toBeNull();
    fireEvent.press(nextButton);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/course-entry-settings"));
  });

  it("shows normal footer and no onboarding next after skip", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        completedCardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Przypnij kurs")).toBeTruthy();
      expect(screen.queryByLabelText("Show completed courses")).toBeNull();
    });
    expect(screen.queryByText("app.actions.next")).toBeNull();
    expect(mockedUseCoachmarkFlow).toHaveBeenCalledWith(
      expect.objectContaining({ shouldStart: false }),
    );
  });

  it("only activates a tile after skip and waits for Play before navigating", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const settings = {
      ...mockedUseSettings(),
      setActiveCustomCourseId,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
    };
    mockedUseSettings.mockReturnValue(settings);
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    const screen = render(<CourseActivateScreen />);
    fireEvent.press(await screen.findByText("Custom course"));
    await waitFor(() => {
      expect(setActiveCustomCourseId).toHaveBeenCalledWith(11);
    });

    mockedUseSettings.mockReturnValue({ ...settings, activeCustomCourseId: 11 });
    screen.rerender(<CourseActivateScreen />);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(await screen.findByText("Graj"));
    expect(mockPush).toHaveBeenCalledWith("/flashcards");
  });
  it("keeps pinned science stages together under topic headings", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    mockedUseSettings.mockReturnValue({
      ...mockedUseSettings(), pinnedOfficialCourseIds: [81, 82, 83, 84, 85, 86], setActiveCustomCourseId,
    });
    const slugs = ["grzyby_podstawowe", "pierwiastki_podstawowe", "grzyby_rozpoznawanie",
      "pierwiastki_pozostale", "drzewa_europy", "ptaki"];
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue(slugs.map((slug, index) => ({
      id: 81 + index, slug, name: `Science ${index}`, iconId: "mushroom",
      iconColor: "#000", cardsCount: 50, isOfficial: true,
    })));
    const screen = render(<CourseActivateScreen />);
    const mushrooms = await screen.findByTestId("course-topic-mushrooms");
    const elements = screen.getByTestId("course-topic-elements");
    expect(within(mushrooms).getAllByText(/^Science/).map(node => node.props.children))
      .toEqual(["Science 0", "Science 2"]);
    expect(within(elements).getAllByText(/^Science/).map(node => node.props.children))
      .toEqual(["Science 1", "Science 3"]);
    expect(screen.getAllByTestId(/^official-course-row-/)).toHaveLength(6);
    expect(screen.getByTestId("course-topic-drzewa_europy")).toBeTruthy();
    expect(screen.getByTestId("course-topic-ptaki")).toBeTruthy();
    fireEvent.press(within(mushrooms).getByText("Science 2"));
    await waitFor(() => expect(setActiveCustomCourseId).toHaveBeenCalledWith(83));
  });

  it("shows the pinned English series under its own heading and activates a stage", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    mockedUseSettings.mockReturnValue({
      ...mockedUseSettings(), pinnedOfficialCourseIds: [51, 55], setActiveCustomCourseId,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
    });
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue([
      { id: 55, name: "Ang A1", slug: "eng_to_pl_a1", iconId: "flag:en",
        iconColor: "#10B981", cardsCount: 1267, isOfficial: true },
      { id: 51, name: "Pierwsze 50 słów", slug: "eng_to_pl_first_50", iconId: "flag:en",
        iconColor: "#10B981", cardsCount: 50, isOfficial: true },
    ]);
    const screen = render(<CourseActivateScreen />);
    await screen.findByText("constants.languageCourseGroups.label.englishFromZero");
    expect(screen.getAllByText(/^(Pierwsze 50 słów|Ang A1)$/).map((node) => node.props.children))
      .toEqual(["Pierwsze 50 słów", "Ang A1"]);
    fireEvent.press(screen.getByText("Pierwsze 50 słów"));
    await waitFor(() => expect(setActiveCustomCourseId).toHaveBeenCalledWith(51));
  });

});
