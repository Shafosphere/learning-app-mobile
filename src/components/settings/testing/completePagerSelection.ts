import { act, screen } from "@testing-library/react-native";

/** Emit native completion explicitly; imperative mock methods never select pages. */
export function completePagerSelection(key: string) {
  const pager = screen.getByTestId("settings-native-pager");
  const index = pager.props.children.findIndex((child: { key: string }) => child.key === key);
  if (index < 0) throw new Error(`Missing pager category: ${key}`);
  act(() => {
    pager.props.onPageSelected({ nativeEvent: { position: index } });
    pager.props.onPageScrollStateChanged({ nativeEvent: { pageScrollState: "idle" } });
  });
}
