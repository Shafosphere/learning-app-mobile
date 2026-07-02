import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

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
    const ReactActual = jest.requireActual<typeof import("react")>("react");
    const { View } = jest.requireActual<typeof import("react-native")>(
      "react-native"
    );

    return ReactActual.createElement(View, {
      testID: `image-${source.uri}`,
    });
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
  boxKey: "boxZero" | "boxTwo" | "boxFour" = "boxTwo",
  onReturnToUnknown = jest.fn(() => Promise.resolve()),
  cardLayout?: "box-aware" | "uniform",
) {
  return render(
    <FlashcardsPeekOverlay
      visible
      boxKey={boxKey}
      cards={[card]}
      cardLayout={cardLayout}
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

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("keeps box-zero answer content in uniform layout", () => {
    const screen = renderPeek(
      makeCard({
        translations: ["main-answer", "other-answer"],
        imageBack: "answer.svg",
      }),
      "boxZero",
      jest.fn(() => Promise.resolve()),
      "uniform"
    );

    expect(screen.getByText("main-answer")).toBeTruthy();
    expect(
      screen
        .UNSAFE_getAllByType(Text)
        .some((node) =>
          Array.isArray(node.props.children)
            ? node.props.children.includes("other-answer")
            : node.props.children === "other-answer"
        )
    ).toBe(true);
    expect(screen.getByTestId("image-answer.svg")).toBeTruthy();
  });

  it("keeps an image-only flag front-facing in a reversed box", () => {
    const screen = renderPeek(
      makeCard({
        text: "",
        translations: ["United Arab Emirates"],
        flipped: true,
        imageFront: "ae.svg",
        imageBack: null,
      })
    );

    expect(screen.queryByText("United Arab Emirates")).toBeNull();
    expect(screen.getByTestId("image-ae.svg")).not.toBeNull();
  });

  const realCourseCases: {
    course: string;
    card: WordWithTranslations;
    expectedPrompt: string;
    hiddenAnswer?: string;
    expectedImage?: string;
    hiddenImage?: string;
  }[] = [
    {
      course: "ENGtoPL_A1.csv",
      card: makeCard({
        text: "and",
        translations: ["i", "a", "potem", "coraz"],
        flipped: true,
      }),
      expectedPrompt: "i",
    },
    {
      course: "panstwa_i_stolice_afryki.csv",
      card: makeCard({
        text: "Algieria",
        translations: ["Algier"],
        flipped: true,
      }),
      expectedPrompt: "Algier",
    },
    {
      course: "astronomia.csv",
      card: makeCard({
        text: "Ile planet jest w Układzie Słonecznym?",
        translations: ["8"],
        flipped: false,
      }),
      expectedPrompt: "Ile planet jest w Układzie Słonecznym?",
      hiddenAnswer: "8",
    },
    {
      course: "flagi_afryki.csv",
      card: makeCard({
        text: "",
        translations: ["Burkina Faso"],
        flipped: true,
        imageFront: "bf.svg",
        imageBack: "answer-bf.svg",
      }),
      expectedPrompt: "",
      hiddenAnswer: "Burkina Faso",
      expectedImage: "bf.svg",
      hiddenImage: "answer-bf.svg",
    },
    {
      course: "flagi_afryki_en.csv",
      card: makeCard({
        text: "",
        translations: ["Equatorial Guinea"],
        flipped: true,
        imageFront: "gq.svg",
      }),
      expectedPrompt: "",
      hiddenAnswer: "Equatorial Guinea",
      expectedImage: "gq.svg",
    },
    {
      course: "znaki_drogowe.csv",
      card: makeCard({
        text: "",
        translations: ["zakręt w prawo"],
        flipped: true,
        imageFront: "A/A-1.svg",
      }),
      expectedPrompt: "",
      hiddenAnswer: "zakręt w prawo",
      expectedImage: "A/A-1.svg",
    },
    {
      course: "grecka_mitologia_prawda_falsz_50.csv",
      card: makeCard({
        text: "Zeus był królem bogów olimpijskich.",
        translations: ["true"],
        flipped: true,
        type: "true_false",
      }),
      expectedPrompt: "Zeus był królem bogów olimpijskich.",
      hiddenAnswer: "true",
    },
    {
      course: "math.csv",
      card: makeCard({
        text: "Jak definiujemy wartość bezwzględną liczby rzeczywistej x?",
        translations: [],
        flipped: true,
        answerOnly: true,
        type: "know_dont_know",
      }),
      expectedPrompt:
        "Jak definiujemy wartość bezwzględną liczby rzeczywistej x?",
    },
  ];

  it.each(realCourseCases)(
    "uses correct peek direction for $course in box two and box four",
    ({ card, expectedPrompt, hiddenAnswer, expectedImage, hiddenImage }) => {
      for (const boxKey of ["boxTwo", "boxFour"] as const) {
        for (const cardLayout of ["box-aware", "uniform"] as const) {
          const screen = renderPeek(
            card,
            boxKey,
            jest.fn(() => Promise.resolve()),
            cardLayout
          );

          if (expectedPrompt) {
            expect(screen.getByText(expectedPrompt)).toBeTruthy();
          }
          if (hiddenAnswer) {
            expect(screen.queryByText(hiddenAnswer)).toBeNull();
          }
          if (expectedImage) {
            expect(screen.getByTestId(`image-${expectedImage}`)).toBeTruthy();
          }
          if (hiddenImage) {
            expect(
              screen.queryByTestId(`image-${hiddenImage}`)
            ).toBeNull();
          }

          screen.unmount();
        }
      }
    }
  );

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

  it("keeps the existing side layout for box zero by default", () => {
    const screen = renderPeek(makeCard({ id: 9 }), "boxZero");

    expect(screen.getByText("flashcards.card.peek.flashcard")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(
      screen.queryByText("flashcards.card.peek.flashcardNumber")
    ).toBeNull();
  });

  it("uses the centered simple layout for box zero in uniform mode", () => {
    const screen = renderPeek(
      makeCard({ id: 10, text: "", imageFront: "centered.svg" }),
      "boxZero",
      jest.fn(() => Promise.resolve()),
      "uniform"
    );

    expect(
      screen.getByText("flashcards.card.peek.flashcardNumber")
    ).toBeTruthy();
    expect(screen.queryByText("flashcards.card.peek.flashcard")).toBeNull();
    expect(screen.getByTestId("image-centered.svg")).toBeTruthy();
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

  it("shows ready and upcoming sections with reset actions", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    const screen = render(
      <FlashcardsPeekOverlay
        visible
        boxKey="boxTwo"
        cards={[makeCard({ id: 1, text: "ready-card" })]}
        upcomingCards={[
          makeCard({
            id: 2,
            text: "upcoming-card",
            nextReview: 1_000_000 + 135 * 60_000,
          }),
        ]}
        activeCourseName="Test course"
        onClose={jest.fn()}
        onReturnToUnknown={jest.fn(() => Promise.resolve())}
      />
    );

    expect(screen.getByText("flashcards.card.peek.readyNow")).toBeTruthy();
    expect(screen.getByText("flashcards.card.peek.soon")).toBeTruthy();
    expect(screen.getByText("flashcards.card.peek.soonInHoursMinutes")).toBeTruthy();
    expect(screen.getByTestId("flashcards-peek-return-unknown-1")).toBeTruthy();
    expect(screen.getByTestId("flashcards-peek-return-unknown-2")).toBeTruthy();
  });

  it("confirms returning an upcoming card to unknown", async () => {
    const onReturnToUnknown = jest.fn(() => Promise.resolve());
    const screen = render(
      <FlashcardsPeekOverlay
        visible
        boxKey="boxTwo"
        cards={[]}
        upcomingCards={[
          makeCard({
            id: 9,
            text: "upcoming-card",
            nextReview: Date.now() + 60_000,
          }),
        ]}
        onClose={jest.fn()}
        onReturnToUnknown={onReturnToUnknown}
      />
    );

    fireEvent.press(screen.getByTestId("flashcards-peek-return-unknown-9"));
    expect(latestNudgeModalProps?.visible).toBe(true);

    await act(async () => {
      await (latestNudgeModalProps?.onConfirm as () => Promise<void>)();
    });

    expect(onReturnToUnknown).toHaveBeenCalledWith(9);
    expect(latestNudgeModalProps?.visible).toBe(false);
  });

  it("shows upcoming cards without empty state when none are ready", () => {
    const screen = render(
      <FlashcardsPeekOverlay
        visible
        boxKey="boxThree"
        cards={[]}
        upcomingCards={[
          makeCard({ id: 3, text: "future-only", nextReview: Date.now() + 60_000 }),
        ]}
        onClose={jest.fn()}
        onReturnToUnknown={jest.fn(() => Promise.resolve())}
      />
    );

    expect(screen.getByText("future-only")).toBeTruthy();
    expect(screen.queryByText("flashcards.card.peek.emptyBoxTitle")).toBeNull();
    expect(screen.queryByText("flashcards.card.peek.readyNow")).toBeNull();
  });

  it("refreshes the countdown promptly when an upcoming card becomes due", () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    const screen = render(
      <FlashcardsPeekOverlay
        visible
        boxKey="boxThree"
        cards={[]}
        upcomingCards={[
          makeCard({
            id: 4,
            text: "nearly-due",
            nextReview: Date.now() + 500,
          }),
        ]}
        onClose={jest.fn()}
        onReturnToUnknown={jest.fn(() => Promise.resolve())}
      />
    );

    expect(screen.getByText("flashcards.card.peek.soonInMinutes")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(499);
    });

    expect(screen.getByText("flashcards.card.peek.soonInMinutes")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(screen.getByText("flashcards.card.peek.soonNow")).toBeTruthy();
    screen.unmount();
    jest.useRealTimers();
  });

  it("updates a minute-precision countdown at its next label boundary", () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    const screen = render(
      <FlashcardsPeekOverlay
        visible
        boxKey="boxThree"
        cards={[]}
        upcomingCards={[
          makeCard({
            id: 5,
            text: "minute-boundary",
            nextReview: Date.now() + 61 * 60_000,
          }),
        ]}
        onClose={jest.fn()}
        onReturnToUnknown={jest.fn(() => Promise.resolve())}
      />
    );

    expect(screen.getByText("flashcards.card.peek.soonInHoursMinutes")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByText("flashcards.card.peek.soonInHours")).toBeTruthy();
    screen.unmount();
    jest.useRealTimers();
  });
});
