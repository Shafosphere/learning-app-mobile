import { fireEvent, render } from "@testing-library/react-native";
import { Modal, ScrollView, Text } from "react-native";
import { CoursePinAccordion, type AccordionGroupItem } from "../CoursePinAccordion";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import pl from "@/src/locales/pl.json";

jest.mock("@/src/contexts/SettingsContext", () => {
  const { themeMap } = jest.requireActual<typeof import("@/src/theme/theme")>("@/src/theme/theme");
  return { useSettings: () => ({ colors: themeMap.light, fontScaleMultiplier: 1.6, accessibilityPreferences: {} }) };
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

const makeGroup = (languageGroupId?: AccordionGroupItem["languageGroupId"]): AccordionGroupItem => ({
  key: languageGroupId ?? "flags", title: languageGroupId ?? "Flagi", subtitle: "Opis", count: 1,
  languageGroupId,
  regularItems: [{
    id: 1, name: "Zestaw", iconId: "flag:es", iconColor: "#F97316", slug: "es_to_pl_first_50",
    sourceLang: "es", targetLang: "pl", cardsCount: 50, smallFlag: "pl", isMini: false,
  }],
  miniItems: [],
});

it.each(["englishFromZero", "frenchFromZero", "spanishFromZero"] as const)("shows info on collapsed and expanded %s without changing pin or expansion state", (id) => {
  const onPin = jest.fn();
  const screen = render(<CoursePinAccordion groups={[makeGroup(id)]} renderCourseCard={(course) => <Text key={course.id} onPress={onPin}>Zestaw</Text>} />);
  const header = () => screen.getByLabelText(`Kategoria ${id}, 1 kursów`);
  const info = () => screen.getByLabelText(pl.courses.progressive.infoLabel);
  expect(header().props.accessibilityState.expanded).toBe(false);
  fireEvent.press(info());
  expect(screen.getByText(pl.courses.progressive.description)).toBeTruthy();
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

it("does not show an info button for knowledge groups", () => {
  const screen = render(<CoursePinAccordion groups={[makeGroup()]} renderCourseCard={(course) => <Text key={course.id}>Zestaw</Text>} />);
  expect(screen.queryByLabelText(pl.courses.progressive.infoLabel)).toBeNull();
  fireEvent.press(screen.getByLabelText("Kategoria Flagi, 1 kursów"));
  expect(screen.queryByLabelText(pl.courses.progressive.infoLabel)).toBeNull();
});

it("keeps existing modals unscrollable and enables scrolling only when requested", () => {
  const props = { visible: true, title: "Tytuł", description: "Opis", confirmLabel: "OK", onConfirm: jest.fn(), onClose: jest.fn() };
  const screen = render(<NudgeModal {...props} />);
  expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
  screen.rerender(<NudgeModal {...props} scrollableContent />);
  expect(screen.UNSAFE_getByType(ScrollView)).toBeTruthy();
  fireEvent.press(screen.getByText("OK"));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});
