import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

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
    t: (_key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "app.actions.next": "Next",
        "repeats.labels.english": "English",
        "repeats.labels.polish": "Polski",
      };
      return options?.defaultValue ?? translations[_key] ?? _key;
    },
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

function revealIntroContent() {
  act(() => {
    jest.advanceTimersByTime(50);
  });
}

describe("LanguageIntroScreen onboarding checkpoints", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedUseSettings.mockReturnValue({
      uiLanguage: "pl",
      nativeLanguage: "pl",
      setUiLanguage,
      setNativeLanguage,
      colors: {
        headline: "#111",
        my_green: "#00EBC7",
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it("moves from native language selection to Leitner screen", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("native_language_required");

    const screen = render(<LanguageIntroScreen />);

    await waitFor(() => {
      expect(screen.getByText("Twój język ojczysty")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Dalej"));

    await waitFor(() => {
      expect(setNativeLanguage).toHaveBeenCalledWith("pl");
      expect(mockedSetOnboardingCheckpoint).toHaveBeenCalledWith("leitner_required");
      expect(screen.getByText("Zapamiętuj więcej")).toBeTruthy();
    });
    revealIntroContent();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders the combined Leitner illustration", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("leitner_required");

    const screen = render(<LanguageIntroScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("leitner-diagram")).toBeTruthy();
    });
    revealIntroContent();
  });

  it("does not render arrow diagram on beta screen", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("beta_required");

    const screen = render(<LanguageIntroScreen />);

    await waitFor(() => {
      expect(screen.getByText("Tworzysz Memicard razem ze mną")).toBeTruthy();
    });
    revealIntroContent();
    expect(screen.queryByTestId("leitner-diagram")).toBeNull();
  });

  it("moves from Leitner screen to course pinning", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("leitner_required");

    const screen = render(<LanguageIntroScreen />);

    await waitFor(() => {
      expect(screen.getByText("Zapamiętuj więcej")).toBeTruthy();
    });
    revealIntroContent();
    fireEvent.press(screen.getByText("Zaczynajmy"));

    await waitFor(() => {
      expect(mockedSetOnboardingCheckpoint).toHaveBeenCalledWith("pin_required");
      expect(mockReplace).toHaveBeenCalledWith("/createcourse");
    });
  });

  it("renders Leitner copy together under the title", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("leitner_required");

    const screen = render(<LanguageIntroScreen />);

    await waitFor(() => {
      expect(screen.getByText("Zapamiętuj więcej")).toBeTruthy();
    });
    revealIntroContent();

    expect(screen.getByTestId("leitner-intro-description")).toHaveTextContent(
      /Memicard oparty jest na systemie Leitnera\./
    );
    expect(screen.getByTestId("leitner-intro-description")).toHaveTextContent(
      /Trudne fiszki wracają częściej\. Te, które znasz — coraz rzadziej\. Wszystko dzięki prostemu systemowi pudełek\./
    );
  });

  it("shows English Leitner copy for English UI", async () => {
    mockedUseSettings.mockReturnValue({
      uiLanguage: "en",
      nativeLanguage: "pl",
      setUiLanguage,
      setNativeLanguage,
      colors: {
        headline: "#111",
        my_green: "#00EBC7",
      },
    });
    mockedGetOnboardingCheckpoint.mockResolvedValue("leitner_required");

    const screen = render(<LanguageIntroScreen />);

    await waitFor(() => {
      expect(screen.getByText("Remember more")).toBeTruthy();
      expect(screen.getByTestId("leitner-intro-description")).toHaveTextContent(
        /Memicard is based on the Leitner system\./
      );
      expect(screen.getByText("Let's start")).toBeTruthy();
    });
    revealIntroContent();
  });
});
