import { fireEvent, render, within } from "@testing-library/react-native";
import { NudgeModal } from "../NudgeModal";
import { defaultValue } from "@/src/contexts/settings/defaults";
import * as ReactNative from "react-native";

jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/src/contexts/SettingsContext", () => {
  const { defaultValue } = jest.requireActual("@/src/contexts/settings/defaults");
  return { useSettings: () => defaultValue, useThemeSettings: () => defaultValue };
});

it("scrolls long content in a short window while keeping confirmation outside the scroll area", () => {
  const dimensions = jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
    width: 740, height: 320, scale: 1, fontScale: 2,
  });
  const onConfirm = jest.fn();
  try {
    const screen = render(<NudgeModal visible title="Reminder" description={"Long description ".repeat(80)} confirmLabel="Export" onConfirm={onConfirm} onClose={jest.fn()} />);
    const body = screen.UNSAFE_getByType(ReactNative.ScrollView);
    expect(within(body).getByText("Reminder")).toBeTruthy();
    expect(within(body).queryByText("Export")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Export" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  } finally {
    dimensions.mockRestore();
  }
});

it.each([undefined, "my_yellow", "my_red"] as const)("uses confirmColor %s and preserves modal actions", (confirmColor) => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const onSecondaryPress = jest.fn();
  const screen = render(<NudgeModal visible title="Reset" description="Details" confirmLabel="Run" closeLabel="Close" secondaryLabel="Cancel" onConfirm={onConfirm} onClose={onClose} onSecondaryPress={onSecondaryPress} confirmColor={confirmColor} />);
  expect(screen.getByRole("button", { name: "Run" })).toHaveStyle({ backgroundColor: defaultValue.colors[confirmColor ?? "my_green"] });
  fireEvent.press(screen.getByRole("button", { name: "Run" }));
  fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});
