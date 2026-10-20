import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import { Keyboard, Text, type KeyboardEvent } from "react-native";
import { usePathname } from "expo-router";
import { useNavbarCompactLayoutSetter } from "@/src/contexts/NavbarLayoutContext";

import Navbar from "@/src/components/navbar/navbar";
import { useSettings, useThemeSettings } from "@/src/contexts/SettingsContext";
import { getCustomCourseById, type CustomCourseRecord } from "@/src/db/sqlite/db";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { Image } from "expo-image";
import { ReduceMotion, withTiming } from "react-native-reanimated";
import { useNavbarStats } from "@/src/contexts/NavbarStatsContext";

const mockDismissTo = jest.fn();
const mockPush = jest.fn();
const mockOpenCoursePanel = jest.fn();
const mockTriggerQuote = jest.fn();
const mockRefreshDueReviews = jest.fn(() => Promise.resolve());
const mockSetPopupAnchor = jest.fn();
const mockStaticIconRender = jest.fn();
const mockStatsRender = jest.fn();
const mockContentRender = jest.fn();
const mockRouter = { dismissTo: mockDismissTo, push: mockPush };
const mockPathContext = React.createContext("/review/reviewflashcards");
const mockQuoteContext = React.createContext({ triggerQuote: mockTriggerQuote });
const mockDueReviewsContext = React.createContext({ dueReviewCount: 3, refreshDueReviewCount: mockRefreshDueReviews });

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
  withTiming: jest.fn((value) => value),
}));

jest.mock("@/src/hooks/useOpenCoursePanel", () => ({
  useOpenCoursePanel: () => mockOpenCoursePanel,
}));

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    usePathname: jest.fn(() => React.useContext(mockPathContext)),
    useRouter: jest.fn(() => mockRouter),
  };
});

jest.mock("expo-navigation-bar", () => ({
  setButtonStyleAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-image", () => {
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  function MockImage(props: Record<string, unknown>) {
    return <View {...props} />;
  }

  return {
    Image: MockImage,
  };
});

jest.mock("@expo/vector-icons/FontAwesome5", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  function MockFontAwesome5(props: { name: string }) {
    return <Text>{props.name}</Text>;
  }

  return MockFontAwesome5;
});

jest.mock("@expo/vector-icons/Foundation", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  function MockFoundation(props: { name: string }) {
    return <Text>{props.name}</Text>;
  }

  return MockFoundation;
});

jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  function MockIonicons(props: { name: string }) {
    return <Text>{props.name}</Text>;
  }

  return MockIonicons;
});

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  function MockMaterialIcons(props: { name: string }) {
    mockStaticIconRender(props);
    return <Text>{props.name}</Text>;
  }

  return MockMaterialIcons;
});

jest.mock("@edwardloopez/react-native-coachmark", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    CoachmarkAnchor: ({ children, id }: { children: React.ReactNode; id: string }) => (
      <View testID={"coachmark-" + id}>{children}</View>
    ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: { language: "en" },
  }),
}));

jest.mock("@/src/components/navbar/NavbarStatsRotator", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  return function NavbarStatsRotatorMock({ onPress }: { onPress: () => void }) {
    mockStatsRender();
    return (
      <Pressable onPress={onPress}>
        <Text>stats</Text>
      </Pressable>
    );
  };
});

jest.mock("@/src/components/navbar/NavbarMascot", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return function NavbarMascotMock() { return <View testID="navbar-mascot" />; };
});

jest.mock("@/src/components/course/CourseTitleMarquee", () => ({
  CourseTitleMarquee: function CourseTitleMarqueeMock({
    text,
  }: {
    text: string;
  }) {
    const { Text } = jest.requireActual<typeof import("react-native")>(
      "react-native"
    );

    return <Text>{text}</Text>;
  },
}));

jest.mock("@/src/constants/customCourse", () => ({
  resolveCourseIconProps: jest.fn(() => ({})),
}));

jest.mock("@/src/constants/languageFlags", () => ({
  getFlagSource: jest.fn(() => undefined),
}));

jest.mock("@/src/constants/officialPacks", () => ({
  OFFICIAL_PACKS: [{ slug: "official-en", smallFlag: "en", sourceLang: "de" }],
}));

jest.mock("@/src/contexts/DueReviewsContext", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    useDueReviews: jest.fn(() => React.useContext(mockDueReviewsContext)),
  };
});

jest.mock("@/src/contexts/PopupContext", () => ({
  usePopupAnchorSetter: jest.fn(() => mockSetPopupAnchor),
  useActivePopup: jest.fn(() => null),
}));

jest.mock("@/src/contexts/QuoteContext", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    useQuote: jest.fn(() => React.useContext(mockQuoteContext)),
  };
});

// Real React context propagation is essential: memo does not block context updates.
jest.mock("@/src/contexts/SettingsContext", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    useSettings: jest.fn(() => React.useContext(mockSettingsContext)),
    useThemeSettings: jest.fn(() => React.useContext(mockThemeContext)),
  };
});

const mockBaseSettings = {
  theme: "light",
  fontScaleMultiplier: 1,
  toggleTheme: jest.fn(),
  activeCustomCourseId: null,
  activeCustomCourseIdHydrated: true,
  customCourseEntrySettingsSeenHydrated: true,
  hasSeenCustomCourseEntrySettings: jest.fn(() => true),
  selectedLevel: null,
  activeCourse: null,
  colors: {
    background: "#fff",
    secondBackground: "#f8fafc",
    headline: "#111827",
    lightbg: "#fff",
    darkbg: "#111827",
    my_red: "#ef4444",
    my_green: "#22c55e",
    my_yellow: "#eab308",
    border: "#e5e7eb",
  },
  pinnedOfficialCourseIds: [],
  setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
} as unknown as ReturnType<typeof useSettings>;
const mockSettingsContext = React.createContext(mockBaseSettings);
const mockThemeContext = React.createContext(mockBaseSettings as ReturnType<typeof useThemeSettings>);

jest.mock("@/src/contexts/NavbarStatsContext", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    useNavbarStats: jest.fn(() => React.useContext(mockNavbarStatsContext)),
  };
});
const mockStatsValue = {
  stats: { masteredCount: 4, streakDays: 2, promotionsCount: 3, shieldCount: 0 as const },
  activeStatKey: "mastered" as const,
  currentBurst: null,
  acknowledgeCurrentBurst: jest.fn(),
};
const mockNavbarStatsContext = React.createContext(mockStatsValue as unknown as ReturnType<typeof useNavbarStats>);

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCourseById: jest.fn(() => Promise.resolve(null)),
}));

function setupNavbar(overrides: Partial<ReturnType<typeof useSettings>> = {}, initialPath = "/coursepanel") {
  let settings = { ...mockBaseSettings, ...overrides };
  let pathname = initialPath;
  let theme = mockBaseSettings as ReturnType<typeof useThemeSettings>;
  let dueReviews = { dueReviewCount: 3, refreshDueReviewCount: mockRefreshDueReviews };
  let quote = { triggerQuote: mockTriggerQuote };
  function ContentProbe() { mockContentRender(); return <Text>screen content</Text>; }
  const navbar = <Navbar><ContentProbe /></Navbar>;
  const tree = () => (
    <mockSettingsContext.Provider value={settings}>
      <mockThemeContext.Provider value={theme}>
        <mockPathContext.Provider value={pathname}>
          <mockDueReviewsContext.Provider value={dueReviews}>
            <mockQuoteContext.Provider value={quote}>{navbar}</mockQuoteContext.Provider>
          </mockDueReviewsContext.Provider>
        </mockPathContext.Provider>
      </mockThemeContext.Provider>
    </mockSettingsContext.Provider>
  );
  const screen = render(tree());
  if (screen.queryByTestId("coachmark-flashcards-review-button")) {
    const positions = [0, 72, 144, 224, 296];
    act(() => {
      screen.getAllByRole("button").slice(-5).forEach((button, index) => {
        fireEvent(button, "layout", { nativeEvent: { layout: {
          x: positions[index], y: index === 2 ? 0 : 2,
          width: index === 2 ? 76 : 68, height: index === 2 ? 48 : 44,
        } } });
      });
    });
  }
  return {
    screen,
    updateSettings(patch: Partial<typeof settings>) { settings = { ...settings, ...patch }; screen.rerender(tree()); },
    navigate(path: string) { pathname = path; screen.rerender(tree()); },
    updateTheme(patch: Partial<typeof theme>) { theme = { ...theme, ...patch }; screen.rerender(tree()); },
    updateProviders(count = dueReviews.dueReviewCount) {
      dueReviews = { ...dueReviews, dueReviewCount: count };
      quote = { ...quote };
      screen.rerender(tree());
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function course(id: number, name: string, patch: Partial<CustomCourseRecord> = {}): CustomCourseRecord {
  return { id, name, iconId: "heart", iconColor: "#123456", colorId: null,
    reviewsEnabled: false, createdAt: 0, updatedAt: 0, isOfficial: false, slug: null,
    packVersion: 1, ...patch };
}

describe("Navbar review routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockImplementation(() => React.useContext(mockPathContext));
    (useSettings as jest.Mock).mockImplementation(() => React.useContext(mockSettingsContext));
    (getCustomCourseById as jest.Mock).mockReset().mockResolvedValue(null);
    (resolveCourseIconProps as jest.Mock).mockReset().mockReturnValue({});
    (getFlagSource as jest.Mock).mockReset().mockReturnValue(undefined);
  });

  it("uses the shared panel navigation from the course button and the empty gamepad", () => {
    const screen = render(<Navbar />);
    fireEvent.press(within(screen.getByTestId("coachmark-flashcards-course-button")).getByRole("button"));
    fireEvent.press(screen.getByLabelText("components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek"));
    expect(mockOpenCoursePanel).toHaveBeenCalledTimes(2);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("collapses only compact flashcards during keyboard entry and restores on hide or navigation", () => {
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    const originalSubscribe = Keyboard.addListener.bind(Keyboard);
    const subscribe = jest.spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, listener);
      return originalSubscribe(name, listener);
    });
    function CompactScreen({ compact }: { compact: boolean }) {
      const setCompact = useNavbarCompactLayoutSetter();
      React.useEffect(() => {
        setCompact(compact);
        return () => setCompact(false);
      }, [compact, setCompact]);
      return null;
    }
    (usePathname as jest.Mock).mockReturnValue("/flashcards");
    const screen = render(<Navbar><CompactScreen compact={false} /></Navbar>);
    const emit = (suffix: "Show" | "Hide") => act(() => {
      for (const [name, listener] of listeners) {
        if (name.endsWith(suffix)) listener({ duration: 250 } as KeyboardEvent);
      }
    });
    try {
      emit("Show");
      expect(screen.getByTestId("navbar-top-bar-collapse").props.pointerEvents).toBe("auto");
      screen.rerender(<Navbar><CompactScreen compact /></Navbar>);
      expect(screen.getByTestId("navbar-top-bar-collapse", { includeHiddenElements: true }).props.pointerEvents).toBe("none");
      expect(screen.getByTestId("navbar-top-bar-collapse", { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
      emit("Hide");
      expect(screen.getByTestId("navbar-top-bar-collapse").props.pointerEvents).toBe("auto");
      emit("Show");
      (usePathname as jest.Mock).mockReturnValue("/settings");
      screen.rerender(<Navbar><CompactScreen compact /></Navbar>);
      expect(screen.getByTestId("navbar-top-bar-collapse").props.pointerEvents).toBe("auto");
    } finally {
      screen.unmount();
      subscribe.mockRestore();
    }
  });

  it("shows five bottom buttons with flashcards centered and opens completed courses", () => {
    const screen = render(<Navbar />);
    const bottomButtons = screen.getAllByRole("button").slice(-5);

    expect(bottomButtons.map((button) => button.props.accessibilityLabel)).toEqual([
      'components.navbar.navbar.accessibilityLabel.przejdzDoPowtorekValue:{"count":3}',
      "components.navbar.navbar.accessibilityLabel.przejdzDoMenuGlownego",
      "components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek",
      "components.navbar.navbar.accessibilityLabel.przejdzDoUkonczonychKursow",
      "components.navbar.navbar.accessibilityLabel.przejdzDoUstawien",
    ]);
    expect(screen.getByText("trophy")).toBeTruthy();
    expect(screen.getByTestId("coachmark-flashcards-completed-courses-button")).toBeTruthy();

    fireEvent.press(bottomButtons[3]);
    expect(mockPush).toHaveBeenCalledWith("/completed-courses");
  });

  it.each([
    ["/", "home", 1, "home", require("@/assets/icons/navbar/colored/house_border_3x_outside.svg")],
    ["/review", "review", 0, "hourglass-end", require("@/assets/icons/navbar/colored/hourglass_border_3x_outside.svg")],
    ["/review/levels", "review", 0, "hourglass-end", require("@/assets/icons/navbar/colored/hourglass_border_3x_outside.svg")],
    ["/review/reviewflashcards", "review", 0, "hourglass-end", require("@/assets/icons/navbar/colored/hourglass_border_3x_outside.svg")],
    ["/flashcards", "play", 2, "gamepad", require("@/assets/icons/navbar/colored/gamepad_border_3x_outside.svg")],
    ["/course-entry-settings", "play", 2, "gamepad", require("@/assets/icons/navbar/colored/gamepad_border_3x_outside.svg")],
    ["/completed-courses", "completed", 3, "trophy", require("@/assets/icons/navbar/colored/puchar_border_3x_outside.svg")],
    ["/completed-courses/details", "completed", 3, "trophy", require("@/assets/icons/navbar/colored/puchar_border_3x_outside.svg")],
    ["/settings", "settings", 4, "settings-sharp", require("@/assets/icons/navbar/colored/settings_border_3x_outside.svg")],
    ["/settings/details", "settings", 4, "settings-sharp", require("@/assets/icons/navbar/colored/settings_border_3x_outside.svg")],
  ])("selects only the matching section on direct entry to %s", (path, section, index, inactiveIcon, source) => {
    const { screen } = setupNavbar({}, path);
    const bottomButtons = screen.getAllByRole("button").slice(-5);
    expect(bottomButtons.map(button => button.props.accessibilityState.selected))
      .toEqual([0, 1, 2, 3, 4].map(buttonIndex => buttonIndex === index));
    expect(screen.getAllByTestId(/^navbar-.*-active-icon$/)).toHaveLength(1);
    expect(screen.getAllByTestId(/^navbar-.*-active-background$/, { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getAllByTestId(/^navbar-.*-active-indicator$/, { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByTestId(`navbar-${section}-active-icon`)).toHaveProp("source", source);
    expect(screen.getByText(inactiveIcon)).toBeVisible();
    fireEvent(screen.getByTestId(`navbar-${section}-active-icon`), "display");
    expect(screen.queryByText(inactiveIcon)).toBeNull();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getAllByTestId(/^coachmark-flashcards-(review|home|game|completed-courses|settings)-button$/))
      .toHaveLength(5);
  });

  it("moves one highlight through measured frames, including the center button, and snaps on resize", () => {
    const app = setupNavbar({}, "/");
    jest.mocked(withTiming).mockClear();
    app.navigate("/flashcards");
    expect(withTiming).toHaveBeenCalledWith(144, expect.objectContaining({ duration: 220, reduceMotion: ReduceMotion.System }));
    expect(withTiming).toHaveBeenCalledWith(76, expect.objectContaining({ duration: 220 }));
    const indicator = app.screen.getByTestId("navbar-selection-indicator", { includeHiddenElements: true });
    app.navigate("/settings");
    expect(app.screen.getByTestId("navbar-selection-indicator", { includeHiddenElements: true })).toBe(indicator);
    expect(withTiming).toHaveBeenCalledWith(296, expect.objectContaining({ duration: 220 }));
    jest.mocked(withTiming).mockClear();
    fireEvent(app.screen.getAllByRole("button").slice(-5)[4], "layout", {
      nativeEvent: { layout: { x: 400, y: 2, width: 90, height: 44 } },
    });
    expect(withTiming).not.toHaveBeenCalled();
    expect(app.screen.getByTestId("navbar-selection-indicator", { includeHiddenElements: true })).toHaveStyle({
      width: 90, transform: [{ translateX: 400 }, { translateY: 2 }],
    });
    app.navigate("/stats");
    expect(app.screen.queryByTestId("navbar-selection-indicator", { includeHiddenElements: true })).toBeNull();
  });

  it("keeps the original icon until SVG display and restores it if loading fails", () => {
    const { screen } = setupNavbar({}, "/completed-courses");
    const image = screen.getByTestId("navbar-completed-active-icon");
    expect(screen.getByText("trophy")).toBeVisible();
    // Loading alone does not guarantee that the native view has drawn the image.
    fireEvent(image, "load");
    expect(screen.getByText("trophy")).toBeVisible();
    fireEvent(image, "display");
    expect(image).toBeVisible();
    expect(screen.queryByText("trophy")).toBeNull();
    fireEvent(image, "error", { error: "SVG decoding failed" });
    expect(screen.getByText("trophy")).toBeVisible();
  });

  it("preloads inactive SVGs and reuses their views when switching away and back", () => {
    const app = setupNavbar({}, "/stats");
    const image = app.screen.getByTestId("navbar-home-colored-icon");
    expect(image).not.toBeVisible();
    expect(app.screen.getByText("home")).toBeVisible();
    fireEvent(image, "display");
    expect(app.screen.getByText("home")).toBeVisible();
    app.navigate("/");
    expect(app.screen.getByTestId("navbar-home-active-icon")).toBe(image);
    expect(image).toBeVisible();
    expect(app.screen.queryByText("home")).toBeNull();
    app.navigate("/settings");
    expect(image).not.toBeVisible();
    expect(app.screen.getByText("home")).toBeVisible();
    expect(app.screen.getByText("settings-sharp")).toBeVisible();
    app.navigate("/");
    expect(app.screen.getByTestId("navbar-home-active-icon")).toBe(image);
    expect(image).toBeVisible();
    expect(app.screen.queryByText("home")).toBeNull();
  });

  it("does not let a late SVG display hide another section's pending icon", () => {
    const app = setupNavbar({}, "/");
    const home = app.screen.getByTestId("navbar-home-active-icon");
    app.navigate("/settings");
    fireEvent(home, "display");
    expect(home).not.toBeVisible();
    expect(app.screen.getByText("settings-sharp")).toBeVisible();
    expect(app.screen.getByText("home")).toBeVisible();
    fireEvent(app.screen.getByTestId("navbar-settings-active-icon"), "display");
    expect(app.screen.queryByText("settings-sharp")).toBeNull();
    expect(app.screen.getByText("home")).toBeVisible();
  });

  it("follows navigation and back without tying selection to the active course", async () => {
    const app = setupNavbar({}, "/");
    expect(app.screen.getByTestId("navbar-home-active-icon")).toBeTruthy();
    app.navigate("/flashcards");
    expect(app.screen.queryByTestId("navbar-home-active-icon")).toBeNull();
    expect(app.screen.getByTestId("navbar-play-active-icon")).toBeTruthy();
    app.updateSettings({ activeCustomCourseId: 11 });
    await act(async () => {});
    expect(app.screen.getByTestId("navbar-play-active-icon")).toBeTruthy();
    app.navigate("/settings");
    expect(app.screen.getByTestId("navbar-settings-active-icon")).toBeTruthy();
    app.navigate("/flashcards");
    expect(app.screen.getAllByTestId(/^navbar-.*-active-icon$/)).toHaveLength(1);
    expect(app.screen.getByTestId("navbar-play-active-icon")).toBeTruthy();
    app.navigate("/");
    expect(app.screen.getByTestId("navbar-home-active-icon")).toBeTruthy();
  });

  it.each(["/stats", "/coursepanel", "/editcourse", "/settings-extra", "/review-extra", "/completed-courses-extra"])(
    "leaves all sections inactive on %s",
    path => {
      const { screen } = setupNavbar({}, path);
      expect(screen.getAllByRole("button").slice(-5).every(button => !button.props.accessibilityState.selected)).toBe(true);
      expect(screen.queryAllByTestId(/^navbar-.*-active-(icon|background|indicator)$/)).toHaveLength(0);
      for (const icon of ["hourglass-end", "home", "gamepad", "trophy", "settings-sharp"]) {
        expect(screen.getByText(icon)).toBeTruthy();
      }
    },
  );

  it.each(["/review/brain", "/review/table", "/review/minigames/memory"])(
    "keeps the bottom bar hidden on %s",
    path => {
      const { screen } = setupNavbar({}, path);
      expect(screen.queryByTestId("coachmark-flashcards-review-button")).toBeNull();
      expect(screen.queryAllByTestId(/^navbar-.*-active-icon$/)).toHaveLength(0);
    },
  );

  it("updates the active highlight with the theme and keeps the review badge above the indicator", () => {
    const app = setupNavbar({}, "/review");
    const icon = app.screen.getByTestId("navbar-review-active-icon");
    const source = icon.props.source;
    expect(app.screen.getByTestId("navbar-review-active-background", { includeHiddenElements: true }))
      .toHaveStyle({ backgroundColor: mockBaseSettings.colors.my_green, opacity: 0.08 });
    app.updateTheme({ theme: "dark", colors: { ...mockBaseSettings.colors, my_green: "#00caacff", headline: "#fffffe" } });
    expect(app.screen.getByTestId("navbar-review-active-background", { includeHiddenElements: true }))
      .toHaveStyle({ backgroundColor: "#00caacff", opacity: 0.14 });
    expect(app.screen.getByTestId("navbar-review-active-indicator", { includeHiddenElements: true }))
      .toHaveStyle({ backgroundColor: "#00caacff", width: 20, height: 3 });
    expect(app.screen.getByTestId("navbar-review-active-icon")).toHaveProp("source", source);
    app.updateProviders(1001);
    const reviewButton = app.screen.getAllByRole("button").slice(-5)[0];
    expect(within(reviewButton).getByText("999+")).toBeTruthy();
    expect(reviewButton).toHaveAccessibilityState({ selected: true });
    fireEvent.press(reviewButton);
    expect(mockDismissTo).toHaveBeenCalledWith("/review");
  });

  it("waits for settings before starting the active custom course", async () => {
    const app = setupNavbar({
      activeCustomCourseId: 11,
      customCourseEntrySettingsSeenHydrated: false,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });
    const gamepad = () => app.screen.getByLabelText(
      "components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek"
    );
    fireEvent.press(gamepad());
    expect(mockPush).not.toHaveBeenCalled();

    app.updateSettings({ customCourseEntrySettingsSeenHydrated: true });
    fireEvent.press(gamepad());
    expect(mockPush).toHaveBeenCalledWith("/course-entry-settings");
    await act(async () => {});
  });

  it("dismisses to the review course selection screen from stale review child routes", () => {
    const screen = render(<Navbar />);

    fireEvent.press(
      screen.getByLabelText(
        'components.navbar.navbar.accessibilityLabel.przejdzDoPowtorekValue:{"count":3}'
      )
    );

    expect(mockDismissTo).toHaveBeenCalledWith("/review");
    expect(mockPush).not.toHaveBeenCalledWith("/review");
  });


  it("isolates selection and metadata completion from static navigation, stats and screen content", async () => {
    const pending = deferred<CustomCourseRecord | null>();
    (getCustomCourseById as jest.Mock).mockReturnValueOnce(pending.promise);
    const app = setupNavbar();
    const baseline = {
      icons: mockStaticIconRender.mock.calls.length,
      stats: mockStatsRender.mock.calls.length,
      content: mockContentRender.mock.calls.length,
      refresh: mockRefreshDueReviews.mock.calls.length,
    };
    app.updateSettings({ activeCustomCourseId: 11 });
    // QuoteProvider also consumes broad settings and recreates its context value.
    app.updateProviders();
    expect(app.screen.queryByText("Course A")).toBeNull();
    await act(async () => { pending.resolve(course(11, "Course A")); });
    expect(app.screen.getByText("Course A")).toBeTruthy();
    expect(mockStaticIconRender).toHaveBeenCalledTimes(baseline.icons);
    expect(mockStatsRender).toHaveBeenCalledTimes(baseline.stats);
    expect(mockContentRender).toHaveBeenCalledTimes(baseline.content);
    expect(mockRefreshDueReviews).toHaveBeenCalledTimes(baseline.refresh);
    app.updateSettings({ dailyGoal: 30 });
    expect(getCustomCourseById).toHaveBeenCalledTimes(1);
    expect(mockStaticIconRender).toHaveBeenCalledTimes(baseline.icons);
  });

  it("rejects old A/B responses during rapid A -> B -> A switching", async () => {
    const firstA = deferred<CustomCourseRecord | null>();
    const b = deferred<CustomCourseRecord | null>();
    const latestA = deferred<CustomCourseRecord | null>();
    (getCustomCourseById as jest.Mock)
      .mockReturnValueOnce(firstA.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(latestA.promise);
    const app = setupNavbar({ activeCustomCourseId: 11 });
    app.updateSettings({ activeCustomCourseId: 12 });
    app.updateSettings({ activeCustomCourseId: 11 });
    await act(async () => { firstA.resolve(course(11, "Old A")); b.resolve(course(12, "Old B")); });
    expect(app.screen.queryByText("Old A")).toBeNull();
    expect(app.screen.queryByText("Old B")).toBeNull();
    await act(async () => { latestA.resolve(course(11, "Current A")); });
    expect(app.screen.getByText("Current A")).toBeTruthy();
    expect((getCustomCourseById as jest.Mock).mock.calls).toEqual([[11], [12], [11]]);
  });

  it("shows and starts the latest course when returning Home after repeated panel selections", async () => {
    (getCustomCourseById as jest.Mock).mockImplementation(async (id: number) => course(id, `Course ${id}`));
    const hasSeenSettings = jest.fn((id: number) => id !== 14);
    const app = setupNavbar({ activeCustomCourseId: 11, hasSeenCustomCourseEntrySettings: hasSeenSettings }, "/");
    await act(async () => {});
    expect(app.screen.getByText("Course 11")).toBeTruthy();

    app.navigate("/coursepanel");
    for (const id of [12, 13, 14]) {
      await act(async () => { app.updateSettings({ activeCustomCourseId: id }); });
    }
    app.navigate("/");
    expect(app.screen.getByText("Course 14")).toBeTruthy();
    for (const id of [11, 12, 13]) expect(app.screen.queryByText(`Course ${id}`)).toBeNull();
    expect(app.screen.getByLabelText('components.navbar.navbar.accessibilityLabel.kursValueOtworzPanelKursow:{"course":"Course 14"}')).toBeTruthy();

    fireEvent.press(app.screen.getByLabelText("components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek"));
    expect(hasSeenSettings).toHaveBeenLastCalledWith(14);
    expect(mockPush).toHaveBeenCalledWith("/course-entry-settings");
  });

  it("clears previously displayed metadata immediately, including A -> B -> A before B loads", async () => {
    const pending = deferred<CustomCourseRecord | null>();
    (getCustomCourseById as jest.Mock).mockResolvedValueOnce(course(11, "Loaded A")).mockReturnValue(pending.promise);
    const app = setupNavbar({ activeCustomCourseId: 11 });
    await act(async () => {});
    expect(app.screen.getByText("Loaded A")).toBeTruthy();
    app.updateSettings({ activeCustomCourseId: 12 });
    expect(app.screen.queryByText("Loaded A")).toBeNull();
    app.updateSettings({ activeCustomCourseId: 11 });
    expect(app.screen.queryByText("Loaded A")).toBeNull();
    await act(async () => { pending.resolve(null); });
  });

  it("ignores late responses after deselection and unmount, including stale failures", async () => {
    const pending = deferred<CustomCourseRecord | null>();
    const afterUnmount = deferred<CustomCourseRecord | null>();
    (getCustomCourseById as jest.Mock).mockReturnValueOnce(pending.promise).mockReturnValueOnce(afterUnmount.promise);
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const app = setupNavbar({ activeCustomCourseId: 11 });
      app.updateSettings({ activeCustomCourseId: null });
      await act(async () => { pending.resolve(course(11, "Deselected")); });
      expect(app.screen.queryByText("Deselected")).toBeNull();
      app.updateSettings({ activeCustomCourseId: 12 });
      app.screen.unmount();
      await act(async () => { afterUnmount.reject(new Error("stale failure")); });
      expect(errorLog).not.toHaveBeenCalled();
    } finally { errorLog.mockRestore(); }
  });

  it.each(["missing", "failed"])("keeps fallback and active-course routing when metadata is %s", async (result) => {
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("read failed");
    if (result === "failed") (getCustomCourseById as jest.Mock).mockRejectedValueOnce(error);
    const app = setupNavbar({ activeCustomCourseId: 11 });
    try {
      await act(async () => {});
      expect(within(app.screen.getByTestId("coachmark-flashcards-course-button")).getByText("person-circle-outline")).toBeTruthy();
      fireEvent.press(app.screen.getByLabelText("components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek"));
      expect(mockPush).toHaveBeenCalledWith("/flashcards");
      if (result === "failed") expect(errorLog).toHaveBeenCalledWith("Failed to load active custom course", error);
    } finally { errorLog.mockRestore(); }
  });

  it("ignores a rejected old request after another course has loaded", async () => {
    const old = deferred<CustomCourseRecord | null>();
    (getCustomCourseById as jest.Mock).mockReturnValueOnce(old.promise).mockResolvedValueOnce(course(12, "Current B"));
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const app = setupNavbar({ activeCustomCourseId: 11 });
      app.updateSettings({ activeCustomCourseId: 12 });
      await act(async () => {});
      await act(async () => { old.reject(new Error("stale A")); });
      expect(app.screen.getByText("Current B")).toBeTruthy();
      expect(errorLog).not.toHaveBeenCalled();
    } finally { errorLog.mockRestore(); }
  });

  it("waits for pinned-course activation, then routes using entry settings", async () => {
    const activation = deferred<void>();
    const activate = jest.fn(() => activation.promise);
    const app = setupNavbar({
      pinnedOfficialCourseIds: [42], setActiveCustomCourseId: activate,
      hasSeenCustomCourseEntrySettings: () => false,
    });
    fireEvent.press(app.screen.getByLabelText("components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek"));
    expect(activate).toHaveBeenCalledWith(42);
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => { activation.resolve(); });
    expect(mockPush).toHaveBeenCalledWith("/course-entry-settings");
  });

  it("preserves hydration guards and builtin gamepad routing", async () => {
    const activate = jest.fn(() => Promise.resolve());
    const app = setupNavbar({ activeCustomCourseIdHydrated: false });
    const press = () => fireEvent.press(app.screen.getByLabelText("components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek"));
    press();
    expect(mockOpenCoursePanel).not.toHaveBeenCalled();
    app.updateSettings({ activeCustomCourseIdHydrated: true, pinnedOfficialCourseIds: [42],
      customCourseEntrySettingsSeenHydrated: false, setActiveCustomCourseId: activate });
    press();
    expect(activate).not.toHaveBeenCalled();
    app.updateSettings({ pinnedOfficialCourseIds: [], selectedLevel: "A1",
      activeCourse: { sourceLang: "en", targetLang: "pl", sourceLangId: 1, targetLangId: 2 } });
    press();
    expect(mockPush).toHaveBeenCalledWith("/flashcards");
    mockPush.mockClear();
    app.navigate("/flashcards");
    press();
    app.navigate("/course-entry-settings");
    press();
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => {});
  });

  it("refreshes same-ID edits on editor exit without refetching on ordinary navigation", async () => {
    const initial = course(11, "Before edit");
    (getCustomCourseById as jest.Mock).mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(course(11, "After edit", { iconId: "star", iconColor: "#abcdef" }));
    const app = setupNavbar({ activeCustomCourseId: 11 });
    await act(async () => {});
    app.navigate("/stats");
    app.navigate("/coursepanel");
    app.navigate("/editcourse");
    expect(getCustomCourseById).toHaveBeenCalledTimes(1);
    app.navigate("/coursepanel");
    await act(async () => {});
    expect(getCustomCourseById).toHaveBeenCalledTimes(2);
    expect(app.screen.queryByText("Before edit")).toBeNull();
    expect(app.screen.getByText("After edit")).toBeTruthy();
    expect(resolveCourseIconProps).toHaveBeenLastCalledWith("star", "#abcdef");
  });

  it("cancels a pre-edit read when editor exit starts a fresh same-ID read", async () => {
    const old = deferred<CustomCourseRecord | null>();
    const edited = deferred<CustomCourseRecord | null>();
    (getCustomCourseById as jest.Mock).mockReturnValueOnce(old.promise).mockReturnValueOnce(edited.promise);
    const app = setupNavbar({ activeCustomCourseId: 11 }, "/editcourse");
    app.navigate("/coursepanel");
    await act(async () => { edited.resolve(course(11, "Edited")); });
    await act(async () => { old.resolve(course(11, "Before save")); });
    expect(app.screen.getByText("Edited")).toBeTruthy();
    expect(app.screen.queryByText("Before save")).toBeNull();
  });

  it("preserves builtin level/flag and custom title, image, official flag and accessibility labels", async () => {
    const flag = { uri: "flag-en" };
    const graphic = { uri: "course-image" };
    (getFlagSource as jest.Mock).mockReturnValue(flag);
    (resolveCourseIconProps as jest.Mock).mockReturnValue({ mainImageSource: graphic });
    (getCustomCourseById as jest.Mock).mockResolvedValue(course(11, "Official course", { slug: "official-en" }));
    const app = setupNavbar({ activeCourse: { sourceLang: "en", targetLang: "pl" }, selectedLevel: "A2" });
    expect(app.screen.getByText("A2")).toBeTruthy();
    expect(getFlagSource).toHaveBeenCalledWith("en");
    expect(app.screen.UNSAFE_getAllByType(Image).map(image => image.props.source)).toContainEqual(flag);
    expect(app.screen.getByLabelText('components.navbar.navbar.accessibilityLabel.kursValueDoValuePoziomValueOtworzPanelKursow:{"sourceLang":"EN","targetLang":"PL","level":"A2"}')).toBeTruthy();
    app.updateSettings({ activeCustomCourseId: 11 });
    await act(async () => {});
    expect(app.screen.queryByText("A2")).toBeNull();
    expect(app.screen.getByText("Official course")).toBeTruthy();
    expect(within(app.screen.getByTestId("coachmark-flashcards-course-button"))
      .UNSAFE_getAllByType(Image).map(image => image.props.source)).toEqual([graphic, flag]);
    expect(app.screen.getByLabelText('components.navbar.navbar.accessibilityLabel.kursValueOtworzPanelKursow:{"course":"Official course"}')).toBeTruthy();
  });

  it("preserves resolved custom vector graphics", async () => {
    function CourseIcon({ name, color }: { name: string; color: string }) { return <Text>{`${name}:${color}`}</Text>; }
    (resolveCourseIconProps as jest.Mock).mockReturnValue({ icon: { Component: CourseIcon, name: "star", color: "#123456" } });
    (getCustomCourseById as jest.Mock).mockResolvedValueOnce(course(11, "Vector course"));
    const app = setupNavbar({ activeCustomCourseId: 11 });
    await act(async () => {});
    expect(app.screen.getByText("star:#123456")).toBeTruthy();
  });

  it("keeps theme, due-review badge, stats navigation and logo reactions live across memo boundaries", () => {
    const app = setupNavbar();
    app.updateTheme({ colors: { ...mockBaseSettings.colors, headline: "#abcdef" } });
    expect(mockStaticIconRender).toHaveBeenLastCalledWith(expect.objectContaining({ color: "#abcdef" }));
    app.updateProviders(1001);
    expect(app.screen.getByText("999+")).toBeTruthy();
    fireEvent.press(app.screen.getByText("stats"));
    expect(mockPush).toHaveBeenCalledWith("/stats");
    const logo = app.screen.getByLabelText("components.navbar.navbar.accessibilityLabel.przejdzDoStronyGlownej");
    for (let i = 0; i < 7; i += 1) fireEvent.press(logo);
    expect(mockTriggerQuote).toHaveBeenCalledWith(expect.objectContaining({ trigger: "quote_logo_rage" }));
  });

  it("updates real memoized stats rotator for stats/theme changes, but not course context", () => {
    const ActualStatsRotator = jest.requireActual<typeof import("../NavbarStatsRotator")>("../NavbarStatsRotator").default;
    let stats = mockStatsValue as unknown as ReturnType<typeof useNavbarStats>;
    let settings = mockBaseSettings;
    let theme = mockBaseSettings as ReturnType<typeof useThemeSettings>;
    const rotator = <ActualStatsRotator onPress={mockPush} />;
    const tree = () => <mockSettingsContext.Provider value={settings}>
      <mockThemeContext.Provider value={theme}>
        <mockNavbarStatsContext.Provider value={stats}>{rotator}</mockNavbarStatsContext.Provider>
      </mockThemeContext.Provider>
    </mockSettingsContext.Provider>;
    const screen = render(tree());
    const baselineRenders = (useNavbarStats as jest.Mock).mock.calls.length;
    settings = { ...settings, activeCustomCourseId: 11 };
    screen.rerender(tree());
    expect(useNavbarStats).toHaveBeenCalledTimes(baselineRenders);
    stats = { ...stats, stats: { ...stats.stats, masteredCount: 9 } };
    screen.rerender(tree());
    expect(screen.getByText("9")).toBeTruthy();
    theme = { ...theme, colors: { ...theme.colors, my_yellow: "#abcdef" } };
    screen.rerender(tree());
    expect(screen.UNSAFE_getByType(Ionicons).props.color).toBe("#abcdef");
    expect(useNavbarStats).toHaveBeenCalledTimes(baselineRenders + 2);
    stats = { ...stats, currentBurst: {
      id: 1, deltas: { masteredDelta: 1, streakDelta: 0, promotionsDelta: 0 },
      keys: ["mastered"], comboCount: 1, pinKey: "mastered", pinDurationMs: 2800, sparkle: false,
    } };
    screen.rerender(tree());
    expect(screen.getByText("+1")).toBeTruthy();
    fireEvent.press(screen.getByRole("button"));
    expect(mockPush).toHaveBeenCalled();
  });
});
