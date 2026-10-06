import { fireEvent, render, screen } from "@testing-library/react-native";
import { FlatList, Image, StyleSheet } from "react-native";
import HomeScreen from "../HomeScreen";

let mockWindowDimensions = { width: 412, height: 915, scale: 1, fontScale: 1 };
let mockLanguage = "pl";
let mockIsFocused = true;
let mockFontScaleMultiplier = 1;
let mockQuotes = [
  { text: "Pierwszy cytat", author: "Autor pierwszy" },
  { text: "Drugi cytat", author: "Autor drugi" },
];
const mockPush = jest.fn();
const mockTranslate = jest.fn((key: string, options?: { returnObjects?: boolean; lng?: string }) => {
  if (options?.returnObjects) {
    return mockQuotes.map((quote) => ({ ...quote, text: `${options.lng}: ${quote.text}` }));
  }
  return key;
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@react-navigation/native", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      mockReact.useEffect(() => {
        if (mockIsFocused) return effect();
      }, [effect, mockIsFocused]);
    },
  };
});

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return new Proxy(RN, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      if (prop === "useWindowDimensions") return () => mockWindowDimensions;
      return target[prop as keyof typeof target];
    },
  });
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockTranslate,
    i18n: { language: mockLanguage, resolvedLanguage: mockLanguage },
  }),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    colors: { background: "#eee", secondBackground: "#fff", headline: "#123", paragraph: "#456" },
    accessibilityPreferences: {},
    fontScaleMultiplier: mockFontScaleMultiplier,
  }),
}));

function measureGrid(width: number, height: number) {
  fireEvent(screen.getByTestId("home-grid-viewport"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
}

function getListProps() {
  return screen.UNSAFE_getByType(FlatList).props;
}

function quoteSelectionCount() {
  return mockTranslate.mock.calls.filter(([, options]) => options?.returnObjects).length;
}

describe("HomeScreen responsive grid", () => {
  beforeEach(() => {
    mockWindowDimensions = { width: 412, height: 915, scale: 1, fontScale: 1 };
    mockLanguage = "pl";
    mockIsFocused = true;
    mockFontScaleMultiplier = 1;
    mockQuotes = [
      { text: "Pierwszy cytat", author: "Autor pierwszy" },
      { text: "Drugi cytat", author: "Autor drugi" },
    ];
    mockPush.mockClear();
    mockTranslate.mockClear();
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => jest.restoreAllMocks());

  it("waits for a measured viewport, then renders five square buttons and a hidden sixth slot", () => {
    render(<HomeScreen />);
    expect(screen.queryByTestId("home-grid")).toBeNull();
    measureGrid(372, 590);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    for (const button of buttons) {
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({ width: 178, height: 178 });
    }
    const placeholder = screen.getByTestId("home-tile-placeholder", { includeHiddenElements: true });
    expect(StyleSheet.flatten(placeholder.props.style)).toMatchObject({ width: 178, height: 178, opacity: 0 });
    expect(placeholder.props.pointerEvents).toBe("none");
    expect(placeholder.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(getListProps().numColumns).toBe(2);
    expect(getListProps().scrollEnabled).toBe(false);
  });

  it("uses measured height instead of full screen height and updates after rotation", () => {
    mockWindowDimensions = { width: 900, height: 1200, scale: 1, fontScale: 1 };
    const { rerender } = render(<HomeScreen />);
    measureGrid(756, 710);
    expect(StyleSheet.flatten(getListProps().style)).toMatchObject({ width: 456, alignSelf: "center" });
    expect(getListProps().scrollEnabled).toBe(false);
    expect(StyleSheet.flatten(screen.getAllByRole("button")[0].props.style).height).toBe(218);

    mockWindowDimensions = { width: 1200, height: 900, scale: 1, fontScale: 1 };
    rerender(<HomeScreen />);
    measureGrid(1056, 440);
    expect(getListProps().scrollEnabled).toBe(true);
    expect(StyleSheet.flatten(getListProps().style).width).toBe(340);
    expect(StyleSheet.flatten(screen.getAllByRole("button")[0].props.style).height).toBe(160);

    measureGrid(756, 710);
    expect(getListProps().scrollEnabled).toBe(false);
  });

  it("allows the small phone's final row to be reached by scrolling", () => {
    mockWindowDimensions = { width: 360, height: 640, scale: 1, fontScale: 1 };
    render(<HomeScreen />);
    measureGrid(320, 430);
    expect(getListProps().scrollEnabled).toBe(true);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(StyleSheet.flatten(getListProps().style).width).toBe(319);
    expect(StyleSheet.flatten(getListProps().contentContainerStyle).paddingBottom).toBe(16);
  });

  it("accounts for system and app text enlargement without shrinking touch targets", () => {
    mockWindowDimensions = { width: 900, height: 1200, scale: 1, fontScale: 1.2 };
    mockFontScaleMultiplier = 1.15;
    render(<HomeScreen />);
    measureGrid(756, 590);
    expect(StyleSheet.flatten(screen.getAllByRole("button")[0].props.style).height).toBe(221);
    expect(getListProps().scrollEnabled).toBe(true);
  });

  it.each([
    [false, 372, 590, 90],
    [true, 756, 440, 86.4],
    [true, 756, 1000, 129.6],
  ])("sizes icons from the actual square (tablet: %p)", (tablet, width, height, iconSize) => {
    if (tablet) mockWindowDimensions = { width: 900, height: 1200, scale: 1, fontScale: 1 };
    render(<HomeScreen />);
    measureGrid(width, height);
    const image = screen.UNSAFE_getAllByType(Image)[0];
    const iconStyle = StyleSheet.flatten(image.parent!.props.style);
    expect(iconStyle.width).toBeCloseTo(iconSize);
    expect(iconStyle.height).toBeCloseTo(iconSize);
  });

  it("keeps its quote through measurements and selects again on refocus and language change", () => {
    const { rerender } = render(<HomeScreen />);
    expect(screen.getByText("pl: Pierwszy cytat")).toBeTruthy();
    measureGrid(372, 590);
    measureGrid(372, 540);
    expect(quoteSelectionCount()).toBe(1);
    expect(screen.getByText("pl: Pierwszy cytat")).toBeTruthy();

    mockIsFocused = false;
    rerender(<HomeScreen />);
    jest.mocked(Math.random).mockReturnValue(0.99);
    mockIsFocused = true;
    rerender(<HomeScreen />);
    expect(screen.getByText("pl: Drugi cytat")).toBeTruthy();
    expect(quoteSelectionCount()).toBe(2);

    mockLanguage = "en";
    rerender(<HomeScreen />);
    expect(screen.getByText("en: Drugi cytat")).toBeTruthy();
    expect(quoteSelectionCount()).toBe(3);
  });

  it("handles a missing quote translation", () => {
    mockQuotes = [];
    render(<HomeScreen />);
    measureGrid(372, 590);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("keeps every destination and long translated label after resizing", () => {
    render(<HomeScreen />);
    measureGrid(372, 590);
    measureGrid(372, 540);
    const routes = ["/coursepanel", "/custom_course", "/stats", "/wiki", "/support"];
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button, index) => {
      expect(button.props.accessibilityLabel.length).toBeGreaterThan(40);
      fireEvent.press(button);
      expect(mockPush).toHaveBeenNthCalledWith(index + 1, routes[index]);
    });
  });
});
