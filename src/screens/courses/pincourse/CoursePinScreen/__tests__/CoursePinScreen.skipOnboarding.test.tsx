import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import CoursePinScreen from "../CoursePinScreen";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import {
  getOnboardingCheckpoint,
  markAllOnboardingCoachmarksSeen,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockPinOfficialCourse = jest.fn(() => Promise.resolve());
const mockUnpinOfficialCourse = jest.fn(() => Promise.resolve());
let mockCoachmarkActive = true;
const mockSkipFlow = jest.fn(async () => {
  mockCoachmarkActive = false;
});
let mockPinnedOfficialCourseIds: number[] = [];
let mockNativeLanguage = "pl";
type MockOfficialCourseRow = {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  slug: string | null;
  cardsCount: number;
};

let mockOfficialCourseRows: MockOfficialCourseRow[] = [
  {
    id: 1,
    name: "Test course",
    iconId: "book",
    iconColor: "#00aa66",
    slug: null,
    cardsCount: 12,
  },
];

const mockColors = {
  background: "#ffffff",
  secondBackground: "#f5f5f5",
  border: "#dddddd",
  headline: "#111111",
  paragraph: "#333333",
  font: "#111111",
  lightbg: "#ffffff",
  my_green: "#00aa66",
  my_red: "#ff3355",
  my_yellow: "#ffdd33",
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) => {
      const copy: Record<string, string> = {
        "onboarding.skip.label": "Pomiń",
        "onboarding.skip.title": "Pominąć samouczek?",
        "onboarding.skip.description": "Czy na pewno chcesz pominąć samouczek?",
        "onboarding.skip.confirm": "Pomiń",
        "onboarding.skip.cancel": "Zostań",
        "app.actions.next": "Dalej",
        "screens.courses.pincourse.coursePin.coursePin.text.zrobWlasny":
          "zrób własny",
        "screens.courses.pincourse.coursePin.coursePin.textChild.jezyki": "Języki",
        "screens.courses.pincourse.coursePin.coursePin.textChild.wiedza": "Wiedza",
        "constants.knowledgeCourseGroups.label.capitals": "Stolice",
        "constants.knowledgeCourseGroups.label.flags": "Flagi",
        "constants.knowledgeCourseGroups.label.roadSigns": "Znaki drogowe",
        "constants.knowledgeCourseGroups.description.roadSigns": "Od 80 do 165 znaków",
        "constants.knowledgeCourseGroups.description.capitals": "Stolice państw świata",
        "constants.knowledgeCourseGroups.description.flags": "Flagi państw świata",
        "repeats.format.flashcardsValue": `${options?.value ?? 0} fiszek`,
        "courses.groups.categoryA11y": `Kategoria ${options?.title}, ${options?.count} kursów`,
        "courses.progressive.infoLabel": "Informacja o kursie progresywnym",
        "courses.progressive.title": "Jak działa kurs progresywny?",
        "courses.progressive.confirm": "Rozumiem",
      };
      return copy[key] ?? key;
    },
  }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    dismissTo: mockDismissTo,
  }),
}));

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = () => ({
    colors: mockColors,
    highContrastEnabled: false,
    nativeLanguage: mockNativeLanguage,
    pinnedOfficialCourseIds: mockPinnedOfficialCourseIds,
    pinOfficialCourse: mockPinOfficialCourse,
    unpinOfficialCourse: mockUnpinOfficialCourse,
  });
  return { useSettings, useThemeSettings: useSettings };
});

jest.mock("@/src/db/sqlite/db", () => ({
  getOfficialCustomCoursesWithCardCounts: jest.fn(() =>
    Promise.resolve(mockOfficialCourseRows),
  ),
}));

jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(() => ({
    isActive: mockCoachmarkActive,
    isPendingStart: false,
    hasSeen: false,
    isReady: true,
    currentStep: {
      id: "course-pin-step-1",
      targetId: "course-pin-bubble-anchor",
      titleKey: "onboarding.coursePin.step1.title",
      descriptionKey: "onboarding.coursePin.step1.description",
      kind: "info",
      advanceOn: "manual",
    },
    currentIndex: 0,
    totalSteps: 1,
    canGoBack: false,
    canGoNext: true,
    goBack: jest.fn(),
    goNext: jest.fn(),
    advanceByEvent: jest.fn(() => Promise.resolve(true)),
    skipFlow: mockSkipFlow,
  })),
}));

jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({
  useCoachmarkLayerPortal: jest.fn(),
}));

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children?: ReactNode }) => {
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <View>{children}</View>;
  },
}));

jest.mock("@/src/components/course/CourseListCard", () => ({
  CourseListCard: ({
    title,
    rightAccessory,
  }: {
    title: string;
    rightAccessory?: ReactNode;
  }) => {
    const { Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return (
      <View>
        <Text>{title}</Text>
        {rightAccessory}
      </View>
    );
  },
}));

jest.mock("@/src/services/onboardingCheckpoint", () => ({
  getOnboardingCheckpoint: jest.fn(() => Promise.resolve("pin_required")),
  markAllOnboardingCoachmarksSeen: jest.fn(() => Promise.resolve()),
  setOnboardingCheckpoint: jest.fn(() => Promise.resolve()),
}));

const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;
const mockedUseCoachmarkLayerPortal = useCoachmarkLayerPortal as jest.Mock;
const mockedGetOnboardingCheckpoint = getOnboardingCheckpoint as jest.Mock;
const mockedMarkAllOnboardingCoachmarksSeen =
  markAllOnboardingCoachmarksSeen as jest.Mock;
const mockedSetOnboardingCheckpoint = setOnboardingCheckpoint as jest.Mock;

function getLatestCoachmarkLayer() {
  return mockedUseCoachmarkLayerPortal.mock.calls.at(-1)?.[1];
}

describe("CoursePinScreen skip onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCoachmarkActive = true;
    mockPinnedOfficialCourseIds = [];
    mockNativeLanguage = "pl";
    mockOfficialCourseRows = [
      {
        id: 1,
        name: "Test course",
        iconId: "book",
        iconColor: "#00aa66",
        slug: null,
        cardsCount: 12,
      },
    ];
    mockedGetOnboardingCheckpoint.mockResolvedValue("pin_required");
  });

  it("shows skip on the first onboarding step and cancels without completing", async () => {
    render(<CoursePinScreen />);

    let layer: ReturnType<typeof getLatestCoachmarkLayer>;
    await waitFor(() => {
      layer = getLatestCoachmarkLayer();
      expect(layer?.showSkipButton).toBe(true);
      expect(layer?.skipLabel).toBe("Pomiń");
      expect(layer?.onSkipPress).toEqual(expect.any(Function));
    });

    act(() => {
      layer!.onSkipPress();
    });
    await waitFor(() => {
      expect(screen.getByText("Pominąć samouczek?")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Zostań"));

    await waitFor(() => {
      expect(screen.queryByText("Pominąć samouczek?")).toBeNull();
    });
    expect(mockSkipFlow).not.toHaveBeenCalled();
    expect(mockedSetOnboardingCheckpoint).not.toHaveBeenCalledWith("done");
  });

  it("confirms skip, closes the flow, and marks onboarding done", async () => {
    render(<CoursePinScreen />);

    let layer: ReturnType<typeof getLatestCoachmarkLayer>;
    await waitFor(() => {
      layer = getLatestCoachmarkLayer();
      expect(layer?.showSkipButton).toBe(true);
    });

    act(() => {
      layer!.onSkipPress();
    });
    await waitFor(() => {
      expect(screen.getByText("Pominąć samouczek?")).toBeTruthy();
    });
    fireEvent.press(screen.getAllByText("Pomiń").at(-1)!);

    await waitFor(() => {
      expect(mockSkipFlow).toHaveBeenCalledTimes(1);
    });
    expect(mockedMarkAllOnboardingCoachmarksSeen).toHaveBeenCalledTimes(1);
    expect(mockedSetOnboardingCheckpoint).toHaveBeenCalledWith("done");
    await waitFor(() => {
      expect(screen.queryByText("Pominąć samouczek?")).toBeNull();
      expect(screen.queryByText("Dalej")).toBeNull();
      expect(screen.getByText("zrób własny")).toBeTruthy();
      expect(getLatestCoachmarkLayer()).toBeNull();
    });
  });

  it("does not show skip after the first onboarding step", async () => {
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "course-pin-step-2",
        targetId: "course-pin-bubble-anchor",
        titleKey: "onboarding.coursePin.step2.title",
        descriptionKey: "onboarding.coursePin.step2.description",
        kind: "info",
        advanceOn: "manual",
      },
      currentIndex: 1,
      totalSteps: 2,
      canGoBack: true,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
      skipFlow: mockSkipFlow,
    });

    render(<CoursePinScreen />);

    await waitFor(() => {
      expect(getLatestCoachmarkLayer()?.showSkipButton).toBe(false);
    });
  });

  it("switches to the knowledge tab after the categories onboarding step", async () => {
    const mockGoNext = jest.fn(() => Promise.resolve());
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "course-pin-step-6",
        targetId: "course-pin-tab-switcher",
        titleKey: "onboarding.coursePin.step6.title",
        descriptionKey: "onboarding.coursePin.step6.description",
        kind: "info",
        advanceOn: "manual",
      },
      currentIndex: 5,
      totalSteps: 9,
      canGoBack: true,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: mockGoNext,
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
      skipFlow: mockSkipFlow,
    });

    render(<CoursePinScreen />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Języki" })).toHaveAccessibilityState({
        selected: true,
      });
    });

    const layer = getLatestCoachmarkLayer();
    await act(async () => {
      await layer!.onNext();
    });

    expect(mockGoNext).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Wiedza" })).toHaveAccessibilityState({
        selected: true,
      });
    });
  });

  it("keeps language tab selected for first-card onboarding targets", async () => {
    mockPinnedOfficialCourseIds = [1];
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "course-pin-step-3",
        targetId: "course-pin-first-card",
        titleKey: "onboarding.coursePin.step3.title",
        descriptionKey: "onboarding.coursePin.step3.description",
        kind: "info",
        advanceOn: "manual",
      },
      currentIndex: 2,
      totalSteps: 9,
      canGoBack: true,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
      skipFlow: mockSkipFlow,
    });

    render(<CoursePinScreen />);
    fireEvent.press(screen.getByText("Wiedza"));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Języki" })).toHaveAccessibilityState({
        selected: true,
      });
    });
  });

  it("groups only capitals and flags in the knowledge tab", async () => {
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      isPendingStart: false,
      hasSeen: true,
      isReady: true,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
      skipFlow: mockSkipFlow,
    });
    mockOfficialCourseRows = [
      {
        id: 11,
        name: "Stolice Europy",
        iconId: "city",
        iconColor: "#2563EB",
        slug: "panstwa_i_stolice_europy",
        cardsCount: 44,
      },
      {
        id: 12,
        name: "Flagi Europy",
        iconId: "flag",
        iconColor: "#2563EB",
        slug: "flagi_europy",
        cardsCount: 44,
      },
      {
        id: 13,
        name: "Astronomia",
        iconId: "planet",
        iconColor: "#8B5CF6",
        slug: "astronomia",
        cardsCount: 30,
      },
      {
        id: 14,
        name: "Ang A1",
        iconId: "flag:en",
        iconColor: "#10B981",
        slug: "eng_to_pl_a1",
        cardsCount: 100,
      },
    ];

    render(<CoursePinScreen />);
    fireEvent.press(screen.getByRole("tab", { name: "Wiedza" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Kategoria Stolice, 1 kursów")).toBeTruthy();
      expect(screen.getByLabelText("Kategoria Flagi, 1 kursów")).toBeTruthy();
      expect(screen.getByText("Astronomia")).toBeTruthy();
    });
    expect(screen.queryByText("Stolice Europy")).toBeNull();
    expect(screen.queryByText("Flagi Europy")).toBeNull();
    expect(screen.queryByText("Ang A1")).toBeNull();

    fireEvent.press(screen.getByLabelText("Kategoria Stolice, 1 kursów"));
    expect(screen.getByText("Stolice Europy")).toBeTruthy();
    expect(screen.queryByText("Flagi Europy")).toBeNull();
  });
  const series = [
    { id: 51, name: "Pierwsze 50 słów", slug: "eng_to_pl_first_50", cardsCount: 50 },
    { id: 52, name: "100 słów", slug: "eng_to_pl_first_100", cardsCount: 100 },
    { id: 53, name: "250 słów", slug: "eng_to_pl_first_250", cardsCount: 250 },
    { id: 54, name: "500 słów", slug: "eng_to_pl_first_500", cardsCount: 500 },
    { id: 55, name: "Ang A1", slug: "eng_to_pl_a1", cardsCount: 1267 },
    { id: 56, name: "Ang A2", slug: "eng_to_pl_a2", cardsCount: 1230 },
    { id: 57, name: "Ang B1", slug: "eng_to_pl_b1", cardsCount: 2020 },
    { id: 58, name: "Ang B2", slug: "eng_to_pl_b2", cardsCount: 1736 },
  ];

  it("keeps the ordered English series in Languages and outside Knowledge", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    mockOfficialCourseRows = [...series].reverse().map((row) => ({
      ...row, iconId: "flag:en", iconColor: "#10B981",
    }));
    render(<CoursePinScreen />);
    const label = "Kategoria constants.languageCourseGroups.label.englishFromZero, 5 kursów";
    await waitFor(() => expect(screen.getByLabelText(label)).toBeTruthy());
    expect(screen.queryByText("Pierwsze 50 słów")).toBeNull();
    expect(screen.getByText("Ang A2")).toBeTruthy();
    expect(screen.getByText("Ang B1")).toBeTruthy();
    expect(screen.getByText("Ang B2")).toBeTruthy();
    // Language labels appear in the section separator and the accordion icon.
    expect(screen.getAllByText("PL")).toHaveLength(2);
    expect(screen.getAllByText("EN")).toHaveLength(2);
    expect(screen.getAllByText("/")).toHaveLength(1);
    fireEvent.press(screen.getByLabelText(label));
    expect(screen.getAllByText(/^(Pierwsze 50 słów|100 słów|250 słów|500 słów|Ang A1|Ang A2|Ang B1|Ang B2)$/).map((node) => node.props.children))
      .toEqual(series.map((row) => row.name));
    fireEvent.press(screen.getByRole("tab", { name: "Wiedza" }));
    expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.queryByText("Pierwsze 50 słów")).toBeNull();
  });

  it("groups English-target French and Spanish stages separately from pinned Polish stages", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    mockNativeLanguage = "en";
    mockPinnedOfficialCourseIds = [90];
    mockOfficialCourseRows = [
      { id: 61, name: "French first 50", slug: "fr_to_en_first_50", cardsCount: 50, iconId: "flag:fr", iconColor: "#2563EB" },
      { id: 62, name: "French 150", slug: "fr_to_en_first_150", cardsCount: 150, iconId: "flag:fr", iconColor: "#2563EB" },
      { id: 63, name: "French 332", slug: "fr_to_en_first_332", cardsCount: 332, iconId: "flag:fr", iconColor: "#2563EB" },
      { id: 64, name: "French A1", slug: "french_a1", cardsCount: 865, iconId: "flag:fr", iconColor: "#2563EB" },
      { id: 71, name: "Spanish first 50", slug: "es_to_en_first_50", cardsCount: 50, iconId: "flag:es", iconColor: "#F97316" },
      { id: 72, name: "Spanish 150", slug: "es_to_en_first_150", cardsCount: 150, iconId: "flag:es", iconColor: "#F97316" },
      { id: 73, name: "Spanish 327", slug: "es_to_en_first_327", cardsCount: 327, iconId: "flag:es", iconColor: "#F97316" },
      { id: 90, name: "Polish French starter", slug: "fr_to_pl_first_50", cardsCount: 50, iconId: "flag:fr", iconColor: "#2563EB" },
    ].reverse();
    render(<CoursePinScreen />);
    const french = "Kategoria constants.languageCourseGroups.label.frenchFromZero, 4 kursów";
    const spanish = "Kategoria constants.languageCourseGroups.label.spanishFromZero, 3 kursów";
    const polish = "Kategoria constants.languageCourseGroups.label.frenchFromZero, 1 kursów";
    await waitFor(() => {
      expect(screen.getByLabelText(french)).toBeTruthy();
      expect(screen.getByLabelText(spanish)).toBeTruthy();
      expect(screen.getByLabelText(polish)).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText(french));
    fireEvent.press(screen.getByLabelText(spanish));
    expect(screen.getAllByText(/^French (first 50|150|332|A1)$/).map((node) => node.props.children))
      .toEqual(["French first 50", "French 150", "French 332", "French A1"]);
    expect(screen.getAllByText(/^Spanish (first 50|150|327)$/).map((node) => node.props.children))
      .toEqual(["Spanish first 50", "Spanish 150", "Spanish 327"]);
    expect(screen.queryByText("Polish French starter")).toBeNull();
    fireEvent.press(screen.getByRole("tab", { name: "Wiedza" }));
    expect(screen.queryByLabelText(french)).toBeNull();
    expect(screen.queryByLabelText(spanish)).toBeNull();
  });

  it("reveals the first series card before onboarding starts", async () => {
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false, isPendingStart: true, hasSeen: false, isReady: true,
      currentStep: null, currentIndex: 0, totalSteps: 9,
      canGoBack: false, canGoNext: false, goBack: jest.fn(), goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)), skipFlow: mockSkipFlow,
    });
    mockOfficialCourseRows = series.map((row) => ({
      ...row, iconId: "flag:en", iconColor: "#10B981",
    }));
    render(<CoursePinScreen />);
    await waitFor(() => expect(screen.getByText("Pierwsze 50 słów")).toBeTruthy());
  });

  it("shows info for progressive language series and leaves pins unchanged", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    mockOfficialCourseRows = [
      { id: 51, name: "Angielski 50", slug: "eng_to_pl_first_50", cardsCount: 50, iconId: "flag:en", iconColor: "#10B981" },
      { id: 61, name: "Francuski 50", slug: "fr_to_pl_first_50", cardsCount: 50, iconId: "flag:fr", iconColor: "#2563EB" },
      { id: 71, name: "Hiszpański 50", slug: "es_to_pl_first_50", cardsCount: 50, iconId: "flag:es", iconColor: "#F97316" },
      { id: 81, name: "Flagi Europy", slug: "flagi_europy", cardsCount: 52, iconId: "flag", iconColor: "#10B981" },
    ];
    render(<CoursePinScreen />);
    await waitFor(() => expect(screen.getAllByLabelText("Informacja o kursie progresywnym")).toHaveLength(3));
    fireEvent.press(screen.getAllByLabelText("Informacja o kursie progresywnym")[0]);
    expect(screen.getByText("Jak działa kurs progresywny?")).toBeTruthy();
    fireEvent.press(screen.getByText("Rozumiem"));
    expect(mockPinOfficialCourse).not.toHaveBeenCalled();
    expect(mockUnpinOfficialCourse).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("tab", { name: "Wiedza" }));
    expect(screen.getByLabelText("Kategoria Flagi, 1 kursów")).toBeTruthy();
    expect(screen.queryByLabelText("Informacja o kursie progresywnym")).toBeNull();
  });

  it("shows road signs as ordered progressive stages in Knowledge and keeps pins unchanged", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    const stages = [
      { id: 91, name: "Podstawowe znaki", slug: "znaki_drogowe_najwazniejsze", cardsCount: 80 },
      { id: 92, name: "Rozszerzone znaki", slug: "znaki_drogowe_rozszerzone", cardsCount: 132 },
      { id: 93, name: "Wszystkie znaki", slug: "znaki_drogowe", cardsCount: 165 },
    ];
    mockOfficialCourseRows = stages.slice().reverse().map((row) => ({
      ...row, iconId: "car", iconColor: "#DC2626",
    }));
    render(<CoursePinScreen />);
    expect(screen.queryByLabelText("Kategoria Znaki drogowe, 3 kursów")).toBeNull();
    fireEvent.press(screen.getByRole("tab", { name: "Wiedza" }));
    const header = await screen.findByLabelText("Kategoria Znaki drogowe, 3 kursów");
    expect(screen.getByText("Od 80 do 165 znaków")).toBeTruthy();
    expect(header.props.accessibilityState.expanded).toBe(false);
    fireEvent.press(screen.getByLabelText("Informacja o kursie progresywnym"));
    expect(screen.getByText("courses.progressive.roadSignsDescription")).toBeTruthy();
    expect(screen.queryByText("courses.progressive.description")).toBeNull();
    fireEvent.press(screen.getByText("Rozumiem"));
    expect(header.props.accessibilityState.expanded).toBe(false);
    fireEvent.press(header);
    expect(screen.getAllByText(/^(Podstawowe|Rozszerzone|Wszystkie) znaki$/).map((node) => node.props.children))
      .toEqual(stages.map((row) => row.name));
    expect(mockPinOfficialCourse).not.toHaveBeenCalled();
    expect(mockUnpinOfficialCourse).not.toHaveBeenCalled();
  });

  it.each([true, false])("returns to activation during onboarding (coachmark active: %s)", async (isActive) => {
    mockPinnedOfficialCourseIds = [1];
    const advanceByEvent = jest.fn(() => Promise.resolve(true));
    mockedUseCoachmarkFlow.mockReturnValue({ ...mockedUseCoachmarkFlow(), isActive, advanceByEvent });
    render(<CoursePinScreen />);
    const next = await screen.findByText("Dalej");
    fireEvent.press(next);
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/coursepanel"));
    expect(mockedSetOnboardingCheckpoint).toHaveBeenCalledWith("activate_required");
    expect(advanceByEvent).toHaveBeenCalledTimes(isActive ? 1 : 0);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("returns to activation outside onboarding and keeps custom creation as a push", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    mockedUseCoachmarkFlow.mockReturnValue({ ...mockedUseCoachmarkFlow(), isActive: false });
    render(<CoursePinScreen />);
    fireEvent.press(await screen.findByText("components.logoMessage.logoMessage.title.aktywujKurs"));
    expect(mockDismissTo).toHaveBeenCalledWith("/coursepanel");
    expect(mockPush).not.toHaveBeenCalledWith("/coursepanel");
    fireEvent.press(screen.getByText("zrób własny"));
    expect(mockPush).toHaveBeenCalledWith("/custom_course");
  });

});
