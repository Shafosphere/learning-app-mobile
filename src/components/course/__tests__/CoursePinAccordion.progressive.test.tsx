import { fireEvent, render } from "@testing-library/react-native";
import { Modal, ScrollView, Text } from "react-native";
import { CoursePinAccordion, type AccordionGroupItem } from "../CoursePinAccordion";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import pl from "@/src/locales/pl.json";

jest.mock("@/src/contexts/SettingsContext", () => {
  const { themeMap } = jest.requireActual<typeof import("@/src/theme/theme")>("@/src/theme/theme");
  const useSettings = () => ({ colors: themeMap.light, fontScaleMultiplier: 1.6, accessibilityPreferences: {} });
  return { useSettings, useThemeSettings: useSettings };
});
jest.mock("react-i18next", () => {
  const pl = jest.requireActual<typeof import("@/src/locales/pl.json")>("@/src/locales/pl.json");
  return {
  useTranslation: () => ({
    t: (key: string, params: Record<string, string | number> = {}) => {
      const copy = pl.courses.progressive as Record<string, string>;
      if (key.startsWith("courses.progressive.")) return copy[key.split(".").at(-1)!];
      if (key === "courses.groups.categoryA11y") return `Kategoria ${params.title}, ${params.count} kursów`;
      return key;
    },
  }),
  };
});
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@expo/vector-icons/FontAwesome6", () => () => null);

const makeGroup = (series?: string): AccordionGroupItem => ({
  key: series ?? "flags", title: series ?? "Flagi", subtitle: "Opis", count: 1,
  progressiveDescriptionKey: series
    ? `courses.progressive.${series === "roadSigns" ? "roadSignsDescription" : series === "elements" ? "elementsDescription" : series === "mushrooms" ? "mushroomsDescription" : "description"}`
    : undefined,
  regularItems: [{
    id: 1, name: "Zestaw", iconId: "flag:es", iconColor: "#F97316", slug: "es_to_pl_first_50",
    sourceLang: "es", targetLang: "pl", cardsCount: 50, smallFlag: "pl", isMini: false,
  }],
  miniItems: [],
});

it("preserves an expanded group and pin actions when switching between one and two columns", () => {
  const group = makeGroup("englishFromZero");
  group.regularItems = [1, 2, 3].map((id) => ({ ...group.regularItems[0], id, name: `Kurs ${id}` }));
  group.count = 3;
  const onPin = jest.fn();
  const renderCourseCard = (course: AccordionGroupItem["regularItems"][number]) => (
    <Text key={course.id} onPress={() => onPin(course.id)}>{course.name}</Text>
  );
  const screen = render(<CoursePinAccordion groups={[group]} renderCourseCard={renderCourseCard} />);
  fireEvent.press(screen.getByLabelText("Kategoria englishFromZero, 3 kursów"));
  screen.rerender(<CoursePinAccordion groups={[group]} columns={2} renderCourseCard={renderCourseCard} />);
  expect(screen.getByLabelText("Kategoria englishFromZero, 3 kursów").props.accessibilityState.expanded).toBe(true);
  fireEvent.press(screen.getByText("Kurs 3"));
  expect(onPin).toHaveBeenCalledWith(3);
  screen.rerender(<CoursePinAccordion groups={[group]} columns={1} renderCourseCard={renderCourseCard} />);
  expect(screen.getByText("Kurs 3")).toBeTruthy();
});

it.each(["englishFromZero", "frenchFromZero", "spanishFromZero", "roadSigns", "elements", "mushrooms"] as const)("shows info on collapsed and expanded %s without changing pin or expansion state", (id) => {
  const onPin = jest.fn();
  const screen = render(<CoursePinAccordion groups={[makeGroup(id)]} renderCourseCard={(course) => <Text key={course.id} onPress={onPin}>Zestaw</Text>} />);
  const header = () => screen.getByLabelText(`Kategoria ${id}, 1 kursów`);
  const info = () => screen.getByLabelText(pl.courses.progressive.infoLabel);
  expect(header().props.accessibilityState.expanded).toBe(false);
  fireEvent.press(info());
  const description = id === "roadSigns" ? pl.courses.progressive.roadSignsDescription : id === "elements" ? pl.courses.progressive.elementsDescription : id === "mushrooms" ? pl.courses.progressive.mushroomsDescription : pl.courses.progressive.description;
  expect(screen.getByText(description)).toBeTruthy();
  fireEvent.press(screen.getByText(pl.courses.progressive.confirm));
  expect(screen.queryByText(pl.courses.progressive.title)).toBeNull();
  expect(header().props.accessibilityState.expanded).toBe(false);
  expect(onPin).not.toHaveBeenCalled();

  fireEvent.press(header());
  expect(screen.getByText("Zestaw")).toBeTruthy();
  fireEvent.press(info());
  fireEvent.press(screen.getByLabelText(pl.courses.progressive.close));
  expect(header().props.accessibilityState.expanded).toBe(true);
  expect(screen.getByText("Zestaw")).toBeTruthy();
  expect(onPin).not.toHaveBeenCalled();

  fireEvent.press(info());
  fireEvent(screen.UNSAFE_getByType(Modal), "requestClose");
  expect(screen.queryByText(pl.courses.progressive.title)).toBeNull();
  expect(header().props.accessibilityState.expanded).toBe(true);
});

it("does not show an info button for non-progressive knowledge groups", () => {
  const screen = render(<CoursePinAccordion groups={[makeGroup()]} renderCourseCard={(course) => <Text key={course.id}>Zestaw</Text>} />);
  expect(screen.queryByLabelText(pl.courses.progressive.infoLabel)).toBeNull();
  fireEvent.press(screen.getByLabelText("Kategoria Flagi, 1 kursów"));
  expect(screen.queryByLabelText(pl.courses.progressive.infoLabel)).toBeNull();
});

it("shows the description belonging to the selected progressive group", () => {
  const screen = render(<CoursePinAccordion
    groups={[makeGroup("englishFromZero"), makeGroup("roadSigns"), makeGroup()]}
    renderCourseCard={(course) => <Text key={course.id}>Zestaw</Text>}
  />);
  const infoButtons = screen.getAllByLabelText(pl.courses.progressive.infoLabel);
  expect(infoButtons).toHaveLength(2);
  fireEvent.press(infoButtons[1]);
  expect(screen.getByText(pl.courses.progressive.roadSignsDescription)).toBeTruthy();
  expect(screen.queryByText(pl.courses.progressive.description)).toBeNull();
  fireEvent.press(screen.getByText(pl.courses.progressive.confirm));
  fireEvent.press(infoButtons[0]);
  expect(screen.getByText(pl.courses.progressive.description)).toBeTruthy();
  expect(screen.queryByText(pl.courses.progressive.roadSignsDescription)).toBeNull();
});

it("makes modal content scrollable by default", () => {
  const props = { visible: true, title: "Tytuł", description: "Opis", confirmLabel: "OK", onConfirm: jest.fn(), onClose: jest.fn() };
  const screen = render(<NudgeModal {...props} />);
  expect(screen.UNSAFE_getByType(ScrollView)).toBeTruthy();
  fireEvent.press(screen.getByText("OK"));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});
