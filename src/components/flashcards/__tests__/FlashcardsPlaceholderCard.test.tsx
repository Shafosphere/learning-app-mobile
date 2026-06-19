import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { FlashcardsPlaceholderCard } from "../FlashcardsPlaceholderCard";

let mockWindowDimensions = {
  width: 768,
  height: 1024,
  scale: 1,
  fontScale: 1,
};

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return new Proxy(RN, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      if (prop === "useWindowDimensions") return () => mockWindowDimensions;
      return target[prop as keyof typeof target];
    },
  });
});

describe("FlashcardsPlaceholderCard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses responsive tablet card metrics", () => {
    mockWindowDimensions = {
      width: 768,
      height: 1024,
      scale: 1,
      fontScale: 1,
    };

    render(<FlashcardsPlaceholderCard title="No cards" />);

    const style = StyleSheet.flatten(
      screen.getByTestId("flashcards-placeholder-card").props.style,
    );

    expect(style.width).toBe(630);
    expect(style.minHeight).toBeCloseTo(218.68, 1);
  });
});
