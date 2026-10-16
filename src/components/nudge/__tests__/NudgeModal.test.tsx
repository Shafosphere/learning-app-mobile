import { fireEvent, render } from "@testing-library/react-native";
import { NudgeModal } from "../NudgeModal";
import { defaultValue } from "@/src/contexts/settings/defaults";

jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/src/contexts/SettingsContext", () => {
  const { defaultValue } = jest.requireActual("@/src/contexts/settings/defaults");
  return { useSettings: () => defaultValue, useThemeSettings: () => defaultValue };
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
