import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { act, cleanup, fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import TextTicker from "react-native-text-ticker";

import CoursesReviewScreen from "../CoursesReviewScreen";
import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import { CoachmarkLayerPortalProvider } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { DueCountBadge } from "@/src/components/review/DueCountBadge";
import { ReviewCourseSection } from "@/src/components/review/ReviewCourseSection";
import { SettingsProvider, useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import i18n from "@/src/i18n";

// Keep real settings, persistence, locale, styles, review components, coachmark
// flow/portal hooks and router. Mock native effects and database responses only.
jest.mock("@/src/db/sqlite/db", () => ({
  resetCustomReviewsForCourse: jest.fn(),
  countDueCustomReviews: jest.fn(),
  getCustomCoursesWithCardCounts: jest.fn(),
  getOfficialCustomCoursesWithCardCounts: jest.fn(),
}));
jest.mock("@/src/contexts/settings/useAudioFeedbackSettings", () => ({ useAudioFeedbackSettings: () => ({}) }));
jest.mock("@/src/contexts/settings/useCourseOverrideSettings", () => ({ useCourseOverrideSettings: () => ({}) }));
jest.mock("@/src/contexts/settings/useLearningReminderSettings", () => ({ useLearningReminderSettings: () => ({}) }));
jest.mock("@/src/contexts/settings/useGoogleDriveBackupSettings", () => ({ useGoogleDriveBackupSettings: () => ({}) }));
jest.mock("@/src/components/onboarding/GuidedCoachmarkLayer", () => ({ GuidedCoachmarkLayer: () => null }));
jest.mock("@edwardloopez/react-native-coachmark", () => {
  const context = {
    start: jest.fn(), next: jest.fn(), back: jest.fn(), stop: jest.fn(),
    state: { isActive: false, activeTour: null, index: 0 },
  };
  return {
    CoachmarkAnchor: ({ children }: { children?: React.ReactNode }) => children ?? null,
    useCoachmarkContext: () => context,
    createTour: jest.fn(),
  };
});
jest.mock("react-native-text-ticker", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockTicker(props: React.ComponentProps<typeof TextTicker>) {
    return <Text style={props.style}>{props.children}</Text>;
  };
});

// Call through rather than replace render bodies, so context subscriptions and
// local state remain real. Separate counters catch descendant-only leaks too.
jest.mock("../CoursesReviewScreen", () => {
  const actual = jest.requireActual<typeof import("../CoursesReviewScreen")>("../CoursesReviewScreen");
  return { ...actual, __esModule: true, default: jest.fn(actual.default) };
});
jest.mock("@/src/components/review/ReviewCourseSection", () => {
  const actual = jest.requireActual<typeof import("@/src/components/review/ReviewCourseSection")>("@/src/components/review/ReviewCourseSection");
  return { ...actual, ReviewCourseSection: jest.fn(actual.ReviewCourseSection) };
});
jest.mock("@/src/components/review/DueCountBadge", () => {
  const actual = jest.requireActual<typeof import("@/src/components/review/DueCountBadge")>("@/src/components/review/DueCountBadge");
  return { ...actual, DueCountBadge: jest.fn(actual.DueCountBadge) };
});
jest.mock("@/src/components/course/CourseTitleMarquee", () => {
  const actual = jest.requireActual<typeof import("@/src/components/course/CourseTitleMarquee")>("@/src/components/course/CourseTitleMarquee");
  return { ...actual, CourseTitleMarquee: jest.fn(actual.CourseTitleMarquee) };
});

let settings: ReturnType<typeof useSettings>;
let reviewNavigation: NavigationProp<ParamListBase>;

function SettingsProbe() {
  settings = useSettings();
  return null;
}

function ReviewRoute() {
  reviewNavigation = useNavigation();
  return <CoursesReviewScreen />;
}

function Layout() {
  return (
    <SettingsProvider>
      <SettingsProbe />
      <CoachmarkLayerPortalProvider>
        <Stack screenOptions={{ headerShown: false, animation: "none", freezeOnBlur: false }} />
      </CoachmarkLayerPortalProvider>
    </SettingsProvider>
  );
}

const customCourse: CustomCourseSummary = {
  id: 11, name: "Custom review", iconId: "book-outline", iconColor: "#123456",
  colorId: null, reviewsEnabled: true, cardsCount: 10, createdAt: 0, updatedAt: 0,
};
const officialCourse: CustomCourseSummary = {
  ...customCourse, id: 21, name: "Official review", isOfficial: true,
  slug: "fiszki_podstawy_en_pl_slowa",
};
const otherOfficialCourse: CustomCourseSummary = {
  ...officialCourse, id: 22, name: "Other official review", slug: "test-mini-review",
};
const hidden = { includeHiddenElements: true };
const mockedCustomCourses = jest.mocked(getCustomCoursesWithCardCounts);
const mockedOfficialCourses = jest.mocked(getOfficialCustomCoursesWithCardCounts);
const mockedDueCount = jest.mocked(countDueCustomReviews);

function reviewWork() {
  const titles = jest.mocked(CourseTitleMarquee).mock.calls;
  return {
    screen: jest.mocked(CoursesReviewScreen).mock.calls.length,
    sections: jest.mocked(ReviewCourseSection).mock.calls.length,
    customCards: titles.filter(([props]) => props.text === customCourse.name).length,
    officialCards: titles.filter(([props]) => props.text === officialCourse.name).length,
    badges: jest.mocked(DueCountBadge).mock.calls.length,
    customLoads: mockedCustomCourses.mock.calls.length,
    officialLoads: mockedOfficialCourses.mock.calls.length,
    counts: mockedDueCount.mock.calls.length,
  };
}

function scrollView() {
  return screen.UNSAFE_getByType(ScrollView);
}

function title(name: string) {
  return screen.getAllByText(name, hidden)[0];
}

async function startReview() {
  const app = renderRouter({
    _layout: Layout,
    "review/index": ReviewRoute,
    "coursepanel/index": () => <Text>Course panel</Text>,
    "review/reviewflashcards": () => <Text>Review flashcards</Text>,
  }, { initialUrl: "/review" });
  await waitFor(() => {
    expect(settings.activeCustomCourseIdHydrated).toBe(true);
    expect(settings.customCourseEntrySettingsSeenHydrated).toBe(true);
    expect(settings.uiLanguage).toBe("en");
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getAllByText(customCourse.name).length).toBeGreaterThan(0);
  });
  await act(async () => {});
  expect(reviewNavigation.isFocused()).toBe(true);
  return app;
}

function blurReview(app: ReturnType<typeof renderRouter>) {
  act(() => router.push("/coursepanel"));
  expect(app.getPathname()).toBe("/coursepanel");
  expect(reviewNavigation.isFocused()).toBe(false);
}

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
  }
});

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ["uiLanguage", '"en"'],
    ["activeCustomCourseId", "11"],
    ["officialPinnedCourseIds", "[21]"],
    ["@review_courses_intro_seen_v1", "1"],
    ["courses", JSON.stringify([
      { sourceLang: "en", targetLang: "pl", sourceLangId: 1, targetLangId: 2 },
      { sourceLang: "pl", targetLang: "en", sourceLangId: 2, targetLangId: 1 },
    ])],
  ]);
  await i18n.changeLanguage("en");
  jest.clearAllMocks();
  mockedCustomCourses.mockResolvedValue([customCourse]);
  mockedOfficialCourses.mockResolvedValue([officialCourse, otherOfficialCourse]);
  mockedDueCount.mockImplementation(async (id) => id === 11 ? 3 : 5);
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

it("does no review render or list work for 24 course changes while mounted and unfocused", async () => {
  const app = await startReview();
  const initialScroll = scrollView();
  const onScroll = initialScroll.props.onScroll;
  const scrollTo = jest.spyOn(initialScroll.instance, "scrollTo");
  fireEvent.scroll(initialScroll, { nativeEvent: { contentOffset: { x: 0, y: 240 } } });

  // Populate real marquee local state to detect accidental remounts on return.
  const marquee = screen.UNSAFE_getAllByType(CourseTitleMarquee)
    .find((node) => node.props.text === customCourse.name)!;
  fireEvent(marquee.findByType(View), "layout", { nativeEvent: { layout: { width: 100 } } });
  fireEvent(marquee.findAllByType(Text).find((node: { props: { onTextLayout?: unknown } }) => node.props.onTextLayout)!, "textLayout", {
    nativeEvent: { lines: [{ width: 200 }] },
  });
  expect(marquee.findByType(TextTicker).props.disabled).toBe(false);

  blurReview(app);
  const baseline = reviewWork();
  for (const count of [baseline.screen, baseline.sections, baseline.customCards, baseline.officialCards, baseline.badges]) {
    expect(count).toBeGreaterThan(0);
  }
  for (let index = 0; index < 24; index += 1) {
    await act(async () => {
      if (index % 4 < 2) {
        await settings.setActiveCustomCourseId(100 + index);
      } else {
        await settings.setActiveCourseIdx(index % 2);
      }
    });
    expect(settings.activeCustomCourseId).toBe(index % 4 < 2 ? 100 + index : null);
    expect(settings.activeCourseIdx).toBe(index % 4 < 2 ? null : index % 2);
    expect(reviewWork()).toEqual(baseline);
    expect(scrollView()).toBe(initialScroll);
    expect(reviewNavigation.isFocused()).toBe(false);
  }
  expect(await AsyncStorage.getItem("activeCourseIdx")).toBe("1");
  expect(await AsyncStorage.getItem("activeCustomCourseId")).toBe("null");

  act(() => router.back());
  await waitFor(() => expect(mockedCustomCourses).toHaveBeenCalledTimes(baseline.customLoads + 1));
  await act(async () => {});
  expect(app.getPathname()).toBe("/review");
  expect(reviewNavigation.isFocused()).toBe(true);
  expect(scrollView()).toBe(initialScroll);
  expect(scrollView().props.onScroll).toBe(onScroll);
  expect(scrollView().props.scrollEnabled).toBe(true);
  expect(screen.UNSAFE_getAllByType(CourseTitleMarquee).find((node) => node.props.text === customCourse.name)).toBe(marquee);
  expect(marquee.findByType(TextTicker).props.disabled).toBe(false);
  expect(scrollTo).not.toHaveBeenCalled();
});

it("updates pinned cards, language, theme and accessibility while blurred", async () => {
  const app = await startReview();
  const initialScroll = scrollView();
  const headingKey = "repeats.labels.reviews";
  const initialHeading = i18n.t(headingKey);
  const initialSize = StyleSheet.flatten(screen.getByText(initialHeading).props.style).fontSize!;
  const initialBadgeSize = StyleSheet.flatten(screen.getByText("3").props.style).fontSize!;
  blurReview(app);
  const loads = mockedCustomCourses.mock.calls.length;

  await act(async () => { await settings.unpinOfficialCourse(21); });
  expect(screen.queryAllByText(officialCourse.name, hidden)).toHaveLength(0);
  await act(async () => { await settings.pinOfficialCourse(22); });
  expect(title(otherOfficialCourse.name)).toBeTruthy();
  await act(async () => { await settings.pinOfficialCourse(21); });
  expect(title(officialCourse.name)).toBeTruthy();

  for (const change of [
    () => settings.toggleTheme(),
    () => settings.toggleHighContrast(),
    () => settings.setColorBlindMode("deuteranopia"),
  ]) {
    const before = reviewWork();
    await act(async () => { await change(); });
    expect(reviewWork().screen).toBeGreaterThan(before.screen);
    expect(reviewWork().badges).toBeGreaterThan(before.badges);
    expect(StyleSheet.flatten(screen.getByText(initialHeading, hidden).props.style).color).toBe(settings.colors.headline);
    expect(StyleSheet.flatten(screen.getByText("3", hidden).props.style).color).toBe(settings.colors.my_red);
  }
  await act(async () => { await settings.toggleLargeFont(); });
  expect(StyleSheet.flatten(screen.getByText(initialHeading, hidden).props.style).fontSize).toBe(initialSize * 1.15);
  expect(StyleSheet.flatten(screen.getByText("3", hidden).props.style).fontSize).toBe(initialBadgeSize * 1.15);
  await act(async () => { await settings.setUiLanguage("pl"); });
  expect(i18n.resolvedLanguage).toBe("pl");
  expect(i18n.t(headingKey)).not.toBe(initialHeading);
  expect(screen.getByText(i18n.t(headingKey), hidden)).toBeTruthy();
  expect(mockedCustomCourses).toHaveBeenCalledTimes(loads);
  expect(scrollView()).toBe(initialScroll);
  expect(reviewNavigation.isFocused()).toBe(false);
});

it("refreshes review data on refocus and keeps zero-due courses disabled", async () => {
  const app = await startReview();
  const initialScroll = scrollView();
  blurReview(app);
  const loads = mockedCustomCourses.mock.calls.length;
  mockedCustomCourses.mockResolvedValue([customCourse, { ...customCourse, id: 12, name: "New review" }]);
  mockedDueCount.mockImplementation(async (id) => id === 11 ? 0 : 7);
  await act(async () => { await settings.setActiveCustomCourseId(99); });
  expect(mockedCustomCourses).toHaveBeenCalledTimes(loads);

  act(() => router.back());
  await waitFor(() => {
    expect(screen.getAllByText("New review").length).toBeGreaterThan(0);
    expect(screen.getByText("0")).toBeTruthy();
  });
  expect(mockedCustomCourses).toHaveBeenCalledTimes(loads + 1);
  expect(scrollView()).toBe(initialScroll);
  expect(StyleSheet.flatten(screen.getByText("0").props.style).color).toBe(settings.colors.my_green);
  fireEvent.press(title(customCourse.name));
  expect(app.getPathname()).toBe("/review");
  expect(settings.activeCustomCourseId).toBe(99);
  expect(screen.getAllByText("7").length).toBeGreaterThan(0);
});

it.each([
  [customCourse.name, customCourse.id],
  [officialCourse.name, officialCourse.id],
])("activates and navigates to %s after background selection changes", async (name, id) => {
  const app = await startReview();
  blurReview(app);
  for (const change of [
    () => settings.setActiveCustomCourseId(99),
    () => settings.setActiveCourseIdx(0),
    () => settings.setActiveCourseIdx(1),
  ]) {
    await act(async () => { await change(); });
  }
  act(() => router.back());
  await act(async () => {});
  await act(async () => { fireEvent.press(title(name)); });
  expect(settings.activeCustomCourseId).toBe(id);
  expect(settings.activeCourseIdx).toBeNull();
  expect(await AsyncStorage.getItem("activeCustomCourseId")).toBe(String(id));
  expect(app.getPathname()).toBe("/review/reviewflashcards");
  expect(app.getSearchParams()).toEqual({ courseId: String(id) });
});
