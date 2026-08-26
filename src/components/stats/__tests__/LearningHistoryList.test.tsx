import React from "react";
import { render } from "@testing-library/react-native";

import LearningHistoryList from "@/src/components/stats/LearningHistoryList";
import type { LearningHistoryEvent } from "@/src/db/sqlite/db";

jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text: MockText } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockIonicons({ name }: { name: string }) {
    return <MockText>{name}</MockText>;
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "pl" },
    t: (key: string) => ({
      "screens.stats.stats.stats.history.correct": "Poprawna",
      "screens.stats.stats.stats.history.wrong": "Błędna",
      "screens.stats.stats.stats.history.today": "(Dzisiaj)",
      "screens.stats.stats.stats.history.mode.flashcards": "Fiszki",
      "screens.stats.stats.stats.history.cardType.text": "Tekstowa",
      "screens.stats.stats.stats.history.box.one": "Pudełko 1",
      "screens.stats.stats.stats.history.box.two": "Pudełko 2",
      "screens.stats.stats.stats.history.seconds": "{{value}} s",
    }[key] ?? key),
  }),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    colors: {
      background: "#f2f4f6",
      secondBackground: "#ffffff",
      headline: "#00214d",
      paragraph: "#1b2d45",
      my_green: "#00ebc7",
      my_red: "#ff5470",
      my_yellow: "#fde24f",
      border: "#e9e9e9",
      font: "#00214d",
      darkbg: "#001534",
      lightbg: "#ffffff",
      variants: { highContrast: {}, deuteranopia: {}, protanopia: {}, tritanopia: {} },
    },
    accessibilityPreferences: {},
    fontScaleMultiplier: 1,
  }),
}));

jest.mock("@/src/components/card/subcomponents/CardMathText", () => ({
  CardMathText: ({ text }: { text: string }) => {
    const { Text: MockText } = jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>{text}</MockText>;
  },
}));

jest.mock("@/src/components/card/subcomponents/PromptImage", () => ({
  PromptImage: () => {
    const { Text: MockText } = jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>prompt-image</MockText>;
  },
}));

function event(overrides: Partial<LearningHistoryEvent> = {}): LearningHistoryEvent {
  return {
    id: 1,
    sourceType: "builtin",
    mode: "flashcards",
    cardId: 1,
    courseId: 1,
    courseName: "Matematyka Podstawa",
    iconId: "calculator",
    iconColor: "#4361EE",
    promptText: "Jakie warunki trzeba spełnić?",
    expectedAnswerText: "Odpowiedź",
    promptImageUri: null,
    expectedAnswerImageUri: null,
    cardType: "know_dont_know",
    userAnswer: "true",
    reversed: false,
    result: "ok",
    fromBox: "boxOne",
    toBox: "boxTwo",
    durationMs: 1000,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("LearningHistoryList", () => {
  it("renders the date header, status, time, badge and metadata", () => {
    const screen = render(<LearningHistoryList events={[event()]} />);

    expect(screen.getByText("(Dzisiaj)")).toBeTruthy();
    expect(screen.getByText("Poprawna")).toBeTruthy();
    expect(screen.getByText("Matematyka Podstawa")).toBeTruthy();
    expect(screen.getByText("Pudełko 1 → Pudełko 2")).toBeTruthy();
    expect(screen.getByText("{{value}} s")).toBeTruthy();
    expect(screen.getByText("Jakie warunki trzeba spełnić?")).toBeTruthy();
  });

  it("renders separate date headers and preserves card images", () => {
    const first = event({ id: 1, promptImageUri: "prompt://one", expectedAnswerImageUri: "answer://one" });
    const second = event({ id: 2, createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, result: "wrong" });
    const screen = render(<LearningHistoryList events={[first, second]} />);

    expect(screen.getAllByText("prompt-image")).toHaveLength(2);
    expect(screen.getAllByText("calendar-outline")).toHaveLength(2);
    expect(screen.getByText("Błędna")).toBeTruthy();
  });

  it("shows only the course and box transition for text cards", () => {
    const screen = render(<LearningHistoryList events={[event({ cardType: "text" })]} />);

    expect(screen.getByText("Matematyka Podstawa")).toBeTruthy();
    expect(screen.getByText("Pudełko 1 → Pudełko 2")).toBeTruthy();
  });

  it("hides text format for image cards and keeps the box transition", () => {
    const screen = render(
      <LearningHistoryList
        events={[event({ cardType: "text", promptImageUri: "prompt://flag" })]}
      />,
    );

    expect(screen.queryByText("Tekstowa")).toBeNull();
    expect(screen.getByText("Pudełko 1 → Pudełko 2")).toBeTruthy();
  });

  it("keeps the box transition separate from a long course name", () => {
    const screen = render(
      <LearningHistoryList
        events={[event({ courseName: "Bardzo długa nazwa kursu językowego dla początkujących" })]}
      />,
    );

    expect(screen.getByText("Bardzo długa nazwa kursu językowego dla początkujących")).toBeTruthy();
    expect(screen.getByText("Pudełko 1 → Pudełko 2")).toBeTruthy();
  });
});
