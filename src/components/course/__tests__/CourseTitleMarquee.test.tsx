import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Text, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import { CourseTitleMarquee } from "../CourseTitleMarquee";

const mockTickerRender = jest.fn();
jest.mock("react-native-text-ticker", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockTicker(props: React.ComponentProps<typeof TextTicker>) {
    mockTickerRender(props);
    return <Text>{props.children}</Text>;
  };
});
beforeEach(() => jest.clearAllMocks());

it("ignores identical measurements, but updates real width, text and font changes", () => {
  const screen = render(<CourseTitleMarquee text="Long title" textStyle={{ fontSize: 25 }} />);
  const container = () => screen.UNSAFE_getByType(View);
  const measurement = () => screen.UNSAFE_getAllByType(Text).find((node) => node.props.onTextLayout)!;
  const layout = (width: number) => fireEvent(container(), "layout", { nativeEvent: { layout: { width } } });
  const measure = (width: number) => fireEvent(measurement(), "textLayout", { nativeEvent: { lines: [{ width }] } });
  const ticker = () => mockTickerRender.mock.calls.at(-1)![0];
  layout(100);
  measure(200);
  expect(ticker().disabled).toBe(false);
  const handler = measurement().props.onTextLayout;
  mockTickerRender.mockClear();
  for (let i = 0; i < 5; i++) { layout(100); measure(200); }
  expect(mockTickerRender).not.toHaveBeenCalled();
  expect(measurement().props.onTextLayout).toBe(handler);

  layout(250);
  expect(ticker().disabled).toBe(true);
  measure(300);
  expect(ticker().disabled).toBe(false);
  screen.rerender(<CourseTitleMarquee text="Translated title" textStyle={{ fontSize: 25 }} />);
  expect(ticker().disabled).toBe(true); // Old title's measurement cannot enable new title.
  measure(300);
  expect(ticker().disabled).toBe(false);
  screen.rerender(<CourseTitleMarquee text="Translated title" textStyle={{ fontSize: 40 }} />);
  measure(450);
  expect(ticker().disabled).toBe(false);
  layout(500);
  expect(ticker().disabled).toBe(true);
});

it("keeps one-pixel overflow tolerance and ignores empty text-layout events", () => {
  const screen = render(<CourseTitleMarquee text="Title" />);
  const measurement = screen.UNSAFE_getAllByType(Text).find((node) => node.props.onTextLayout)!;
  fireEvent(screen.UNSAFE_getByType(View), "layout", { nativeEvent: { layout: { width: 100 } } });
  for (const [width, disabled] of [[100, true], [101, true], [102, false]]) {
    fireEvent(measurement, "textLayout", { nativeEvent: { lines: [{ width }] } });
    expect(mockTickerRender.mock.calls.at(-1)![0].disabled).toBe(disabled);
  }
  mockTickerRender.mockClear();
  fireEvent(measurement, "textLayout", { nativeEvent: { lines: [] } });
  expect(mockTickerRender).not.toHaveBeenCalled();
});
