import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import LeitnerIntroScreen from "../LeitnerIntroScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";

const mockReplace = jest.fn();

jest.mock("react-native-safe-area-context", () =>
  jest.requireActual("react-native-safe-area-context/jest/mock").default
);

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = jest.fn();
  return { useSettings, useThemeSettings: useSettings };
});
jest.mock("@/src/services/onboardingCheckpoint", () => ({
  setOnboardingCheckpoint: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/src/components/button/button", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return function MockButton({ text, onPress }: { text: string; onPress: () => void }) {
    return <Text onPress={onPress}>{text}</Text>;
  };
});

const mockedUseSettings = useSettings as jest.Mock;
const mockedSetCheckpoint = setOnboardingCheckpoint as jest.Mock;

function renderIntro(screen: React.ReactElement) {
  const result = render(screen);
  act(() => {
    jest.advanceTimersByTime(50);
  });
  const layout = (testID: string, width: number, height: number) => {
    fireEvent(result.getByTestId(testID, { includeHiddenElements: true }), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width, height } },
    });
  };
  layout("onboarding-intro-content", 390, 760);
  layout("onboarding-intro-scroll", 354, 684);
  layout("onboarding-intro-body", 354, 330);
  return result;
}

describe("onboarding intro screens", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedUseSettings.mockReturnValue({
      uiLanguage: "pl",
      colors: {
        background: "#f0f1f4",
        headline: "#123",
        paragraph: "#345",
        secondBackground: "#fff",
      },
      accessibilityPreferences: {},
      fontScaleMultiplier: 1,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses the shared card, footer and illustration on Leitner", () => {
    const screen = renderIntro(<LeitnerIntroScreen />);

    expect(screen.getByTestId("onboarding-intro-message")).toBeTruthy();
    expect(screen.getByTestId("onboarding-intro-footer")).toBeTruthy();
    expect(screen.getByTestId("leitner-diagram")).toBeTruthy();
    expect(screen.getByTestId("leitner-intro-description")).toHaveTextContent(
      /Memicard oparty jest na systemie Leitnera/
    );
  });

  it("moves Leitner forward to course pinning", async () => {
    const screen = renderIntro(<LeitnerIntroScreen />);
    fireEvent.press(screen.getByText("Zaczynajmy"));

    await waitFor(() => {
      expect(mockedSetCheckpoint).toHaveBeenCalledWith("pin_required");
      expect(mockReplace).toHaveBeenCalledWith("/createcourse");
    });
  });
});
