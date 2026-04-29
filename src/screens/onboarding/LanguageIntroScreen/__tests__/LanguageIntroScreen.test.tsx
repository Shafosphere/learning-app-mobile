import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LanguageIntroScreen from "../LanguageIntroScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getOnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";

const mockReplace = jest.fn();
const setUiLanguage = jest.fn(() => Promise.resolve());
const setNativeLanguage = jest.fn(() => Promise.resolve());

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}));

jest.mock("@expo/vector-icons/Ionicons", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock("@/src/i18n", () => ({
  __esModule: true,
  default: {
    changeLanguage: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/src/constants/languageFlags", () => ({
  getFlagSource: jest.fn(() => ({ uri: "flag" })),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/services/onboardingCheckpoint", () => ({
  getOnboardingCheckpoint: jest.fn(),
  setOnboardingCheckpoint: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/src/components/button/button", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return function MockButton({
    text,
    onPress,
  }: {
    text: string;
    onPress?: () => void;
  }) {
    return <Text onPress={onPress}>{text}</Text>;
  };
});

jest.mock("../LanguageIntroScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedGetOnboardingCheckpoint = getOnboardingCheckpoint as jest.Mock;
const mockedSetOnboardingCheckpoint = setOnboardingCheckpoint as jest.Mock;

describe("LanguageIntroScreen onboarding checkpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSettings.mockReturnValue({
      uiLanguage: "pl",
      nativeLanguage: "pl",
      setUiLanguage,
      setNativeLanguage,
      colors: {
        headline: "#111",
      },
    });
  });

  it("moves from app language selection to native language selection", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("language_required");

    const screen = render(<LanguageIntroScreen />);

    fireEvent.press(screen.getByText("English"));
    fireEvent.press(screen.getByText("Next"));

    await waitFor(() => {
      expect(mockedSetOnboardingCheckpoint).toHaveBeenCalledWith(
        "native_language_required"
      );
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("moves from native language selection to course pinning", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("native_language_required");

    const screen = render(<LanguageIntroScreen />);

    await waitFor(() => {
      expect(screen.getByText("Twój język ojczysty")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Dalej"));

    await waitFor(() => {
      expect(setNativeLanguage).toHaveBeenCalledWith("pl");
      expect(mockedSetOnboardingCheckpoint).toHaveBeenCalledWith("pin_required");
      expect(mockReplace).toHaveBeenCalledWith("/createcourse");
    });
  });
});
