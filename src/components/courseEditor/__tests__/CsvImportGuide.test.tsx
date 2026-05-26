import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { CsvImportGuide } from "@/src/components/courseEditor/CsvImportGuide";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: "pl" },
    t: (key: string) => {
      const translations: Record<string, string> = {
        "courseCreator.csvGuide.pickFile": "Wybierz plik",
        "courseCreator.csvGuide.analyzing": "Analizuję...",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/src/theme/createThemeStylesHook", () => ({
  createThemeStylesHook: () => () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/src/components/button/button", () => {
  const React = jest.requireActual("react");
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: ({
    text,
    onPress,
    disabled,
  }: {
    text: string;
    onPress?: () => void;
    disabled?: boolean;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onPress}
      >
        <Text>{text}</Text>
      </Pressable>
    ),
  };
});

const defaultProps = {
  onPickFile: jest.fn(),
  onDownloadTemplate: jest.fn(),
  selectedFileName: null,
};

describe("CsvImportGuide file picker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows one generic file action and invokes its callback", () => {
    const screen = render(<CsvImportGuide {...defaultProps} />);

    expect(screen.getByText("Wybierz plik")).toBeTruthy();
    expect(screen.queryByText("Wybierz CSV")).toBeNull();
    expect(screen.queryByText("Wybierz TXT")).toBeNull();

    fireEvent.press(screen.getByLabelText("Wybierz plik"));
    expect(defaultProps.onPickFile).toHaveBeenCalledTimes(1);
  });

  it("disables the file action while analysis is running", () => {
    const screen = render(<CsvImportGuide {...defaultProps} isAnalyzing />);

    const button = screen.getByLabelText("Analizuję...");
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(defaultProps.onPickFile).not.toHaveBeenCalled();
  });
});
