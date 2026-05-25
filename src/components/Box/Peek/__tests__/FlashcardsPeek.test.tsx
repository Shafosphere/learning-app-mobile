import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
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

let latestNudgeModalProps: Record<string, unknown> | null = null;

jest.mock("@/src/components/nudge/NudgeModal", () => ({
  NudgeModal: (props: Record<string, unknown>) => {
    latestNudgeModalProps = props;
    return props.visible ? <>{props.children as React.ReactNode}</> : null;
  },
}));

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

function renderPeek(
  card: WordWithTranslations,
  boxKey: "boxZero" | "boxTwo" = "boxTwo",
  onReturnToUnknown = jest.fn(() => Promise.resolve()),
) {
  return render(
    <FlashcardsPeekOverlay
      visible
      boxKey={boxKey}
      cards={[card]}
      activeCourseName="Test course"
      onClose={jest.fn()}
      onReturnToUnknown={onReturnToUnknown}
    />
  );
}

describe("FlashcardsPeekOverlay flip behavior", () => {
  beforeEach(() => {
    latestNudgeModalProps = null;
  });

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

  it("offers return to unknown for cards in box zero and waits for confirmation", async () => {
    const onReturnToUnknown = jest.fn(() => Promise.resolve());
    const screen = renderPeek(makeCard({ id: 7 }), "boxZero", onReturnToUnknown);

    fireEvent.press(screen.getByTestId("flashcards-peek-return-unknown-7"));

    expect(latestNudgeModalProps?.visible).toBe(true);
    expect(onReturnToUnknown).not.toHaveBeenCalled();

    await act(async () => {
      (latestNudgeModalProps?.onConfirm as () => void)();
      await Promise.resolve();
    });

    expect(onReturnToUnknown).toHaveBeenCalledWith(7);
    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(false);
    });
  });

  it("keeps confirmation open when returning the card fails", async () => {
    const onReturnToUnknown = jest.fn(() => Promise.reject(new Error("failed")));
    const screen = renderPeek(makeCard({ id: 8 }), "boxTwo", onReturnToUnknown);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);

    fireEvent.press(screen.getByTestId("flashcards-peek-return-unknown-8"));
    await act(async () => {
      (latestNudgeModalProps?.onConfirm as () => void)();
      await Promise.resolve();
    });

    expect(latestNudgeModalProps?.visible).toBe(true);
    expect(screen.getByText("flashcards.card.peek.returnToUnknownError")).toBeTruthy();
  });
});
