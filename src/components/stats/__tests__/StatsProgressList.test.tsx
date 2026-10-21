import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Text, View } from "react-native";
import StatsProgressList from "../StatsProgressList";

function List({ items }: { items: string[] }) {
  return (
    <StatsProgressList
      testID="list"
      items={items}
      keyExtractor={(item) => item}
      renderItem={(item, _index, layout) => (
        <View testID={`row-${item}`} onLayout={layout.onLayout}>
          <Text>{item}</Text>
        </View>
      )}
    />
  );
}

it("caps the viewport at four measured rows, retaining the remaining content and adapting to text height", () => {
  const screen = render(<List items={["a", "b", "c", "d", "e"]} />);
  for (const [index, item] of ["a", "b", "c", "d"].entries()) {
    fireEvent(screen.getByTestId(`row-${item}`), "layout", {
      nativeEvent: { layout: { height: 60 + index * 10 } },
    });
  }
  expect(screen.getByTestId("list")).toHaveStyle({ maxHeight: 300 });
  expect(screen.getByTestId("list").props.scrollEnabled).toBe(true);
  expect(screen.getByTestId("list").props.nestedScrollEnabled).toBe(true);
  expect(screen.getByText("e")).toBeTruthy();

  fireEvent(screen.getByTestId("row-a"), "layout", {
    nativeEvent: { layout: { height: 120 } },
  });
  expect(screen.getByTestId("list")).toHaveStyle({ maxHeight: 360 });

  screen.rerender(<List items={["e", "d", "c", "b", "a"]} />);
  fireEvent(screen.getByTestId("row-e"), "layout", {
    nativeEvent: { layout: { height: 100 } },
  });
  expect(screen.getByTestId("list")).toHaveStyle({ maxHeight: 340 });
});

it("disables inner scrolling and removes the cap when only four rows remain", () => {
  const screen = render(<List items={["a", "b", "c", "d", "e"]} />);
  screen.rerender(<List items={["a", "b", "c", "d"]} />);

  expect(screen.getByTestId("list").props.scrollEnabled).toBe(false);
  expect(screen.getByTestId("list").props.showsVerticalScrollIndicator).toBe(false);
  expect(screen.getByTestId("list").props.style).toBeUndefined();
  expect(screen.queryByText("e")).toBeNull();
});
