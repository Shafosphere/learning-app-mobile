import React from "react";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { CourseGroupList } from "../CourseGroupList";
import type { CourseGroup, OfficialCourseListItem } from "@/src/features/customCourse/courseActivationTypes";
import { COURSE_CATEGORIES } from "@/src/constants/courseCategories";
import { resolveThemeColors } from "@/src/theme/theme";
import { recordCourseActivationEvent } from "@/src/services/courseActivationDiagnostics";

const mockCardRender = jest.fn();
const mockThemeContext = React.createContext({
  colors: resolveThemeColors("light"), accessibilityPreferences: {}, fontScaleMultiplier: 1,
});
jest.mock("@/src/contexts/SettingsContext", () => ({
  useThemeSettings: () => jest.requireActual<typeof import("react")>("react").useContext(mockThemeContext),
}));
jest.mock("@/src/services/courseActivationDiagnostics", () => ({
  recordCourseActivationEvent: jest.fn(), COURSE_ACTIVATION_DIAGNOSTICS_ENABLED: false,
}));
jest.mock("@/src/components/course/CourseListCard", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return { CourseListCard: (props: React.ComponentProps<typeof import("../CourseListCard").CourseListCard>) => {
    mockCardRender(props);
    return <Pressable onPress={props.onPress}><Text>{props.title}</Text>{props.rightAccessory}</Pressable>;
  } };
});
jest.mock("@expo/vector-icons/FontAwesome6", () => "Icon");
jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));

function course(id: number, isMini = false): OfficialCourseListItem {
  return {
    id, name: `Course ${id}`, slug: `course_${id}`, cardsCount: 50,
    iconId: "flag:en", iconColor: "#111", isOfficial: true, reviewsEnabled: true,
    colorId: null, createdAt: 0, updatedAt: 0,
    sourceLang: "en", targetLang: "pl", smallFlag: "en", isMini,
  };
}
function group(key: string, official: OfficialCourseListItem[], extra: Partial<CourseGroup> = {}): CourseGroup {
  return { key, official, sourceLang: "en", targetLang: "pl", ...extra };
}

async function setup(groups = [group("a", [course(1), course(2), course(3, true)]),
  group("b", [course(4, true), course(5, true)]), group("c", [course(6)])]) {
  const i18n = createInstance();
  await i18n.init({
    lng: "en", fallbackLng: "en", interpolation: { escapeValue: false },
    resources: {
      en: { translation: { repeats: { labels: { courses: "Courses" } }, courses: { groups: { mini: "Mini" } } } },
      pl: { translation: { repeats: { labels: { courses: "Kursy" } }, courses: { groups: { mini: "Mini PL" } } } },
    },
  });
  let theme = { colors: resolveThemeColors("light"), accessibilityPreferences: {}, fontScaleMultiplier: 1 };
  let props: React.ComponentProps<typeof CourseGroupList> = {
    groups, activeCourseId: 1, colors: theme.colors, onPress: jest.fn(), onEdit: jest.fn(),
    firstCoachmarkCourseId: 1, scrollRef: { current: null }, renderCourseFooter: jest.fn(() => null),
  };
  const tree = () => <mockThemeContext.Provider value={theme}>
    <I18nextProvider i18n={i18n}><CourseGroupList {...props} /></I18nextProvider>
  </mockThemeContext.Provider>;
  const screen = render(tree());
  return {
    screen, i18n,
    get props() { return props; },
    update(next: Partial<typeof props>) { props = { ...props, ...next }; screen.rerender(tree()); },
    updateTheme(next: typeof theme) { theme = next; screen.rerender(tree()); },
  };
}
function events(name: string) {
  return jest.mocked(recordCourseActivationEvent).mock.calls.filter(([event]) => event === name).map(([, details]) => details);
}
beforeEach(() => jest.clearAllMocks());

it("reuses partitions and skips unaffected groups/sections while keeping exactly two changed rows", async () => {
  const app = await setup();
  jest.clearAllMocks();
  app.update({ activeCourseId: 2, colors: { ...app.props.colors } });
  expect(events("groups.prepare")).toEqual([]);
  expect(events("group.render")).toEqual([{ key: "a", activeCourseId: 2 }]);
  expect(events("section.render")).toEqual([{ title: "Courses", firstCourseId: 1, activeCourseId: 2 }]);
  expect(mockCardRender.mock.calls.map(([props]) => [props.title, props.isHighlighted]))
    .toEqual([["Course 1", false], ["Course 2", true]]);

  for (const next of [4, 2, 4]) {
    jest.clearAllMocks();
    app.update({ activeCourseId: next });
    expect(events("groups.prepare")).toEqual([]);
    expect(events("group.render").map((details) => details?.key)).toEqual(["a", "b"]);
    expect(events("section.render").map((details) => details?.firstCourseId)).toEqual([1, 4]);
    expect(mockCardRender).toHaveBeenCalledTimes(2);
    expect(mockCardRender.mock.calls.filter(([props]) => props.isHighlighted).map(([props]) => props.title))
      .toEqual([`Course ${next}`]);
  }
  app.update({ activeCourseId: 999 });
  jest.clearAllMocks();
  app.update({ activeCourseId: 1000 });
  expect(events("group.render")).toEqual([]);
  expect(mockCardRender).not.toHaveBeenCalled();
});

it("refreshes data and handlers without stale partitions or rows", async () => {
  const app = await setup();
  const changed = { ...app.props.groups[0].official[0], name: "Renamed", isMini: true };
  const groups = [group("a", [changed, course(2), course(3, true)]), ...app.props.groups.slice(1)];
  const onPress = jest.fn();
  const onEdit = jest.fn();
  const footer = jest.fn(() => null);
  app.update({ groups, onPress, onEdit, renderCourseFooter: footer });
  fireEvent.press(app.screen.getByText("Renamed"));
  expect(onPress).toHaveBeenCalledWith(1, true);
  fireEvent.press(within(app.screen.getByTestId("official-course-row-1")).getByLabelText("courses.official.editCourse"), { stopPropagation: jest.fn() });
  expect(onEdit).toHaveBeenCalledWith(changed);
  expect(footer).toHaveBeenCalledWith(changed, true);
  expect(app.screen.getAllByText(/Course \d|Renamed/).map((node) => node.props.children))
    .toEqual(["Course 2", "Renamed", "Course 3", "Course 4", "Course 5", "Course 6"]);
});

it("preserves headings, continuation spacing and empty groups without a footer", async () => {
  const app = await setup([
    group("series", [course(1)], { languageGroupId: "englishFromZero" }),
    group("continuation", [course(2), course(3, true)]),
    group("category", [course(4)], { category: COURSE_CATEGORIES.geography }),
    group("empty", []),
  ]);
  app.update({ renderCourseFooter: undefined });
  expect(app.screen.getAllByText("Courses")).toHaveLength(2);
  expect(app.screen.queryByText("Mini")).toBeNull();
  expect(app.screen.getByText("constants.languageCourseGroups.label.englishFromZero")).toBeTruthy();
  expect(app.screen.getByText("CONSTANTS.COURSECATEGORIES.LABEL.GEOGRAPHY")).toBeTruthy();
  expect(app.screen.getAllByText(/Course \d/).map((node) => node.props.children))
    .toEqual(["Course 1", "Course 2", "Course 3", "Course 4"]);
});

it("updates memoized groups and headings through translation, theme and font-scale contexts", async () => {
  const app = await setup();
  jest.clearAllMocks();
  await act(async () => { await app.i18n.changeLanguage("pl"); });
  expect(app.screen.getAllByText("Kursy")).toHaveLength(2);
  expect(events("group.render").map((details) => details?.key)).toEqual(["a", "b", "c"]);
  expect(events("groups.prepare")).toEqual([]);
  const colors = resolveThemeColors("dark", { highContrast: true });
  app.updateTheme({ colors, accessibilityPreferences: {}, fontScaleMultiplier: 1.3 });
  for (const heading of app.screen.getAllByText("Kursy")) {
    expect(heading).toHaveStyle({ color: colors.headline, fontSize: 18 * 1.3 });
  }
});
