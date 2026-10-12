import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import ToggleRow from "../ToggleRow";

jest.mock("../ToggleSwitch-styles", () => ({ useStyles: () => ({}) }));

describe("ToggleRow", () => {
  it.each([false, true])("handles all press targets with disabled=%s", (disabled) => {
    const onPress = jest.fn();
    const screen = render(
      <ToggleRow value={false} onPress={onPress} disabled={disabled} accessibilityLabel="Setting" testID="row">
        <Text>Setting description</Text>
      </ToggleRow>,
    );
    const row = screen.getByRole("switch", { name: "Setting" });
    // Exercise the decorative switch itself, its text sibling and row background.
    const control = row.findByProps({ pointerEvents: "none" });
    for (const target of [screen.getByText("Setting description"), row, control]) {
      onPress.mockClear();
      fireEvent.press(target);
      expect(onPress).toHaveBeenCalledTimes(disabled ? 0 : 1);
    }
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(row).toHaveAccessibilityState({ checked: false, disabled });
  });

  it("reflects controlled state without changing it on press", () => {
    const onPress = jest.fn();
    const screen = render(<ToggleRow value={false} onPress={onPress} accessibilityLabel="Setting"><Text>Title</Text></ToggleRow>);
    fireEvent.press(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toHaveAccessibilityState({ checked: false });
    screen.rerender(<ToggleRow value onPress={onPress} accessibilityLabel="Setting"><Text>Title</Text></ToggleRow>);
    expect(screen.getByRole("switch")).toHaveAccessibilityState({ checked: true });
  });
});
