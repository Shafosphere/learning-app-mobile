import { render } from "@testing-library/react-native";
import React from "react";

import type { WordWithTranslations } from "@/src/types/boxes";
import FlashcardsPeekOverlay from "../FlashcardsPeek";

jest.mock("../Peek-styles", () => ({
  usePeekStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("expo-image", () => ({
  Image: ({ source }: { source: { uri: string } }) => {
    const React = require("react");
    const { View } = require("react-native");
    return <View testID={`image-${source.uri}`} />;
  },
}));

jest.mock("@expo/vector-icons/Octicons", () => "Octicons");

function makeCard(overrides: Partial<WordWithTranslations>): WordWithTranslations {
  return {
    id: 1,
    text: "front-question",
    translations: ["hidden-answer"],
    flipped: false,
    type: "text",
    ...overrides,
  };
}

function renderPeek(card: WordWithTranslations) {
  return render(
    <FlashcardsPeekOverlay
      visible
      boxKey="boxTwo"
      cards={[card]}
      activeCourseName="Test course"
      onClose={jest.fn()}
    />
  );
}

describe("FlashcardsPeekOverlay flip behavior", () => {
  it("shows the front prompt for a non-flipped card in a reversed box", () => {
    const screen = renderPeek(makeCard({ flipped: false }));

    expect(screen.getByText("front-question")).not.toBeNull();
    expect(screen.queryByText("hidden-answer")).toBeNull();
  });

  it("shows the reversed prompt for a flipped card in a reversed box", () => {
    const screen = renderPeek(makeCard({ flipped: true }));

    expect(screen.getByText("hidden-answer")).not.toBeNull();
    expect(screen.queryByText("front-question")).toBeNull();
  });

  it("does not expose a flag image from the hidden side of a flipped card", () => {
    const screen = renderPeek(
      makeCard({
        text: "",
        translations: ["United Arab Emirates"],
        flipped: true,
        imageFront: "ae.svg",
        imageBack: null,
      })
    );

    expect(screen.getByText("United Arab Emirates")).not.toBeNull();
    expect(screen.queryByTestId("image-ae.svg")).toBeNull();
  });
});
