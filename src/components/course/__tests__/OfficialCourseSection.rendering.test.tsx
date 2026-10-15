import React from "react";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";

import { OfficialCourseSection } from "../OfficialCourseSection";
import type { OfficialCourseListItem } from "@/src/features/customCourse/courseActivationTypes";
import { resolveThemeColors } from "@/src/theme/theme";

const mockCardRender = jest.fn();
const mockThemeContext = React.createContext({
  colors: resolveThemeColors("light"),
  accessibilityPreferences: {},
  fontScaleMultiplier: 1,
});

jest.mock("@/src/contexts/SettingsContext", () => ({
  useThemeSettings: () => jest.requireActual<typeof import("react")>("react").useContext(mockThemeContext),
}));
jest.mock("@/src/components/course/CourseListCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const actual = jest.requireActual<typeof import("../CourseListCard")>("../CourseListCard");
  return {
    CourseListCard: (props: React.ComponentProps<typeof actual.CourseListCard>) => {
      mockCardRender(props);
      return <actual.CourseListCard {...props} />;
    },
  };
});
jest.mock("@expo/vector-icons/FontAwesome6", () => "Icon");
jest.mock("react-native-text-ticker", () => jest.requireActual<typeof import("react-native")>("react-native").Text);
jest.mock("@edwardloopez/react-native-coachmark", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    CoachmarkAnchor: ({ id, children }: { id: string; children: React.ReactNode }) => <View testID={id}>{children}</View>,
  };
});

function course(id: number): OfficialCourseListItem {
  return {
    id, name: `Course ${id}`, slug: `course_${id}`, cardsCount: 50,
    iconId: "flag:en", iconColor: "#111", isOfficial: true, reviewsEnabled: true,
    colorId: null, createdAt: 0, updatedAt: 0,
    sourceLang: "en", targetLang: "pl", smallFlag: "en", isMini: true,
  };
}

async function setup() {
  const i18n = createInstance();
  await i18n.init({
    lng: "en", fallbackLng: "en", interpolation: { escapeValue: false },
    resources: {
      en: { translation: { courses: { official: { cardsCount: "{{count}} cards", editCourse: "Edit {{name}}" } } } },
      pl: { translation: { courses: { official: { cardsCount: "{{count}} fiszek", editCourse: "Edytuj {{name}}" } } } },
    },
  });
  let theme = { colors: resolveThemeColors("light"), accessibilityPreferences: {}, fontScaleMultiplier: 1 };
  let props: React.ComponentProps<typeof OfficialCourseSection> = {
    title: "Courses", list: [course(1), course(2)], activeCourseId: 1,
    headlineColor: theme.colors.headline, onPress: jest.fn(), onEdit: jest.fn(),
    firstCoachmarkCourseId: 1, scrollRef: { current: null },
    renderCourseFooter: jest.fn(() => null),
  };
  const tree = () => (
    <mockThemeContext.Provider value={theme}>
      <I18nextProvider i18n={i18n}><OfficialCourseSection {...props} /></I18nextProvider>
    </mockThemeContext.Provider>
  );
  const screen = render(tree());
  return {
    screen, i18n,
    get props() { return props; },
    update(next: Partial<typeof props>) { props = { ...props, ...next }; screen.rerender(tree()); },
    updateTheme(next: typeof theme) { theme = next; screen.rerender(tree()); },
  };
}

beforeEach(() => { jest.clearAllMocks(); });

it("skips unchanged rows, but applies new course data, handlers, footer and anchor", async () => {
  const app = await setup();
  const initialFooter = app.props.renderCourseFooter as jest.Mock;
  mockCardRender.mockClear();
  initialFooter.mockClear();
  app.update({ list: [...app.props.list] });
  expect(mockCardRender).not.toHaveBeenCalled();
  expect(initialFooter).not.toHaveBeenCalled();

  app.update({ activeCourseId: 2 });
  expect(mockCardRender.mock.calls.map(([props]) => [props.title, props.isHighlighted]))
    .toEqual([["Course 1", false], ["Course 2", true]]);
  expect(initialFooter.mock.calls.map(([course, expanded]) => [course.id, expanded]))
    .toEqual([[1, false], [2, true]]);

  mockCardRender.mockClear();
  const changed = { ...app.props.list[0], name: "Renamed", cardsCount: 75, iconColor: "#abc", smallFlag: "pl" };
  app.update({ list: [changed, app.props.list[1]] });
  expect(mockCardRender).toHaveBeenCalledTimes(1);
  expect(mockCardRender).toHaveBeenLastCalledWith(expect.objectContaining({
    title: "Renamed", subtitle: "75 cards", iconColor: "#abc", flagCode: "pl",
  }));
  expect(app.screen.getByText("75 cards")).toBeTruthy();

  const onPress = jest.fn();
  const onEdit = jest.fn();
  const footer = jest.fn(() => null);
  app.update({ onPress, onEdit, renderCourseFooter: footer, firstCoachmarkCourseId: 2 });
  fireEvent.press(app.screen.getAllByText("Course 2")[0]);
  expect(onPress).toHaveBeenCalledWith(2, true);
  expect(within(app.screen.getByTestId("course-activate-first-card")).getAllByText("Course 2").length).toBeGreaterThan(0);
  const stopPropagation = jest.fn();
  fireEvent.press(app.screen.getByRole("button", { name: "Edit Renamed" }), { stopPropagation });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(onEdit).toHaveBeenCalledWith(changed);
  expect(footer).toHaveBeenCalledWith(changed, false);
});

it("updates real cards and marquee styles for theme, font size and translation context changes", async () => {
  const app = await setup();
  mockCardRender.mockClear();
  const colors = resolveThemeColors("dark", { highContrast: true });
  app.updateTheme({ colors, accessibilityPreferences: {}, fontScaleMultiplier: 1.15 });
  expect(mockCardRender.mock.calls.map(([props]) => props.title)).toEqual(["Course 1", "Course 2"]);
  for (const text of app.screen.getAllByText("Course 1")) {
    expect(text).toHaveStyle({ color: colors.headline, fontSize: 25 * 1.15 });
  }

  mockCardRender.mockClear();
  await act(async () => { await app.i18n.changeLanguage("pl"); });
  expect(mockCardRender.mock.calls.map(([props]) => props.title)).toEqual(["Course 1", "Course 2"]);
  expect(app.screen.getAllByText("50 fiszek")).toHaveLength(2);
  expect(app.screen.getByRole("button", { name: "Edytuj Course 1" })).toBeTruthy();
});
