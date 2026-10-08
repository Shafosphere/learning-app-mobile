import React from "react";
import { createInstance } from "i18next";
import { View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { DEFAULT_LETTER_HINT_SETTINGS } from "@/src/utils/letterHints";
import { useSettings } from "@/src/contexts/SettingsContext";
import { resolveThemeColors } from "@/src/theme/theme";
import pl from "@/src/locales/pl.json";
import { CourseSettingsSection, type CourseSettingsSectionProps } from "../SettingsCourse";

const mockT = jest.fn((key: string) => key);
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: jest.fn() }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);

beforeEach(() => {
  mockT.mockImplementation((key: string) => key);
  (useSettings as jest.Mock).mockReturnValue({
    colors: resolveThemeColors("light"),
    accessibilityPreferences: { highContrastEnabled: false, colorBlindMode: "none" },
    fontScaleMultiplier: 1,
  });
});

function makeProps(): CourseSettingsSectionProps {
  return {
    styles: {}, colors: resolveThemeColors("light"),
    switchColors: { thumb: "#fff", trackFalse: "#aaa", trackTrue: "#000" },
    boxZeroEnabled: false, onToggleBoxZero: jest.fn(),
    boxZeroAnswerSide: "front", onSelectBoxZeroAnswerSide: jest.fn(),
    autoflowEnabled: false, onToggleAutoflow: jest.fn(),
    reviewsEnabled: false, onToggleReviews: jest.fn(),
    showExplanationEnabled: false, onToggleShowExplanation: jest.fn(),
    explanationOnlyOnWrong: true, onToggleExplanationOnlyOnWrong: jest.fn(),
    skipCorrectionEnabled: false, onToggleSkipCorrection: jest.fn(),
    trueFalseButtonsVariant: "true_false", onSelectTrueFalseButtonsVariant: jest.fn(),
    cardSize: "large", onSelectCardSize: jest.fn(),
  };
}

it("toggles from the row title and description and exposes one switch per row", () => {
  const props = makeProps();
  const screen = render(<CourseSettingsSection {...props} />);
  const label = "components.courseEditor.settingsCourse.accessibilityLabel.przelaczAutomatFiszek";

  fireEvent.press(screen.getByText("components.courseEditor.settingsCourse.title.automatFiszek"));
  expect(props.onToggleAutoflow).toHaveBeenCalledTimes(1);
  expect(props.onToggleAutoflow).toHaveBeenLastCalledWith(true);
  expect(screen.getAllByRole("switch", { name: label })).toHaveLength(1);

  screen.rerender(<CourseSettingsSection {...props} autoflowEnabled />);
  fireEvent.press(screen.getByText("components.courseEditor.settingsCourse.description.automatyczniePrzelaczaj"));
  expect(props.onToggleAutoflow).toHaveBeenCalledTimes(2);
  expect(props.onToggleAutoflow).toHaveBeenLastCalledWith(false);
});

it("keeps the entire locked row disabled", () => {
  const props = makeProps();
  const screen = render(<CourseSettingsSection {...props} skipCorrectionLocked />);

  fireEvent.press(screen.getByText("components.courseEditor.settingsCourse.title.pominPoprawkePoBledzie"));
  expect(props.onToggleSkipCorrection).not.toHaveBeenCalled();
  expect(screen.getByRole("switch", {
    name: "components.courseEditor.settingsCourse.accessibilityLabel.przelaczPomijaniePoprawkiPoBledzie",
    checked: true,
  })).toBeDisabled();
});

it("hides dependent options while disabled and preserves their selections across toggles", () => {
  const onSelect = jest.fn();
  const props = makeProps();
  props.onSelectBoxZeroAnswerSide = onSelect;
  const screen = render(<CourseSettingsSection {...props} />);
  const label = "components.courseEditor.settingsCourse.boxZeroAnswerSide.";
  const explanationLabel = "components.courseEditor.settingsCourse.accessibilityLabel.przelaczWyjasnienieTylkoPoBlednej";
  expect(screen.queryByText(label + "title")).toBeNull();
  expect(screen.queryByRole("button", { name: new RegExp(label + "front") })).toBeNull();
  expect(screen.queryByRole("button", { name: new RegExp(label + "back") })).toBeNull();
  expect(screen.queryByRole("switch", { name: explanationLabel })).toBeNull();
  expect(onSelect).not.toHaveBeenCalled();
  expect(props.onToggleExplanationOnlyOnWrong).not.toHaveBeenCalled();
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled showExplanationEnabled />);
  expect(screen.getByRole("button", { name: new RegExp(label + "front"), selected: true })).toBeEnabled();
  expect(screen.getByRole("switch", { name: explanationLabel, checked: true })).toBeEnabled();
  fireEvent.press(screen.getByRole("switch", { name: explanationLabel }));
  expect(props.onToggleExplanationOnlyOnWrong).toHaveBeenCalledWith(false);
  fireEvent.press(screen.getByText(label + "back"));
  expect(onSelect).toHaveBeenCalledWith("back");
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="back" />);
  screen.rerender(<CourseSettingsSection {...props} boxZeroAnswerSide="back" />);
  expect(screen.queryByText(label + "title")).toBeNull();
  expect(screen.queryByRole("switch", { name: explanationLabel })).toBeNull();
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="back" showExplanationEnabled />);
  expect(screen.getByRole("button", { name: new RegExp(label + "back"), selected: true })).toBeEnabled();
  expect(screen.getByRole("switch", { name: explanationLabel, checked: true })).toBeEnabled();
});


it("changes profiles and custom limits while preserving choices when toggled off", () => {
  const onChange = jest.fn();
  const props = { ...makeProps(), onChangeLetterHintSettings: onChange };
  const screen = render(<CourseSettingsSection {...props} letterHintSettings={DEFAULT_LETTER_HINT_SETTINGS} />);
  expect(screen.queryByText("courseLetterHints.profileTitle")).toBeNull();
  fireEvent.press(screen.getByRole("switch", { name: "courseLetterHints.toggleLabel" }));
  const standard = { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true };
  expect(onChange).toHaveBeenLastCalledWith(standard);
  screen.rerender(<CourseSettingsSection {...props} letterHintSettings={standard} />);
  fireEvent.press(screen.getByText("courseLetterHints.profiles.stronger"));
  const stronger = { ...standard, profile: "stronger" as const, boxOneLimit: 3, boxTwoLimit: 2 };
  expect(onChange).toHaveBeenLastCalledWith(stronger);
  screen.rerender(<CourseSettingsSection {...props} letterHintSettings={stronger} />);
  fireEvent.press(screen.getByText("courseLetterHints.profiles.custom"));
  const custom = { ...stronger, profile: "custom" as const };
  expect(onChange).toHaveBeenLastCalledWith(custom);
  screen.rerender(<CourseSettingsSection {...props} letterHintSettings={custom} />);
  fireEvent.press(screen.getAllByText("0")[1]);
  const customized = { ...custom, boxTwoLimit: 0 };
  expect(onChange).toHaveBeenLastCalledWith(customized);
  screen.rerender(<CourseSettingsSection {...props} letterHintSettings={customized} />);
  fireEvent.press(screen.getByRole("switch", { name: "courseLetterHints.toggleLabel" }));
  expect(onChange).toHaveBeenLastCalledWith({ ...customized, enabled: false });
  screen.rerender(<CourseSettingsSection {...props} letterHintSettings={{ ...customized, enabled: false }} />);
  expect(screen.queryByText("courseLetterHints.profileTitle")).toBeNull();
  fireEvent.press(screen.getByRole("switch", { name: "courseLetterHints.toggleLabel" }));
  expect(onChange).toHaveBeenLastCalledWith(customized);
});

it("blocks changes before course settings have loaded", () => {
  const onChange = jest.fn();
  const screen = render(<CourseSettingsSection {...makeProps()} onChangeLetterHintSettings={onChange} letterHintSettingsDisabled />);
  const toggle = screen.getByRole("switch", { name: "courseLetterHints.toggleLabel" });
  expect(toggle).toBeDisabled();
  fireEvent.press(toggle);
  expect(onChange).not.toHaveBeenCalled();
});

describe("size settings", () => {
  const copy = pl.components.courseEditor.settingsCourse;
  const imageOptions: NonNullable<CourseSettingsSectionProps["imageSizeOptions"]> = [
    "dynamic", "small", "medium", "large", "very_large",
  ];
  const imageTitles = [copy.title.dynamiczny, copy.title.maly, copy.title.sredni, copy.title.duzy, copy.title.bardzoDuzy];

  beforeEach(() => {
    mockT.mockImplementation((key: string) => {
      const value = key.split(".").reduce<unknown>((current, part) => (
        current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined
      ), pl);
      return typeof value === "string" ? value : key;
    });
  });

  it.each([
    ["large", copy.title.duza, copy.subtitle.kartaRozszerzaSie],
    ["small", copy.title.mala, copy.subtitle.tekstZostaje],
  ] as const)("keeps %s flashcards controlled and announces selection", (value, title, subtitle) => {
    const props = makeProps();
    const screen = render(<CourseSettingsSection {...props} cardSize={value === "large" ? "small" : "large"} />);
    const name = `${copy.title.rozmiarFiszki}, ${title}, ${subtitle}`;
    fireEvent.press(screen.getByRole("button", { name, selected: false }));
    expect(props.onSelectCardSize).toHaveBeenCalledWith(value);
    expect(screen.getByRole("button", { name, selected: false })).toBeEnabled();
    screen.rerender(<CourseSettingsSection {...props} cardSize={value} />);
    expect(screen.getByRole("button", { name, selected: true })).toBeEnabled();
    expect(screen.getAllByRole("button", { selected: true })).toHaveLength(1);
  });

  it.each(imageOptions)("selects and announces %s image size without changing card size", (value) => {
    const onSelectImageSize = jest.fn();
    const props = { ...makeProps(), showImageSizeOptions: true, imageSizeEnabled: true, imageSizeOptions: imageOptions, onSelectImageSize };
    const screen = render(<CourseSettingsSection {...props} imageSize="dynamic" />);
    const name = new RegExp(`${copy.title.rozmiarObrazu}, ${imageTitles[imageOptions.indexOf(value)]},`);
    fireEvent.press(screen.getByRole("button", { name }));
    expect(onSelectImageSize).toHaveBeenCalledWith(value);
    expect(props.onSelectCardSize).not.toHaveBeenCalled();
    screen.rerender(<CourseSettingsSection {...props} imageSize={value} />);
    expect(screen.getByRole("button", { name, selected: true })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: new RegExp(copy.title.rozmiarObrazu), selected: true })).toHaveLength(1);
  });

  it("preserves disabled image selection, hint and option availability", () => {
    const onSelectImageSize = jest.fn();
    const props = { ...makeProps(), showImageSizeOptions: true, imageSize: "medium" as const, imageSizeOptions: imageOptions, onSelectImageSize };
    const screen = render(<CourseSettingsSection {...props} />);
    const name = new RegExp(`${copy.title.rozmiarObrazu}, ${copy.title.sredni},`);
    expect(screen.getByText(copy.hint.dostepneTylkoDlaDuzych)).toBeTruthy();
    for (const option of screen.getAllByRole("button", { name: new RegExp(copy.title.rozmiarObrazu) })) {
      expect(option).toBeDisabled();
      fireEvent.press(option);
    }
    expect(onSelectImageSize).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name, selected: true })).toBeDisabled();
    screen.rerender(<CourseSettingsSection {...props} imageSizeEnabled />);
    expect(screen.queryByText(copy.hint.dostepneTylkoDlaDuzych)).toBeNull();
    expect(screen.getByRole("button", { name, selected: true })).toBeEnabled();
    screen.rerender(<CourseSettingsSection {...props} imageSizeEnabled onSelectImageSize={undefined} />);
    expect(screen.getByRole("button", { name, selected: true })).toBeDisabled();
    fireEvent.press(screen.getByRole("button", { name }));
    expect(onSelectImageSize).not.toHaveBeenCalled();
  });

  it("keeps image settings hidden and respects supplied options and existing defaults", () => {
    const props = makeProps();
    const screen = render(<CourseSettingsSection {...props} />);
    expect(screen.queryByRole("header", { name: copy.title.rozmiarObrazu })).toBeNull();
    screen.rerender(<CourseSettingsSection {...props} showImageSizeOptions />);
    expect(screen.getAllByRole("button", { name: new RegExp(copy.title.rozmiarObrazu) })).toHaveLength(4);
    expect(screen.queryByText(copy.title.bardzoDuzy)).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(copy.title.dynamiczny), selected: true })).toBeTruthy();
    screen.rerender(<CourseSettingsSection {...props} showImageSizeOptions imageSizeOptions={["very_large"]} imageSize="very_large" />);
    expect(screen.getAllByRole("button", { name: new RegExp(copy.title.rozmiarObrazu) })).toHaveLength(1);
    expect(screen.getByRole("button", { name: new RegExp(copy.title.bardzoDuzy), selected: true })).toBeTruthy();
  });

  it.each([
    ["light", false, "none"],
    ["dark", false, "none"],
    ["light", true, "none"],
    ["dark", true, "none"],
    ["light", false, "deuteranopia"],
    ["dark", false, "tritanopia"],
  ] as const)("uses %s theme with high contrast %s and color-blind mode %s at larger font sizes", (theme, highContrast, colorBlindMode) => {
    const colors = resolveThemeColors(theme, { highContrast, colorBlindMode });
    (useSettings as jest.Mock).mockReturnValue({
      colors,
      accessibilityPreferences: { highContrastEnabled: highContrast, colorBlindMode },
      fontScaleMultiplier: 1.15,
    });
    const screen = render(<CourseSettingsSection {...makeProps()} colors={colors} showImageSizeOptions imageSizeOptions={imageOptions} />);
    expect(screen.getByText(copy.title.rozmiarFiszki)).toHaveStyle({ color: colors.headline, fontSize: 16 * 1.15 });
    expect(screen.getByText(copy.title.bardzoDuzy)).toHaveStyle({ color: colors.headline, fontSize: 16 * 1.15 });
    const description = screen.getByText(copy.subtitle.stoSiedemdziesiatProcent);
    expect(description).toHaveStyle({ color: colors.paragraph, fontSize: 13 * 1.15 });
    expect(description.props.allowFontScaling).not.toBe(false);
    expect(description.props.numberOfLines).toBeUndefined();
    expect(screen.getByRole("button", { name: new RegExp(copy.title.dynamiczny), selected: true })).toBeDisabled();
  });
});


describe("letter hint cards", () => {
  beforeEach(() => {
    const translations = createInstance();
    void translations.init({ lng: "pl", resources: { pl: { translation: pl } }, initImmediate: false });
    mockT.mockImplementation((key: string, options?: Record<string, unknown>) => translations.t(key, options));
  });

  it.each([
    ["gentle", "Delikatny", 1, 0],
    ["standard", "Standardowy", 2, 1],
    ["stronger", "Mocniejszy", 3, 2],
    ["custom", "Własny", 2, 1],
  ] as const)("keeps %s controlled and announces a single selected profile", (profile, label, boxOneLimit, boxTwoLimit) => {
    const onChange = jest.fn();
    const props = { ...makeProps(), onChangeLetterHintSettings: onChange };
    const settings = { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true };
    const screen = render(<CourseSettingsSection {...props} letterHintSettings={settings} />);
    expect(screen.getByRole("header", { name: "Siła podpowiedzi" })).toBeTruthy();
    expect(screen.getByText("Określ, ile liter może odsłonić podpowiedź.")).toBeTruthy();
    fireEvent.press(screen.getByRole("radio", { name: label }));
    const selected = { ...settings, profile, boxOneLimit, boxTwoLimit };
    expect(onChange).toHaveBeenCalledWith(selected);
    screen.rerender(<CourseSettingsSection {...props} letterHintSettings={selected} />);
    expect(screen.getByRole("radio", { name: label, checked: true })).toBeEnabled();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(screen.queryByText("Podgląd podpowiedzi")).toBeNull();
  });

  it("announces explicit letter units and no-help limits and blocks disabled cards and custom controls", () => {
    const onChange = jest.fn();
    const props = { ...makeProps(), onChangeLetterHintSettings: onChange, letterHintSettingsDisabled: true };
    const screen = render(<CourseSettingsSection {...props} letterHintSettings={{ enabled: true, profile: "custom", boxOneLimit: 3, boxTwoLimit: 0 }} />);
    expect(screen.getByRole("radio", { name: "Delikatny" }).props.accessibilityHint).toBe("Pudełko 1: do 1 litery. Pudełko 2: bez podpowiedzi");
    for (const card of screen.getAllByRole("radio")) {
      expect(card).toBeDisabled();
      fireEvent.press(card);
    }
    const limit = screen.getByRole("button", { name: "Pudełko 2. Limit liter: 0.", selected: true });
    expect(limit).toBeDisabled();
    fireEvent.press(limit);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    [320, "light", false, "none"],
    [360, "dark", false, "none"],
    [320, "light", true, "none"],
    [360, "dark", true, "none"],
    [320, "light", false, "deuteranopia"],
    [360, "dark", false, "tritanopia"],
  ] as const)("renders complete scalable text at %sdp with %s theme, high contrast %s and color-blind mode %s", (width, theme, highContrast, colorBlindMode) => {
    const colors = resolveThemeColors(theme, { highContrast, colorBlindMode });
    (useSettings as jest.Mock).mockReturnValue({
      colors,
      accessibilityPreferences: { highContrastEnabled: highContrast, colorBlindMode },
      fontScaleMultiplier: 1.15,
    });
    const screen = render(
      <View style={{ width }}>
        <CourseSettingsSection {...makeProps()} colors={colors} onChangeLetterHintSettings={jest.fn()} letterHintSettings={{ ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true }} />
      </View>,
    );
    const heading = screen.getByRole("header", { name: "Siła podpowiedzi" });
    expect(heading).toHaveStyle({ color: colors.headline, fontSize: 16 * 1.15, textTransform: "none" });
    const descriptions = screen.getAllByText("Pudełko 1: do 2 liter");
    for (const description of descriptions) {
      expect(description).toHaveStyle({ color: colors.paragraph, fontSize: 13 * 1.15 });
      expect(description.props.allowFontScaling).not.toBe(false);
      expect(description.props.numberOfLines).toBeUndefined();
    }
    expect(screen.getByRole("radio", { name: "Standardowy", checked: true })).toBeEnabled();
  });
});


describe("box zero settings cards", () => {
  const copy = pl.components.courseEditor.settingsCourse;
  const switchLabel = copy.accessibilityLabel.przelaczFazeZapoznania;
  const frontLabel = `${copy.boxZeroAnswerSide.title}, ${copy.boxZeroAnswerSide.front}, ${copy.boxZeroAnswerSide.frontDescription}`;
  const backLabel = `${copy.boxZeroAnswerSide.title}, ${copy.boxZeroAnswerSide.back}, ${copy.boxZeroAnswerSide.backDescription}`;

  beforeEach(() => {
    const translations = createInstance();
    void translations.init({ lng: "pl", resources: { pl: { translation: pl } }, initImmediate: false });
    mockT.mockImplementation((key: string, options?: Record<string, unknown>) => translations.t(key, options));
  });

  it("toggles the introduction without resetting the chosen side", () => {
    const props = makeProps();
    const screen = render(<CourseSettingsSection {...props} boxZeroAnswerSide="front" />);
    expect(screen.getByText(copy.title.fazaZapoznaniaPudelko0)).toBeTruthy();
    expect(screen.queryByRole("header", { name: copy.boxZeroAnswerSide.title })).toBeNull();
    fireEvent.press(screen.getByRole("switch", { name: switchLabel, checked: false }));
    expect(props.onToggleBoxZero).toHaveBeenCalledWith(true);
    expect(props.onSelectBoxZeroAnswerSide).not.toHaveBeenCalled();
    screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="front" />);
    expect(screen.getByRole("button", { name: frontLabel, selected: true })).toBeEnabled();
    fireEvent.press(screen.getByRole("switch", { name: switchLabel, checked: true }));
    expect(props.onToggleBoxZero).toHaveBeenLastCalledWith(false);
    screen.rerender(<CourseSettingsSection {...props} boxZeroAnswerSide="front" />);
    expect(screen.queryByRole("button", { name: frontLabel })).toBeNull();
    screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="front" />);
    expect(screen.getByRole("button", { name: frontLabel, selected: true })).toBeEnabled();
  });

  it("defaults to the back and keeps card selection controlled", () => {
    const props = makeProps();
    const screen = render(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide={undefined} />);
    expect(screen.getByRole("button", { name: backLabel, selected: true })).toBeEnabled();
    fireEvent.press(screen.getByRole("button", { name: frontLabel, selected: false }));
    expect(props.onSelectBoxZeroAnswerSide).toHaveBeenCalledWith("front");
    expect(screen.getByRole("button", { name: backLabel, selected: true })).toBeEnabled();
    screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="front" />);
    expect(screen.getByRole("button", { name: frontLabel, selected: true })).toBeEnabled();
    expect(screen.getByRole("button", { name: backLabel, selected: false })).toBeEnabled();
    fireEvent.press(screen.getByRole("button", { name: backLabel }));
    expect(props.onSelectBoxZeroAnswerSide).toHaveBeenLastCalledWith("back");
    expect(props.onToggleBoxZero).not.toHaveBeenCalled();
  });

  it("disables both cards without a selection callback while preserving the switch", () => {
    const props = makeProps();
    const screen = render(<CourseSettingsSection {...props} boxZeroEnabled onSelectBoxZeroAnswerSide={undefined} />);
    for (const label of [frontLabel, backLabel]) {
      const card = screen.getByRole("button", { name: label });
      expect(card).toBeDisabled();
      fireEvent.press(card);
    }
    fireEvent.press(screen.getByRole("switch", { name: switchLabel }));
    expect(props.onToggleBoxZero).toHaveBeenCalledWith(false);
    expect(props.onSelectBoxZeroAnswerSide).not.toHaveBeenCalled();
  });

  it.each([
    [320, "light", false, "none"],
    [360, "dark", false, "none"],
    [390, "light", true, "none"],
    [768, "dark", true, "none"],
    [320, "light", false, "deuteranopia"],
    [390, "dark", false, "tritanopia"],
  ] as const)("keeps complete text and accessible options at %sdp in %s theme with contrast %s and color-blind mode %s", (width, theme, highContrast, colorBlindMode) => {
    const colors = resolveThemeColors(theme, { highContrast, colorBlindMode });
    (useSettings as jest.Mock).mockReturnValue({
      colors,
      accessibilityPreferences: { highContrastEnabled: highContrast, colorBlindMode },
      fontScaleMultiplier: 1.15,
    });
    const screen = render(<View style={{ width }}><CourseSettingsSection {...makeProps()} colors={colors} boxZeroEnabled /></View>);
    const heading = screen.getByText(copy.title.fazaZapoznaniaPudelko0);
    expect(heading.props.numberOfLines).toBeUndefined();
    expect(heading.props.allowFontScaling).not.toBe(false);
    for (const label of [frontLabel, backLabel]) {
      expect(screen.getByRole("button", { name: label })).toBeEnabled();
    }
    const description = screen.getByText(copy.boxZeroAnswerSide.frontDescription);
    expect(description).toHaveStyle({ fontSize: 13 * 1.15, color: colors.paragraph });
    expect(description.props.numberOfLines).toBeUndefined();
    expect(description.props.allowFontScaling).not.toBe(false);
  });
});
