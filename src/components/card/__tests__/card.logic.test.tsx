import React from "react";
import { NavbarContentWidthContext } from "@/src/contexts/NavbarLayoutContext";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text, type TextInput } from "react-native";
import { DEFAULT_LETTER_HINT_SETTINGS } from "@/src/utils/letterHints";

import { useFlashcardAudio } from "@/Audio/runtime/useFlashcardAudio";
import Card from "@/src/components/card/card";
import { useCardFocusController } from "@/src/components/card/useCardFocusController";
import { useFocusExecutor } from "@/src/components/card/useFocusExecutor";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CardProps } from "@/src/components/card/card-types";
import type { WordWithTranslations } from "@/src/types/boxes";
import { isStudyCardReversed } from "@/src/utils/flashcardDirection";

let mockScreenDimensions: typeof mockWindowDimensions | null = null;

let mockTextInputFocus = jest.fn();
let mockTextInputBlur = jest.fn();
let mockWindowDimensions = {
  width: 360,
  height: 740,
  scale: 1,
  fontScale: 1,
};

jest.mock("@/src/db/sqlite/repositories/courses", () => ({
  getCustomCourseById: jest.fn(async () => ({ id: 42, slug: "fr_to_en_first_50" })),
}));

const mockRead = jest.fn();
jest.mock("@/Audio/runtime/useFlashcardAudio", () => ({
  useFlashcardAudio: jest.fn((_course, _externalId, _context, enabled) => ({ available: enabled, read: mockRead })),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("react-native", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const RN = jest.requireActual("react-native");

  const TextInput = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      focus: () => mockTextInputFocus(),
      blur: () => mockTextInputBlur(),
    }));

    return React.createElement(RN.View, props);
  });
  TextInput.displayName = "TextInput";

  return new Proxy(RN, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      if (prop === "Dimensions") return {
        get: (source: string) => source === "screen"
          ? mockScreenDimensions ?? mockWindowDimensions
          : RN.Dimensions.get(source),
        addEventListener: RN.Dimensions.addEventListener,
      };
      if (prop === "TextInput") return TextInput;
      if (prop === "useWindowDimensions") return () => mockWindowDimensions;
      return target[prop as keyof typeof target];
    },
  });
});

jest.mock("@/src/components/card/card-styles", () => ({
  useStyles: jest.fn(() =>
    new Proxy(
      {},
      {
        get: () => ({}),
      },
    ),
  ),
}));

let latestCardHintProps: Record<string, unknown> | null = null;
let latestNudgeModalProps: Record<string, unknown> | null = null;
let latestCardFrameProps: Record<string, unknown> | null = null;

jest.mock("@/src/components/card/subcomponents/CardHint", () => ({
  CardHint: (props: Record<string, unknown>) => {
    latestCardHintProps = props;
    return null;
  },
}));

jest.mock("@/src/components/nudge/NudgeModal", () => ({
  NudgeModal: (props: Record<string, unknown>) => {
    latestNudgeModalProps = props;
    return null;
  },
}));

jest.mock("@/src/components/card/subcomponents/CardFrame", () => {
  return function CardFrameMock(
    props: Record<string, unknown> & { children: React.ReactNode; underlay?: React.ReactNode },
  ) {
    latestCardFrameProps = props;
    const { children, underlay } = props;
    return <>{underlay}{children}</>;
  };
});

jest.mock("@/src/components/card/useCardFocusController", () => ({
  useCardFocusController: jest.fn(),
}));

jest.mock("@/src/components/card/useFocusExecutor", () => ({
  useFocusExecutor: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "app.actions.cancel": "Anuluj",
        "flashcards.card.hint.bothSides": "Obie strony fiszki",
        "flashcards.card.hint.save": "Zapisz",
        "flashcards.card.hint.targetDialogMessage":
          "Może być widoczna tylko przy tej stronie fiszki albo przy obu stronach.",
        "flashcards.card.hint.targetDialogTitle": "Gdzie zapisać podpowiedź?",
        "flashcards.card.hint.thisSideOnly": "Tylko ta strona",
      };
      return translations[key] ?? key;
    },
  }),
}));

let latestResolverProps: Record<string, unknown> | null = null;

jest.mock("@/src/components/card/subcomponents/CardContentResolver", () => ({
  CardContentResolver: (props: Record<string, unknown>) => {
    latestResolverProps = props;
    return null;
  },
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseCardFocusController = useCardFocusController as jest.Mock;
const mockedUseFocusExecutor = useFocusExecutor as jest.Mock;

let mockRequestFocus: jest.Mock;

function makeCard(
  overrides: Partial<WordWithTranslations> & Pick<WordWithTranslations, "id">,
): WordWithTranslations {
  return {
    id: overrides.id,
    text: overrides.text ?? `word-${overrides.id}`,
    translations: overrides.translations ?? [`translation-${overrides.id}`],
    flipped: overrides.flipped ?? false,
    answerOnly: overrides.answerOnly ?? false,
    hintFront: overrides.hintFront ?? null,
    hintBack: overrides.hintBack ?? null,
    imageFront: overrides.imageFront ?? null,
    imageBack: overrides.imageBack ?? null,
    explanation: overrides.explanation ?? null,
    type: overrides.type ?? "text",
  };
}

function createProps(overrides: Partial<CardProps> = {}): CardProps {
  return {
    selectedItem: makeCard({ id: 1 }),
    reversed: false,
    answer: "",
    setAnswer: jest.fn(),
    setResult: jest.fn(),
    result: null,
    correction: null,
    wrongInputChange: jest.fn(),
    confirm: jest.fn(),
    setCorrectionRewers: jest.fn(),
    onHintUpdate: jest.fn(),
    isFocused: true,
    introMode: false,
    isBetweenCards: false,
    disableLayoutAnimation: true,
    focusRequestToken: 0,
    showExplanationEnabled: false,
    explanationOnlyOnWrong: false,
    ...overrides,
  };
}

function renderCard(
  props: CardProps,
  options: { textInputFocus?: jest.Mock; textInputBlur?: jest.Mock } = {},
) {
  mockTextInputFocus = options.textInputFocus ?? jest.fn();
  mockTextInputBlur = options.textInputBlur ?? jest.fn();

  return render(<Card {...props} />, {
    createNodeMock: () => ({
      focus: options.textInputFocus ?? jest.fn(),
      blur: options.textInputBlur ?? jest.fn(),
      scrollTo: jest.fn(),
    }),
  });
}

describe("Card logic props", () => {
  beforeEach(() => {
    mockScreenDimensions = null;
    latestResolverProps = null;
    latestCardHintProps = null;
    latestNudgeModalProps = null;
    latestCardFrameProps = null;
    mockWindowDimensions = {
      width: 360,
      height: 740,
      scale: 1,
      fontScale: 1,
    };
    mockRequestFocus = jest.fn();
    mockedUseCardFocusController.mockReturnValue({
      focusTarget: "none",
      focusRequestId: 0,
      requestFocus: mockRequestFocus,
      onCorrection1Completed: jest.fn(),
      onHintEditStarted: jest.fn(),
    });
    mockedUseFocusExecutor.mockImplementation(() => undefined);
    mockedUseSettings.mockReturnValue({
      explanationOnlyOnWrong: false,
      showExplanationEnabled: false,
      ignoreDiacriticsInSpellcheck: false,
      flashcardsSuggestionsEnabled: false,
      flashcardsCardSize: "normal",
      flashcardsImageSize: "dynamic",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it.each([
    [false, true, "planet", "planet"],
    [false, true, "WORLD", "world"],
    [false, true, "worl", "world"],
    [true, true, "fruit", "fruit"],
    [true, true, "frui", "fruit"],
    [false, false, "wrong", "planet"],
    [true, false, "wrong", "apple"],
  ])("selects canonical answer audio (reversed %s, result %s, input %s)", (reversed, result, answer, expected) => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), spellChecking: true });
    renderCard(createProps({ contentDebugSource: "flashcards", reversed, result, answer,
      selectedItem: makeCard({ id: 91, text: "apple; fruit", translations: ["planet", "world"], flipped: true, imageFront: "file://apple.webp" }),
    }));
    expect(jest.mocked(useFlashcardAudio)).toHaveBeenLastCalledWith(undefined, undefined, expect.any(String), true,
      expect.objectContaining({ side: reversed ? "front" : "back", text: expected, phase: "answer", delayMs: 0 }));
  });

  it.each([false, true])("reads only the expected side during demotion correction (reversed %s)", (reversed) => {
    const word = makeCard({ id: 91, text: "apple; fruit", translations: ["planet", "world"], flipped: true });
    const props = createProps({ contentDebugSource: "review", selectedItem: word, reversed, result: false, answer: "wrong",
      correction: { cardId: 91, awers: "apple", rewers: "planet", input1: "", input2: "", mode: "demote", reversed, word },
    });
    const screen = renderCard(props);
    const expected = expect.objectContaining({ side: reversed ? "front" : "back", text: reversed ? "apple" : "planet", phase: "answer", delayMs: 0 });
    expect(jest.mocked(useFlashcardAudio)).toHaveBeenLastCalledWith(undefined, undefined, expect.any(String), true, expected);
    screen.rerender(<Card {...props} correction={{ ...props.correction!, input1: "ap" }} />);
    expect(jest.mocked(useFlashcardAudio)).toHaveBeenLastCalledWith(undefined, undefined, expect.any(String), true, expected);
  });

  it("keeps answer playback context stable when showing an explanation", () => {
    const props = createProps({ contentDebugSource: "flashcards", result: true, answer: "translation-1",
      selectedItem: makeCard({ id: 1, explanation: "Explanation" }) });
    const screen = renderCard(props);
    const before = jest.mocked(useFlashcardAudio).mock.calls.at(-1)!;
    screen.rerender(<Card {...props} showExplanationEnabled isExplanationVisible />);
    expect(jest.mocked(useFlashcardAudio).mock.calls.at(-1)).toEqual(before);
  });

  it("reads the expected answer when correction is skipped", () => {
    renderCard(createProps({ contentDebugSource: "flashcards", result: false, answer: "translation-1", skipCorrectionEnabled: true }));
    expect(jest.mocked(useFlashcardAudio)).toHaveBeenLastCalledWith(undefined, undefined, expect.any(String), true,
      expect.objectContaining({ text: "translation-1", phase: "answer", delayMs: 0 }));
  });

  it.each([false, true])("reads only the visible prompt (reversed: %s)", (reversed) => {
    renderCard(createProps({ contentDebugSource: "flashcards", reversed,
      selectedItem: { id: 91, externalId: "0001", text: "agua", translations: ["water"], flipped: true } }));
    (latestResolverProps!.onReadPrompt as () => void)();
    expect(mockRead).toHaveBeenCalledWith(reversed ? "back" : "front", reversed ? "water" : "agua");
    expect(latestResolverProps!.onReadFrontInput).toBeUndefined();
    expect(latestResolverProps!.onReadBackInput).toBeUndefined();
  });

  it.each([true, false])("reads the complete copied word in box0 (front: %s)", (reversed) => {
    const word = { id: 91, externalId: "0001", text: "agua", translations: ["water"], flipped: true, imageFront: "file://water.webp" };
    renderCard(createProps({ contentDebugSource: "flashcards", audioCourseId: 42, activeBox: "boxZero", introMode: true,
      selectedItem: word,
      correction: { cardId: 91, awers: "agua", rewers: "water", input1: "ag", input2: "wa", mode: "intro",
        promptText: "agua", reversed, word, promptImageUri: word.imageFront },
    }));
    expect(mockRead).not.toHaveBeenCalled();
    (latestResolverProps![reversed ? "onReadFrontInput" : "onReadBackInput"] as () => void)();
    expect(mockRead).toHaveBeenCalledWith(reversed ? "front" : "back", reversed ? "agua" : "water");
  });

  it.each(["flashcards", "review"] as const)("resolves image prompts by actual course, suppresses audio and still reads checked answers: %s", (source) => {
    const getRole = jest.fn(() => "replace_back");
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), courseFrontImageRole: "replace_front",
      courseFrontImageRoleHydrated: true, getCustomCourseFrontImageRole: getRole });
    const props = createProps({ contentDebugSource: source, audioCourseId: 42, reversed: true,
      selectedItem: makeCard({ id: 91, text: "spoon", translations: ["łyżka"], imageFront: "spoon.webp", flipped: true }) });
    const screen = renderCard(props);
    expect(getRole).toHaveBeenCalledWith(42);
    expect(latestResolverProps).toMatchObject({ promptText: "", promptImageUri: "spoon.webp" });
    expect(latestResolverProps!.onReadPrompt).toBeUndefined();
    expect(jest.mocked(useFlashcardAudio).mock.calls.at(-1)?.[3]).toBe(false);
    screen.rerender(<Card {...props} result={true} answer="spoon" />);
    expect(jest.mocked(useFlashcardAudio)).toHaveBeenLastCalledWith(42, undefined, expect.any(String), true,
      expect.objectContaining({ side: "front", text: "spoon", phase: "answer" }));
    screen.rerender(<Card {...props} reversed={false} />);
    expect(latestResolverProps).toMatchObject({ promptText: "spoon", promptImageUri: null });
    expect(latestResolverProps!.onReadPrompt).toBeDefined();
  });

  it("holds image prompts and audio until course role hydration", () => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), courseFrontImageRoleHydrated: false });
    renderCard(createProps({ contentDebugSource: "flashcards",
      selectedItem: makeCard({ id: 91, imageFront: "spoon.webp" }) }));
    expect(latestResolverProps).toMatchObject({ promptText: "", promptImageUri: null, letterHintPrefix: "" });
    expect(latestResolverProps!.onReadPrompt).toBeUndefined();
    expect(jest.mocked(useFlashcardAudio).mock.calls.at(-1)?.[3]).toBe(false);
  });

  it("keeps images and copied text visible during intro", () => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), courseFrontImageRole: "replace_back", courseFrontImageRoleHydrated: true });
    const word = makeCard({ id: 91, text: "spoon", translations: ["łyżka"], imageFront: "spoon.webp", flipped: true });
    renderCard(createProps({ contentDebugSource: "flashcards", activeBox: "boxZero", selectedItem: word,
      introMode: true, result: null,
      correction: { mode: "intro", cardId: 91, awers: "spoon", rewers: "łyżka", input1: "", reversed: true,
        promptText: "łyżka", word },
    }));
    expect(latestResolverProps).toMatchObject({ promptText: "łyżka", promptImageUri: "spoon.webp" });
  });

  it.each(
    (["flashcards", "review"] as const).flatMap((source) =>
      (["boxOne", "boxTwo"] as const).map((box) => ({ source, box })),
    ),
  )("preserves the Spanish prompt and correction language in $source/$box", ({ source, box }) => {
    // The review course has a different image role from the active study course.
    const getRole = jest.fn(() => "replace_back");
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(),
      activeCustomCourseId: 99, courseFrontImageRole: "replace_front",
      courseFrontImageRoleHydrated: true, getCustomCourseFrontImageRole: getRole,
    });
    const word = makeCard({ id: 91, text: "autobús", translations: ["autobus"],
      imageFront: "bus.webp", flipped: true });
    const reversed = isStudyCardReversed(word, box, true);
    const expectedPrompt = { promptText: reversed ? "" : "autobús", promptImageUri: reversed ? "bus.webp" : null };
    const props = createProps({ contentDebugSource: source, audioCourseId: 42,
      activeBox: box, selectedItem: word, reversed });
    const screen = renderCard(props);
    expect(latestResolverProps).toMatchObject(expectedPrompt);

    screen.rerender(<Card {...props} result={false} answer="wrong"
      correction={{ mode: "demote", cardId: word.id, awers: "autobús", rewers: "autobus",
        input1: "", input2: "", reversed, word,
        promptText: reversed ? "autobus" : "autobús",
        promptImageUri: reversed ? null : word.imageFront,
      }} />);

    expect(getRole).toHaveBeenCalledWith(42);
    expect(latestResolverProps).toMatchObject({ ...expectedPrompt, displayMode: "correction",
      shouldCorrectAwers: reversed, shouldCorrectRewers: !reversed,
      correctionAwers: "autobús", correctionRewers: "autobus",
    });
    if (reversed) {
      expect(latestResolverProps!.onReadPrompt).toBeUndefined();
    } else {
      (latestResolverProps!.onReadPrompt as () => void)();
      expect(mockRead).toHaveBeenCalledWith("front", "autobús");
    }
    // Image-only prompts suppress prompt audio, while correction still reads the answer.
    expect(jest.mocked(useFlashcardAudio)).toHaveBeenLastCalledWith(42, undefined, expect.any(String), true,
      expect.objectContaining({ side: reversed ? "front" : "back",
        text: reversed ? "autobús" : "autobus", phase: "answer" }));
  });

  it("disables audio gestures when the card loses focus", () => {
    const props = createProps({ contentDebugSource: "flashcards" });
    const screen = renderCard(props);
    expect(latestResolverProps!.onReadPrompt).toBeDefined();
    screen.rerender(<Card {...props} isFocused={false} />);
    expect(latestResolverProps!.onReadPrompt).toBeUndefined();
  });

  it("uses the correct side and first alternative without inserting hints into the answer", () => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), letterHintSettingsHydrated: true,
      letterHintSettings: { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true } });
    const props = createProps({ contentDebugSource: "flashcards", activeBox: "boxOne",
      selectedItem: makeCard({ id: 99, text: "apple; fruit", translations: ["planet", "world"] }) });
    const screen = render(<Card {...props} />);
    expect(latestResolverProps).toMatchObject({ letterHintPrefix: "pl", answer: "" });
    screen.rerender(<Card {...props} answer="world" />);
    expect(latestResolverProps).toMatchObject({ letterHintPrefix: "pl", answer: "world" });
    screen.rerender(<Card {...props} activeBox="boxTwo" reversed />);
    expect(latestResolverProps?.letterHintPrefix).toBe("a");
    screen.rerender(<Card {...props} selectedItem={makeCard({ id: 100, translations: ["kot"] })} />);
    expect(latestResolverProps?.letterHintPrefix).toBe("k");
    const before = (props.setAnswer as jest.Mock).mock.calls.length;
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), letterHintSettings: DEFAULT_LETTER_HINT_SETTINGS });
    screen.rerender(<Card {...props} answer="unfinished" />);
    expect(latestResolverProps).toMatchObject({ letterHintPrefix: "", answer: "unfinished" });
    expect((props.setAnswer as jest.Mock).mock.calls.length).toBe(before);
  });

  it.each([
    { activeBox: "boxZero" }, { activeBox: "boxThree" }, { activeBox: "boxFour" }, { activeBox: "boxFive" },
    { contentDebugSource: "review" }, { result: true }, { result: false }, { introMode: true },
    { isBetweenCards: true }, { isContentHeld: true },
    { selectedItem: makeCard({ id: 99, type: "true_false", translations: ["planet"] }) },
    { selectedItem: makeCard({ id: 99, type: "know_dont_know", translations: ["planet"] }) },
  ] as Partial<CardProps>[])("limits hints to unanswered text cards in the study flow: %j", (overrides) => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), letterHintSettingsHydrated: true,
      letterHintSettings: { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true } });
    render(<Card {...createProps({ contentDebugSource: "flashcards", activeBox: "boxOne",
      selectedItem: makeCard({ id: 99, translations: ["planet"] }), ...overrides })} />);
    expect(latestResolverProps?.letterHintPrefix).toBe("");
  });

  it("waits for settings hydration and never auto-submits a displayed hint", () => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), letterHintSettingsHydrated: false,
      letterHintSettings: { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true } });
    const props = createProps({ contentDebugSource: "flashcards", activeBox: "boxOne", autoSubmitCorrectAnswer: true,
      selectedItem: makeCard({ id: 99, translations: ["planet"] }) });
    const screen = render(<Card {...props} />);
    expect(latestResolverProps?.letterHintPrefix).toBe("");
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), letterHintSettingsHydrated: true });
    screen.rerender(<Card {...props} />);
    expect(latestResolverProps).toMatchObject({ letterHintPrefix: "pl", answer: "" });
    expect(props.confirm).not.toHaveBeenCalled();
    act(() => (latestResolverProps?.handleConfirm as () => void)());
    // The first argument chooses the translation; no answer override is supplied.
    expect(props.confirm).toHaveBeenCalledWith("planet");
    expect(latestResolverProps?.answer).toBe("");
  });

  it.each([
    [["70", "seventy"], false, false],
    [["seventy", "70"], false, false],
    [["70", "80"], true, false],
    [["70", "2024"], true, false],
    [["2024", "last year"], false, false],
    [["2024-01-01", "January first"], false, false],
    [["2024-01-01"], false, true],
  ])("chooses keyboard from all accepted answers: %j", (translations, numeric, date) => {
    render(<Card {...createProps({ selectedItem: makeCard({ id: 70, translations: translations as string[] }) })} />);
    expect(latestResolverProps).toMatchObject({ isMainAnswerNumeric: numeric, isMainAnswerDate: date });
  });

  it("forces answerOnly semantics for image-only cards", async () => {
    render(
      <Card
        {...createProps({
          reversed: true,
          selectedItem: makeCard({
            id: 10,
            text: "",
            translations: ["kot"],
            imageFront: "front://cat",
            imageBack: "back://cat",
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("question");
    });

    expect(latestResolverProps).toMatchObject({
      promptImageUri: "front://cat",
      promptText: "",
      answerOnly: true,
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
  });

  it("passes responsive tablet card metrics to frame, hint, and content", async () => {
    mockWindowDimensions = {
      width: 768,
      height: 1024,
      scale: 1,
      fontScale: 1,
    };

    renderCard(createProps());

    await waitFor(() => {
      expect(latestCardFrameProps?.cardWidth).toBe(630);
    });
    expect(latestCardFrameProps?.minHeight).toBeCloseTo(218.68, 1);
    expect(latestCardHintProps?.cardWidth).toBe(630);
    expect((latestResolverProps?.cardMetrics as any)?.width).toBe(630);
    expect((latestResolverProps?.cardMetrics as any)?.minHeight).toBeCloseTo(
      218.68,
      1,
    );
    expect((latestResolverProps?.cardMetrics as any)?.contentScale).toBeCloseTo(
      218.68 / 126,
      2,
    );
    expect((latestResolverProps?.cardMetrics as any)?.fontSize).toBeCloseTo(
      24 * (218.68 / 126),
      2,
    );
  });

  it("fits cards, hints, and controls into the measured viewport between rails", () => {
    mockWindowDimensions = { width: 740, height: 390, scale: 1, fontScale: 1 };
    const props = createProps();
    const screen = render(
      <NavbarContentWidthContext.Provider value={584}>
        <Card {...props} />
      </NavbarContentWidthContext.Provider>,
    );
    expect(latestCardFrameProps?.cardWidth).toBe(536);
    expect(latestCardHintProps?.cardWidth).toBe(536);
    expect((latestResolverProps?.cardMetrics as any)?.width).toBe(536);

    screen.rerender(
      <NavbarContentWidthContext.Provider value={300}>
        <Card {...props} widthOverride={630} />
      </NavbarContentWidthContext.Provider>,
    );
    expect(latestCardFrameProps?.cardWidth).toBe(300);
  });

  it("keeps tablet content scaling when the keyboard resizes its window", () => {
    mockWindowDimensions = { width: 1024, height: 320, scale: 1, fontScale: 1 };
    mockScreenDimensions = { ...mockWindowDimensions, height: 768 };
    renderCard(createProps());
    expect((latestResolverProps?.cardMetrics as any)?.contentScale).toBeGreaterThan(1);
  });

  it.each(["flashcards", "review"] as const)("keeps the empty hint entry available in spacious landscape for %s", (contentDebugSource) => {
    mockWindowDimensions = { width: 1474, height: 520, scale: 1, fontScale: 1 };
    mockScreenDimensions = { ...mockWindowDimensions, height: 922 };
    const props = createProps({ contentDebugSource });
    const screen = renderCard(props);
    expect(latestCardHintProps).toMatchObject({ currentHint: null });
    latestCardHintProps = null;
    screen.rerender(<Card {...props} inlineAction={{ disabled: false, label: "Confirm", onCorrectionConfirm: jest.fn() }} />);
    expect(latestCardHintProps).toBeNull();
    screen.rerender(<Card {...props} />);
    expect(latestCardHintProps).toMatchObject({ currentHint: null });
  });

  it("keeps phone card metrics at base size", async () => {
    mockWindowDimensions = {
      width: 360,
      height: 740,
      scale: 1,
      fontScale: 1,
    };

    renderCard(createProps());

    await waitFor(() => {
      expect(latestCardFrameProps?.cardWidth).toBe(325);
    });
    expect(latestCardFrameProps?.minHeight).toBe(120);
    expect(latestCardHintProps?.cardWidth).toBe(325);
    expect(latestResolverProps?.cardMetrics).toMatchObject({
      width: 325,
      minHeight: 120,
      fontSize: 24,
    });
  });

  it("caps card metrics on large tablet screens", async () => {
    mockWindowDimensions = {
      width: 1200,
      height: 900,
      scale: 1,
      fontScale: 1,
    };

    renderCard(createProps());

    await waitFor(() => {
      expect(latestCardFrameProps?.cardWidth).toBe(630);
    });
    expect(latestCardFrameProps?.minHeight).toBeCloseTo(218.68, 1);
    expect(latestCardHintProps?.cardWidth).toBe(630);
    expect((latestResolverProps?.cardMetrics as any)?.contentScale).toBeCloseTo(
      218.68 / 126,
      2,
    );
    expect((latestResolverProps?.cardMetrics as any)?.fontSize).toBeCloseTo(
      24 * (218.68 / 126),
      2,
    );
  });

  it("keeps prompt on awers for explicit answerOnly cards even when reversed is requested", async () => {
    render(
      <Card
        {...createProps({
          reversed: true,
          selectedItem: makeCard({
            id: 11,
            text: "cat",
            translations: ["kot"],
            answerOnly: true,
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.promptText).toBe("cat");
    });

    expect(latestResolverProps).toMatchObject({
      answerOnly: true,
      promptText: "cat",
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
  });

  it.each([
    { box: "boxOne" as const, prompt: "woda", frontAnswer: true, image: null },
    { box: "boxTwo" as const, prompt: "eau", frontAnswer: false, image: "front://water" },
    { box: "boxThree" as const, prompt: "woda", frontAnswer: true, image: null },
    { box: "boxFour" as const, prompt: "eau", frontAnswer: false, image: "front://water" },
    { box: "boxFive" as const, prompt: "woda", frontAnswer: true, image: null },
  ])("shows the French-course prompt and input language in $box", async ({ box, prompt, frontAnswer, image }) => {
    const card = makeCard({
      id: 15, text: "eau", translations: ["woda"], flipped: true,
      imageFront: "front://water",
    });
    render(<Card {...createProps({
      selectedItem: card, activeBox: box, reversed: isStudyCardReversed(card, box, true),
    })} />);
    await waitFor(() => expect(latestResolverProps).toMatchObject({
      promptText: prompt,
      promptImageUri: image,
      shouldCorrectAwers: frontAnswer,
      shouldCorrectRewers: !frontAnswer,
    }));
  });

  it.each([
    { box: "boxOne" as const, prompt: "water", frontAnswer: false, image: "front://water" },
    { box: "boxTwo" as const, prompt: "woda", frontAnswer: true, image: null },
    { box: "boxThree" as const, prompt: "water", frontAnswer: false, image: "front://water" },
    { box: "boxFour" as const, prompt: "woda", frontAnswer: true, image: null },
    { box: "boxFive" as const, prompt: "water", frontAnswer: false, image: "front://water" },
  ])("preserves the English A1 prompt and input language without box zero in $box", async ({ box, prompt, frontAnswer, image }) => {
    const card = makeCard({
      id: 16, text: "water", translations: ["woda"], flipped: true,
      imageFront: "front://water",
    });
    render(<Card {...createProps({
      selectedItem: card, activeBox: box, reversed: isStudyCardReversed(card, box, false),
    })} />);
    await waitFor(() => expect(latestResolverProps).toMatchObject({
      promptText: prompt,
      promptImageUri: image,
      shouldCorrectAwers: frontAnswer,
      shouldCorrectRewers: !frontAnswer,
    }));
  });

  it("uses the reversed translation as prompt for normal reversed cards", async () => {
    render(
      <Card
        {...createProps({
          reversed: true,
          selectedItem: makeCard({
            id: 12,
            text: "cat",
            translations: ["kot", "kotek"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.promptText).toBe("kot");
    });

    expect(latestResolverProps).toMatchObject({
      answerOnly: false,
      promptText: "kot",
      shouldCorrectAwers: true,
      shouldCorrectRewers: false,
    });
  });

  it("shows split front_text values one at a time with prompt toggle", async () => {
    render(
      <Card
        {...createProps({
          selectedItem: makeCard({
            id: 13,
            text: "hello; hi",
            translations: ["cześć"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.promptText).toBe("hello");
    });

    expect(latestResolverProps).toMatchObject({
      canToggleTranslations: true,
      promptText: "hello",
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });

    act(() => {
      (latestResolverProps?.next as () => void)();
    });

    await waitFor(() => {
      expect(latestResolverProps?.promptText).toBe("hi");
    });
  });

  it.each([false, true])("renders intro input and ghost answer for direction reversed=%s", async (reversed) => {
    const selectedItem = makeCard({ id: 12, text: "water", translations: ["woda"], imageFront: "front://image", imageBack: "back://image" });
    render(<Card {...createProps({
      selectedItem,
      introMode: true,
      correction: {
        cardId: selectedItem.id, awers: "water", rewers: "woda", input1: "", input2: "",
        mode: "intro", promptText: "water",
        promptImageUri: "front://image", reversed, word: selectedItem,
      },
    })} />);
    await waitFor(() => expect(latestResolverProps?.displayMode).toBe("correction"));
    expect(latestResolverProps).toMatchObject({
      promptText: "water",
      promptImageUri: "front://image",
      correctionAwers: "water", correctionRewers: "woda",
      shouldCorrectAwers: reversed, shouldCorrectRewers: !reversed,
    });
  });

  it("switches correction prompt source to correction payload", async () => {
    render(
      <Card
        {...createProps({
          result: false,
          correction: {
            cardId: 13,
            awers: "cat",
            rewers: "kot",
            input1: "",
            input2: "",
            mode: "demote",
            promptText: "prompt from correction",
            promptImageUri: "correction://image",
            reversed: false,
          },
          selectedItem: makeCard({
            id: 13,
            text: "cat",
            translations: ["kot"],
            imageFront: "front://image",
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    expect(latestResolverProps).toMatchObject({
      promptText: "prompt from correction",
      promptImageUri: "correction://image",
      correctionAwers: "cat",
      correctionRewers: "kot",
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
  });

  it("cycles correction translation target and clears its input", async () => {
    const CorrectionSwitchHarness = () => {
      const [correction, setCorrection] = React.useState({
        cardId: 132,
        awers: "smart",
        rewers: "szczypać",
        input1: "smart",
        input2: "szcz",
        mode: "demote" as const,
        promptText: "smart",
        promptImageUri: "front://image",
        reversed: false,
        word: makeCard({
          id: 132,
          text: "smart",
          translations: ["szczypać", "boleć"],
          imageFront: "front://image",
        }),
      });

      return (
        <Card
          {...createProps({
            result: false,
            correction,
            selectedItem: makeCard({
              id: 132,
              text: "smart",
              translations: ["szczypać", "boleć"],
              imageFront: "front://image",
            }),
            setCorrectionRewers: (rewers) =>
              setCorrection((current) => ({ ...current, rewers })),
            wrongInputChange: (which, value) =>
              setCorrection((current) => ({
                ...current,
                [which === 1 ? "input1" : "input2"]: value,
              })),
          })}
        />
      );
    };

    render(<CorrectionSwitchHarness />);

    await waitFor(() => {
      expect(latestResolverProps).toMatchObject({
        displayMode: "correction",
        canToggleTranslations: true,
        correctionRewers: "szczypać",
        promptImageUri: "front://image",
      });
    });

    act(() => {
      (latestResolverProps?.next as () => void)();
    });

    await waitFor(() => {
      expect(latestResolverProps).toMatchObject({
        correctionRewers: "boleć",
        correction: expect.objectContaining({ input1: "smart", input2: "" }),
      });
    });

    act(() => {
      (latestResolverProps?.next as () => void)();
    });

    await waitFor(() => {
      expect(latestResolverProps?.correctionRewers).toBe("szczypać");
    });
  });

  it("hides correction translation toggle without a translation input or alternative", async () => {
    const correction = {
      cardId: 133,
      awers: "smart",
      rewers: "szczypać",
      input1: "",
      input2: "",
      mode: "demote" as const,
      promptText: "szczypać",
      reversed: true,
      word: makeCard({
        id: 133,
        text: "smart",
        translations: ["szczypać", "boleć"],
      }),
    };

    const { rerender } = render(
      <Card
        {...createProps({
          result: false,
          correction,
          reversed: true,
          selectedItem: makeCard({
            id: 133,
            text: "smart",
            translations: ["szczypać", "boleć"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.canToggleTranslations).toBe(false);
    });

    rerender(
      <Card
        {...createProps({
          result: false,
          correction: {
            ...correction,
            reversed: false,
            word: makeCard({
              id: 133,
              text: "smart",
              translations: ["szczypać"],
            }),
          },
          selectedItem: makeCard({
            id: 133,
            text: "smart",
            translations: ["szczypać"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.canToggleTranslations).toBe(false);
    });
  });

  it("keeps full ghost correction text visible after typing a prefix", async () => {
    render(
      <Card
        {...createProps({
          result: false,
          correction: {
            cardId: 131,
            awers: "poproszę to",
            rewers: "je voudrais ça",
            input1: "",
            input2: "j",
            mode: "demote",
            promptText: "poproszę to",
            reversed: false,
          },
          selectedItem: makeCard({
            id: 131,
            text: "poproszę to",
            translations: ["je voudrais ça"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    const renderCorrectionGhostText = latestResolverProps?.renderCorrectionGhostText as (
      value: string,
      expected: string,
    ) => React.ReactNode;
    const ghosts = render(<>{renderCorrectionGhostText("j", "je voudrais ça")}</>);
    const segments = ghosts.UNSAFE_getAllByType(Text);

    expect(segments.map((segment) => segment.props.children).join(""))
      .toBe("je\u00A0voudrais\u00A0ça");
    expect(segments[0].props.style).toContainEqual({ opacity: 0 });
    expect(segments[1].props.style).not.toContainEqual({ opacity: 0 });

    const renderCorrectionErrorText = latestResolverProps?.renderCorrectionErrorText as (
      value: string,
      expected: string,
    ) => React.ReactNode;
    expect(renderCorrectionErrorText("j", "je voudrais ça")).toBeNull();
    expect(renderCorrectionErrorText("x", "je voudrais ça")).not.toBeNull();
  });

  it("keeps emoji intact and uses the overridden text color in ghost correction text", async () => {
    render(
      <Card
        {...createProps({
          textColorOverride: "#123456",
          result: false,
          correction: {
            cardId: 132,
            awers: "👋 hello",
            rewers: "cześć",
            input1: "",
            input2: "",
            mode: "demote",
            promptText: "👋 hello",
            reversed: false,
          },
          selectedItem: makeCard({
            id: 132,
            text: "👋 hello",
            translations: ["cześć"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    const renderCorrectionGhostText = latestResolverProps?.renderCorrectionGhostText as (
      value: string,
      expected: string,
    ) => React.ReactNode;
    const ghosts = render(<>{renderCorrectionGhostText("👋", "👋 hello")}</>);
    const segments = ghosts.UNSAFE_getAllByType(Text);

    expect(segments[0].props.children).toBe("👋");
    expect(segments[0].props.style).toContainEqual({ opacity: 0 });
    expect(segments[1].props.style).toContainEqual({
      color: "#123456",
      opacity: 0.38,
    });
  });

  it("shows both correction sides when correction answerOnly forces front-only mode", async () => {
    render(
      <Card
        {...createProps({
          result: false,
          correction: {
            cardId: 14,
            awers: "cat",
            rewers: "kot",
            input1: "",
            input2: "",
            mode: "demote",
            promptText: "cat",
            reversed: true,
            answerOnly: true,
          },
          selectedItem: makeCard({
            id: 14,
            text: "cat",
            translations: ["kot"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    expect(latestResolverProps).toMatchObject({
      promptText: "cat",
      shouldCorrectAwers: true,
      shouldCorrectRewers: true,
    });
  });

  it("uses the active translation as correctionRewers in intro mode", async () => {
    const setCorrectionRewers = jest.fn();

    render(
      <Card
        {...createProps({
          introMode: true,
          correction: {
            cardId: 15,
            awers: "cat",
            rewers: "stale-value",
            input1: "",
            input2: "",
            mode: "intro",
            promptText: "cat",
            reversed: false,
          },
          selectedItem: makeCard({
            id: 15,
            text: "cat",
            translations: ["kot", "kotek"],
          }),
          setCorrectionRewers,
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    expect(latestResolverProps).toMatchObject({
      correctionRewers: "kot",
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
    expect(setCorrectionRewers).toHaveBeenCalledWith("kot");
  });

  it("requests main focus when leaving correction mode", async () => {
    const screen = renderCard(
      createProps({
        result: false,
        correction: {
          cardId: 16,
          awers: "cat",
          rewers: "kot",
          input1: "",
          input2: "",
          mode: "demote",
          promptText: "cat",
          reversed: false,
        },
        selectedItem: makeCard({
          id: 16,
          text: "cat",
          translations: ["kot"],
        }),
      }),
    );

    await waitFor(() => {
      expect(mockRequestFocus).toHaveBeenCalledWith("correction2");
    });

    mockRequestFocus.mockClear();

    screen.rerender(
      <Card
        {...createProps({
          result: null,
          correction: null,
          selectedItem: makeCard({
            id: 16,
            text: "cat",
            translations: ["kot"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(mockRequestFocus).toHaveBeenCalledWith("main");
    });
    expect(mockRequestFocus).not.toHaveBeenCalledWith("none");
  });

  it("primes the keyboard bridge before confirming an answer that enters correction", async () => {
    const confirm = jest.fn();
    const textInputFocus = jest.fn();

    renderCard(
      createProps({
        answer: "pies",
        confirm,
        selectedItem: makeCard({
          id: 17,
          text: "cat",
          translations: ["kot"],
        }),
      }),
      { textInputFocus },
    );

    await waitFor(() => {
      expect(latestResolverProps?.handleConfirm).toEqual(expect.any(Function));
    });

    act(() => {
      (latestResolverProps?.handleConfirm as () => void)();
    });

    expect(textInputFocus).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith("kot");
    expect(textInputFocus.mock.invocationCallOrder[0]).toBeLessThan(
      confirm.mock.invocationCallOrder[0],
    );
  });

  it.each([
    [true, true, "¿Hola?", true],
    [true, false, "¿Hola?", true],
    [false, true, "?Hola?", true],
    [false, false, "?Hola?", false],
  ])("keeps conversion=%s and tolerance=%s independent", (conversion, tolerance, stored, accepted) => {
    jest.useFakeTimers();
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), spellChecking: false,
      autoConvertSpanishPunctuation: conversion, ignoreBoundaryPunctuation: tolerance });
    const props = createProps({ autoSubmitCorrectAnswer: true,
      selectedItem: makeCard({ id: 71, translations: ["¿Hola?"] }) });
    renderCard(props);
    act(() => {
      (latestResolverProps?.handleAnswerChange as (value: string) => void)("?Hola?");
      jest.advanceTimersByTime(200);
    });
    expect(props.setAnswer).toHaveBeenCalledWith(stored);
    expect(props.confirm).toHaveBeenCalledTimes(accepted ? 1 : 0);
    if (accepted) expect(props.confirm).toHaveBeenCalledWith(undefined, stored);
    jest.useRealTimers();
  });

  it("converts against the front alternatives for reversed cards", () => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), autoConvertSpanishPunctuation: true });
    const props = createProps({ reversed: true,
      selectedItem: makeCard({ id: 72, text: "¿Hola?; ¿Qué tal?", translations: ["hello"] }) });
    renderCard(props);
    act(() => (latestResolverProps?.handleAnswerChange as (value: string) => void)("?"));
    expect(props.setAnswer).toHaveBeenCalledWith("¿");
  });

  it("converts both correction fields before saving and advances without omitted marks", () => {
    const completed = jest.fn();
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), autoConvertSpanishPunctuation: true,
      ignoreBoundaryPunctuation: true });
    mockedUseCardFocusController.mockReturnValue({ focusTarget: "correction1", focusRequestId: 0,
      requestFocus: mockRequestFocus, onCorrection1Completed: completed, onHintEditStarted: jest.fn() });
    const props = createProps({ correction: { cardId: 73, awers: "¿Hola?", rewers: "¡Hello!",
      input1: "", input2: "", mode: "intro" }, introMode: true,
      selectedItem: makeCard({ id: 73, text: "¿Hola?", translations: ["¡Hello!"] }) });
    renderCard(props);
    act(() => {
      (latestResolverProps?.handleCorrectionInput1Change as (value: string) => void)("?Hola?");
      (latestResolverProps?.wrongInputChange as (which: number, value: string) => void)(2, "!Hello!");
    });
    expect(props.wrongInputChange).toHaveBeenCalledWith(1, "¿Hola?");
    expect(props.wrongInputChange).toHaveBeenCalledWith(2, "¡Hello!");
    expect(completed).toHaveBeenCalledTimes(1);
    act(() => (latestResolverProps?.handleCorrectionInput1Change as (value: string) => void)("Hola"));
    expect(completed).toHaveBeenCalledTimes(2);
    expect((latestResolverProps?.hasCorrectionMismatch as (value: string, expected: string) => boolean)("Hola", "¿Hola?")).toBe(false);
  });

  it("shows only the real typo at the original input offset", () => {
    mockedUseSettings.mockReturnValue({ ...mockedUseSettings(), ignoreBoundaryPunctuation: true });
    renderCard(createProps({ result: true, answer: "?Holo?",
      selectedItem: makeCard({ id: 74, translations: ["¿Hola?"] }) }));
    expect(latestResolverProps?.typoDiff).toMatchObject({ index: 4, inputChar: "o", expectedChar: "a" });
  });

  it("automatically confirms a correct main answer after 200 ms when enabled", async () => {
    jest.useFakeTimers();
    const confirm = jest.fn();

    renderCard(
      createProps({
        autoSubmitCorrectAnswer: true,
        confirm,
        selectedItem: makeCard({ id: 19, translations: ["kot"] }),
      }),
    );

    await waitFor(() => {
      expect(latestResolverProps?.handleAnswerChange).toEqual(expect.any(Function));
    });

    act(() => {
      (latestResolverProps?.handleAnswerChange as (value: string) => void)("kot");
      jest.advanceTimersByTime(199);
    });
    expect(confirm).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(confirm).toHaveBeenCalledWith(undefined, "kot");
    jest.useRealTimers();
  });

  it("does not automatically confirm when disabled, for wrong answers, or during correction", async () => {
    jest.useFakeTimers();
    const confirm = jest.fn();

    renderCard(
      createProps({
        confirm,
        selectedItem: makeCard({ id: 20, translations: ["kot"] }),
      }),
    );
    await waitFor(() => {
      expect(latestResolverProps?.handleAnswerChange).toEqual(expect.any(Function));
    });

    act(() => {
      (latestResolverProps?.handleAnswerChange as (value: string) => void)("kot");
      jest.advanceTimersByTime(300);
    });
    expect(confirm).not.toHaveBeenCalled();

    renderCard(
      createProps({
        autoSubmitCorrectAnswer: true,
        confirm,
        result: false,
        correction: {
          cardId: 20,
          awers: "cat",
          rewers: "kot",
          input1: "",
          input2: "",
          mode: "demote",
          promptText: "cat",
          promptImageUri: null,
          reversed: false,
        },
        selectedItem: makeCard({ id: 20, translations: ["kot"] }),
      }),
    );
    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });
    act(() => {
      (latestResolverProps?.handleAnswerChange as (value: string) => void)("kot");
      jest.advanceTimersByTime(300);
    });
    expect(confirm).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("retries automatic confirmation when the first attempt is blocked", async () => {
    jest.useFakeTimers();
    const confirm = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);

    renderCard(
      createProps({
        autoSubmitCorrectAnswer: true,
        confirm,
        selectedItem: makeCard({ id: 21, translations: ["kot"] }),
      }),
    );
    await waitFor(() => {
      expect(latestResolverProps?.handleAnswerChange).toEqual(expect.any(Function));
    });

    act(() => {
      (latestResolverProps?.handleAnswerChange as (value: string) => void)("kot");
      jest.advanceTimersByTime(200);
    });
    expect(confirm).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(confirm).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(confirm).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it.each([false, true])("completes box-zero input using the screen bridge without focusing the scrolled card (reversed=%s)", async (reversed) => {
    const wrongInputChange = jest.fn();
    const cardInputFocus = jest.fn();
    const screenBridgeFocus = jest.fn();
    const keyboardBridgeInputRef = {
      current: { focus: screenBridgeFocus } as unknown as TextInput,
    };
    renderCard(createProps({
      keyboardBridgeInputRef,
      introMode: true,
      selectedItem: makeCard({ id: 18, text: "cat", translations: ["kot"] }),
      correction: {
        cardId: 18, awers: "cat", rewers: "kot", input1: "", input2: "",
        mode: "intro", promptText: "cat", reversed,
      },
      wrongInputChange,
    }), { textInputFocus: cardInputFocus });

    await waitFor(() => expect(latestResolverProps?.displayMode).toBe("correction"));
    const which = reversed ? 1 : 2;
    const value = reversed ? "cat" : "kot";
    act(() => {
      (latestResolverProps?.wrongInputChange as (which: 1 | 2, value: string) => void)(which, value);
    });

    expect(screenBridgeFocus).toHaveBeenCalledTimes(1);
    expect(cardInputFocus).not.toHaveBeenCalled();
    expect(wrongInputChange).toHaveBeenCalledWith(which, value);
    expect(screenBridgeFocus.mock.invocationCallOrder[0]).toBeLessThan(wrongInputChange.mock.invocationCallOrder[0]);
  });

  it("primes the keyboard bridge before completing correction input changes", async () => {
    const wrongInputChange = jest.fn();
    const textInputFocus = jest.fn();

    renderCard(
      createProps({
        result: false,
        correction: {
          cardId: 18,
          awers: "cat",
          rewers: "kot",
          input1: "",
          input2: "",
          mode: "demote",
          promptText: "cat",
          reversed: false,
        },
        wrongInputChange,
        selectedItem: makeCard({
          id: 18,
          text: "cat",
          translations: ["kot"],
        }),
      }),
      { textInputFocus },
    );

    await waitFor(() => {
      expect(latestResolverProps?.wrongInputChange).toEqual(expect.any(Function));
    });

    act(() => {
      (latestResolverProps?.wrongInputChange as (
        which: 1 | 2,
        value: string,
      ) => void)(2, "kot");
    });

    expect(textInputFocus).toHaveBeenCalledTimes(1);
    expect(wrongInputChange).toHaveBeenCalledWith(2, "kot");
    expect(textInputFocus.mock.invocationCallOrder[0]).toBeLessThan(
      wrongInputChange.mock.invocationCallOrder[0],
    );
  });

  it("saves hints directly on cards that cannot be reversed", async () => {
    const onHintUpdate = jest.fn();

    renderCard(
      createProps({
        onHintUpdate,
        selectedItem: makeCard({
          id: 19,
          text: "Is this true?",
          translations: ["true"],
          type: "true_false",
        }),
      }),
    );

    act(() => {
      (latestCardHintProps?.setHintDraft as (value: string) => void)("hint");
    });

    await waitFor(() => {
      expect(latestCardHintProps?.hintDraft).toBe("hint");
    });

    act(() => {
      (latestCardHintProps?.finishHintEditing as () => void)();
    });

    await waitFor(() => {
      expect(onHintUpdate).toHaveBeenCalledWith(19, "hint", null);
    });

    expect(latestNudgeModalProps?.visible).toBe(false);
  });

  it("keeps an open hint editor and its draft when a smaller layout hides hints", () => {
    const props = createProps();
    const screen = renderCard(props);
    act(() => {
      (latestCardHintProps?.startHintEditing as () => void)();
    });
    act(() => {
      (latestCardHintProps?.setHintDraft as (value: string) => void)("unfinished hint");
    });
    latestCardHintProps = null;
    screen.rerender(<Card {...props} hideHints />);
    expect(latestCardHintProps).toMatchObject({ isEditingHint: true, hintDraft: "unfinished hint" });
    act(() => {
      (latestCardHintProps?.cancelHintEditing as () => void)();
    });
    latestCardHintProps = null;
    screen.rerender(<Card {...props} hideHints />);
    expect(latestCardHintProps).toBeNull();
  });

  it("passes hint tutorial controls to the hint component", () => {
    const shouldStartHintEditing = jest.fn(() => false);

    renderCard(
      createProps({
        hintCoachmarkId: "flashcards-hint-section",
        shouldStartHintEditing,
      }),
    );

    expect(latestCardHintProps).toMatchObject({
      hintCoachmarkId: "flashcards-hint-section",
      shouldStartHintEditing,
    });
  });

  it("renders edit tab only when caller provides edit action", () => {
    const onEdit = jest.fn();
    const screen = renderCard(createProps({ onEdit }));

    fireEvent.press(screen.getByLabelText("flashcards.card.edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);

    screen.rerender(<Card {...createProps()} />);
    expect(screen.queryByLabelText("flashcards.card.edit")).toBeNull();
  });

  it("does not render the hint slot when hints are hidden", () => {
    const screen = renderCard(createProps({ hideHints: true }));

    expect(latestCardHintProps).toBeNull();
    expect(screen.queryByTestId("card-hint-placeholder")).toBeNull();
  });

  it("keeps hint space when hidden by caller", () => {
    const screen = renderCard(
      createProps({
        hideHints: true,
        reserveHintSpaceWhenHidden: true,
      }),
    );

    expect(latestCardHintProps).toBeNull();
    expect(screen.getByTestId("card-hint-placeholder")).toBeTruthy();
  });

  it("opens hint editing when the external hint edit token changes", async () => {
    const screen = renderCard(
      createProps({
        hintEditRequestToken: 0,
      }),
    );

    expect(latestCardHintProps?.isEditingHint).toBe(false);

    screen.rerender(
      <Card
        {...createProps({
          hintEditRequestToken: 1,
        })}
      />,
    );

    await waitFor(() => {
      expect(latestCardHintProps?.isEditingHint).toBe(true);
    });
  });

  it("uses a side-choice hint modal for normal cards that can be reversed", async () => {
    const onHintUpdate = jest.fn();

    renderCard(
      createProps({
        onHintUpdate,
        selectedItem: makeCard({
          id: 20,
          text: "cat",
          translations: ["kot"],
        }),
      }),
    );

    act(() => {
      (latestCardHintProps?.setHintDraft as (value: string) => void)("hint");
    });

    await waitFor(() => {
      expect(latestCardHintProps?.hintDraft).toBe("hint");
    });

    act(() => {
      (latestCardHintProps?.finishHintEditing as () => void)();
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
    });
    expect(latestNudgeModalProps?.title).toBe("Gdzie zapisać podpowiedź?");
    expect(latestNudgeModalProps?.description).toBe(
      "Może być widoczna tylko przy tej stronie fiszki albo przy obu stronach.",
    );
    expect(latestNudgeModalProps?.confirmLabel).toBe("Obie strony fiszki");
    expect(latestNudgeModalProps?.secondaryLabel).toBe("Tylko ta strona");

    act(() => {
      (latestNudgeModalProps?.onSecondaryPress as () => void)();
    });

    expect(onHintUpdate).toHaveBeenCalledWith(20, "hint", null);

    act(() => {
      (latestCardHintProps?.setHintDraft as (value: string) => void)("both");
    });

    await waitFor(() => {
      expect(latestCardHintProps?.hintDraft).toBe("both");
    });

    act(() => {
      (latestCardHintProps?.finishHintEditing as () => void)();
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
    });

    act(() => {
      (latestNudgeModalProps?.onConfirm as () => void)();
    });

    expect(onHintUpdate).toHaveBeenCalledWith(20, "both", "both");
  });
});
