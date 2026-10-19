import React, { useEffect, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { Image, Text, TextInput } from "react-native";
import { useFlashcardAudio } from "@/Audio/runtime/useFlashcardAudio";
import Card from "@/src/components/card/card";
import { GhostAnswerText } from "@/src/components/card/subcomponents/GhostAnswerText";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CourseFrontImageRole } from "@/src/contexts/settings/types";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { CONFIRM_GUARD_MS } from "@/src/hooks/useConfirmGuard";
import {
  boxesWithCard, LANGUAGE_COURSE_CONTRACTS, LANGUAGE_STUDY_SCENARIOS, loadLanguageCourse,
  type AnswerSide, type LanguageCourseFixture,
} from "@/src/testSupport/cardLanguageScenarios";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { DEFAULT_LETTER_HINT_SETTINGS } from "@/src/utils/letterHints";

jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: jest.fn() }));
jest.mock("@/src/db/sqlite/db", () => ({
  logCustomLearningEvent: jest.fn(async () => undefined),
  logLearningHistoryEvent: jest.fn(async () => undefined),
}));
jest.mock("@/Audio/runtime/useFlashcardAudio", () => ({ useFlashcardAudio: jest.fn() }));
jest.mock("@/src/components/card/card-styles", () => ({
  PROMPT_IMAGE_MAX_HEIGHT: 140,
  useStyles: () => new Proxy({}, { get: () => ({}) }),
}));
jest.mock("@expo/vector-icons/Octicons", () => () => null);
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/src/components/nudge/NudgeModal", () => ({ NudgeModal: () => null }));
jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("react-native-mathjax-html-to-svg", () => ({ MathJaxSvg: () => null }));
jest.mock("react-native-text-ticker", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: NativeText } = require("react-native");
  return NativeText;
});
jest.mock("expo-image", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Image: NativeImage } = require("react-native");
  return { Image: NativeImage };
});
jest.mock("@/src/features/flashcards/flashcardImagePreload", () => ({
  getPreloadedImage: (uri: string) => ({ kind: "bitmap", uri, ratio: 1 }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { text?: string; prefix?: string }) => {
      if (key === "flashcards.card.readText") return `read:${options?.text}`;
      if (key === "flashcards.card.input.letterHint") return `prefix:${options?.prefix}`;
      return key;
    },
  }),
}));

const mockedSettings = useSettings as jest.Mock;
const mockedAudio = jest.mocked(useFlashcardAudio);
const read = jest.fn();
const onCorrect = jest.fn();
const onWrong = jest.fn();
const registerKnownWord = jest.fn(() => ({ wasNewMastered: false, nextKnownWordsCount: 0 }));
const addUsedWordIds = jest.fn();
const courses = LANGUAGE_COURSE_CONTRACTS.map(loadLanguageCourse);
const correctionLabel = { 1: "flashcards.card.input.frontCorrectionLabel", 2: "flashcards.card.input.backCorrectionLabel" };

function setCourseSettings(course: LanguageCourseFixture, role = course.settings.frontImageRole) {
  mockedSettings.mockReturnValue({
    activeCustomCourseId: course.courseId,
    courseFrontImageRole: "replace_front", // Active course must not override the explicit course ID.
    getCustomCourseFrontImageRole: (id: number) => id === course.courseId ? role : "standard",
    courseFrontImageRoleHydrated: true,
    letterHintSettingsHydrated: true,
    letterHintSettings: { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true },
    flashcardsCardSize: "normal", flashcardsImageSize: "dynamic", flashcardsImageFrameEnabled: false,
    flashcardsSuggestionsEnabled: false, spellChecking: false,
    ignoreDiacriticsInSpellcheck: false, ignoreBoundaryPunctuation: false,
    explanationOnlyOnWrong: false, showExplanationEnabled: false,
    colors: { my_yellow: "#facc15", my_green: "#00aa00", font: "#111111", headline: "#111111" },
  });
}

type StudyHarnessProps = {
  course: LanguageCourseFixture;
  box: keyof BoxesState;
  boxZeroEnabled?: boolean;
  introSide?: AnswerSide;
  card?: WordWithTranslations;
};

/** Exercise the real engine, answer checker, Card, resolver, scenes and TextInputs together. */
function StudyHarness({ course, box, boxZeroEnabled = true, introSide = "front", card = course.card }: StudyHarnessProps) {
  const [boxes, setBoxes] = useState(() => boxesWithCard(box, card));
  const [loadedCourseId, setLoadedCourseId] = useState<number | null>(null);
  const checkSpelling = useSpellchecking();
  const engine = useFlashcardsInteraction({
    boxes, setBoxes, checkSpelling, addUsedWordIds, registerKnownWord,
    onCorrectAnswer: onCorrect, onWrongAnswer: onWrong,
    boxZeroEnabled, boxZeroAnswerSide: introSide,
  });
  const { resetInteractionState, handleSelectBox, activeBox } = engine;

  useEffect(() => {
    resetInteractionState();
    setBoxes(boxesWithCard(box, card));
    setLoadedCourseId(course.courseId);
  }, [box, card, course.courseId, resetInteractionState]);
  useEffect(() => {
    if (loadedCourseId === course.courseId && activeBox == null) handleSelectBox(box);
  }, [activeBox, box, course.courseId, handleSelectBox, loadedCourseId]);

  return <>
    <Text testID="engine-result">{String(engine.result)}</Text>
    <Text testID="remaining-in-box">{boxes[box].length}</Text>
    <Card
      {...engine}
      audioCourseId={course.courseId}
      contentDebugSource="flashcards"
      introMode={box === "boxZero"}
      isFocused
      hideHints
      disableLayoutAnimation
      autoSubmitCorrectAnswer={false}
      showExplanationEnabled={false}
      explanationOnlyOnWrong={false}
      inlineAction={{ disabled: false, label: "confirm", onCorrectionConfirm: () => undefined }}
    />
  </>;
}

function renderStudy(props: StudyHarnessProps, role?: CourseFrontImageRole) {
  setCourseSettings(props.course, role);
  return render(<StudyHarness {...props} />, {
    createNodeMock: () => ({ focus: jest.fn(), blur: jest.fn(), scrollTo: jest.fn() }),
  });
}

type StudyScreen = ReturnType<typeof renderStudy>;

function expectImage(screen: StudyScreen, uri: string | null) {
  const images = screen.UNSAFE_queryAllByType(Image);
  expect(images.map((node) => node.props.source.uri)).toEqual(uri ? [uri] : []);
}

function expectGhostText(screen: StudyScreen, expected: string) {
  const ghost = screen.UNSAFE_getByType(GhostAnswerText);
  const letters = within(ghost).getAllByText(/./, { includeHiddenElements: true });
  expect(letters.map((node) => node.props.children).join("")).toBe(expected);
}

async function submit(screen: StudyScreen, value: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText("flashcards.card.input.answerLabel"), value);
  });
  await act(async () => fireEvent.press(screen.getByTestId("card-inline-confirm")));
}

describe("Card language integration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0.999999);
    mockedAudio.mockImplementation((_course, _externalId, _context, enabled) => ({ available: enabled, read }) as ReturnType<typeof useFlashcardAudio>);
  });
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it.each(LANGUAGE_STUDY_SCENARIOS)(
    "$slug / $box / zero=$boxZeroEnabled renders and accepts $answerSide",
    async ({ course, box, boxZeroEnabled, answerSide, expected }) => {
      const screen = renderStudy({ course, box, boxZeroEnabled });
      const prompt = expected.prompts.replace_back;
      expectImage(screen, prompt.imageUri);
      if (prompt.text) expect(screen.getByText(prompt.text)).toBeTruthy();
      for (const answer of expected.answers) expect(screen.queryByText(answer)).toBeNull();
      const input = screen.getByLabelText("flashcards.card.input.answerLabel");
      expect(input.props.value).toBe("");
      if (box === "boxOne" || box === "boxTwo") {
        expect(input.props.accessibilityHint).toBe(`prefix:${expected.letterHint}`);
        const hint = screen.getByTestId("card-letter-hint", { includeHiddenElements: true });
        expect(within(hint).getByText(expected.letterHint, { includeHiddenElements: true })).toBeTruthy();
      } else {
        expect(screen.queryByTestId("card-letter-hint", { includeHiddenElements: true })).toBeNull();
      }
      if (prompt.audioSide) {
        fireEvent.press(screen.getByLabelText(`read:${prompt.text}`));
        expect(read).toHaveBeenLastCalledWith(prompt.audioSide, prompt.text);
      } else {
        expect(screen.queryAllByLabelText(/^read:/)).toHaveLength(0);
        expect(mockedAudio).toHaveBeenLastCalledWith(course.courseId, course.externalId, expect.any(String), false, expect.objectContaining({ phase: "question", text: "" }));
      }
      await submit(screen, expected.answers[0]);
      expect(screen.getByTestId("engine-result")).toHaveTextContent("true");
      expect(onCorrect).toHaveBeenCalledTimes(1);
      expect(onWrong).not.toHaveBeenCalled();
      expect(mockedAudio).toHaveBeenLastCalledWith(course.courseId, course.externalId, expect.any(String), true,
        expect.objectContaining({ side: answerSide, text: expected.answers[0], phase: "answer" }));
    },
  );

  it.each(courses.flatMap((course) => (["standard", "replace_front", "replace_back"] as const).flatMap((role) => [
    { slug: course.slug, course, role, box: "boxOne" as const, answerSide: "front" as const, expected: course.expectations.front },
    { slug: course.slug, course, role, box: "boxTwo" as const, answerSide: "back" as const, expected: course.expectations.back },
  ])))("$slug / $box / $role rejects opposite language and corrects $answerSide", async ({ course, role, box, expected, answerSide }) => {
    const screen = renderStudy({ course, box }, role);
    const prompt = expected.prompts[role];
    expectImage(screen, prompt.imageUri);
    if (prompt.text) expect(screen.getByText(prompt.text)).toBeTruthy();
    await submit(screen, expected.rejected[0]);
    const label = correctionLabel[expected.correctionInput];
    const correctionInput = screen.getByLabelText(label);
    expect(screen.UNSAFE_getAllByType(TextInput).filter((node) => !node.props.caretHidden)).toHaveLength(1);
    expect(screen.queryByLabelText("flashcards.card.input.answerLabel")).toBeNull();
    expectImage(screen, prompt.imageUri);
    // The real ghost overlay must show the complete target, not the submitted word.
    expectGhostText(screen, expected.answers[0]);
    expect(screen.getByTestId("engine-result")).toHaveTextContent("false");
    expect(onWrong).toHaveBeenCalledTimes(1);
    expect(onCorrect).not.toHaveBeenCalled();
    expect(mockedAudio).toHaveBeenLastCalledWith(course.courseId, course.externalId, expect.any(String), true,
      expect.objectContaining({ side: answerSide, text: expected.answers[0], phase: "answer" }));
    await act(async () => fireEvent.changeText(correctionInput, expected.rejected[0]));
    await act(async () => jest.advanceTimersByTime(5000));
    expect(screen.getByLabelText(label)).toBeTruthy();
    expect(screen.getByTestId("remaining-in-box")).toHaveTextContent("1");
    await act(async () => fireEvent.changeText(screen.getByLabelText(label), expected.answers[0]));
    await waitFor(() => expect(screen.getByTestId("remaining-in-box")).toHaveTextContent("0"));
  });

  it.each(courses.flatMap((course) => (["front", "back"] as const).map((answerSide) => ({
    slug: course.slug, course, answerSide, expected: course.expectations[answerSide],
  }))))("$slug / boxZero copies and reads $answerSide", async ({ course, answerSide, expected }) => {
    const screen = renderStudy({ course, box: "boxZero", introSide: answerSide });
    // Image intros show the picture above the copying overlay, without a duplicate text prompt.
    expect(screen.queryByText(course.introPrompt)).toBeNull();
    expectImage(screen, "water.webp");
    const input = screen.getByLabelText(correctionLabel[expected.correctionInput]);
    expect(input.props.value).toBe("");
    expectGhostText(screen, expected.answers[0]);
    fireEvent(input, "pressIn");
    expect(read).toHaveBeenLastCalledWith(answerSide, expected.answers[0]);
    await act(async () => fireEvent.changeText(input, expected.rejected[0]));
    expect(screen.getByTestId("remaining-in-box")).toHaveTextContent("1");
    await act(async () => fireEvent.changeText(input, expected.answers[0]));
    await waitFor(() => expect(screen.getByTestId("remaining-in-box")).toHaveTextContent("0"));
  });

  it.each(courses.flatMap((course) => (["front", "back"] as const).map((answerSide) => ({
    slug: course.slug, course, answerSide, expected: course.expectations[answerSide],
  }))))("$slug / boxZero without image copies $answerSide with the opposite text prompt", async ({ course, answerSide, expected }) => {
    const screen = renderStudy({ course, box: "boxZero", introSide: answerSide, card: { ...course.card, imageFront: null } });
    const prompt = expected.prompts.standard;
    expect(screen.getByText(prompt.text)).toBeTruthy();
    expectImage(screen, null);
    expectGhostText(screen, expected.answers[0]);
    const input = screen.getByLabelText(correctionLabel[expected.correctionInput]);
    await act(async () => fireEvent.changeText(input, expected.answers[0]));
    await waitFor(() => expect(screen.getByTestId("remaining-in-box")).toHaveTextContent("0"));
  });

  it.each(courses.flatMap((course) => [
    { slug: course.slug, course, mode: "flipped=false", overrides: { flipped: false }, prompt: course.expectations.back.prompts.replace_back },
    { slug: course.slug, course, mode: "answerOnly", overrides: { answerOnly: true }, prompt: course.expectations.back.prompts.standard },
  ]))("$slug / boxOne / $mode keeps front-to-back learning", async ({ course, overrides, prompt }) => {
    const screen = renderStudy({ course, box: "boxOne", card: { ...course.card, ...overrides } });
    expect(screen.getByText(prompt.text)).toBeTruthy();
    expectImage(screen, prompt.imageUri);
    await submit(screen, course.expectations.back.answers[0]);
    expect(screen.getByTestId("engine-result")).toHaveTextContent("true");
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it.each(["answer", "correction"] as const)("switches course without retaining the previous %s, hint or audio", async (phase) => {
    const original = courses[1];
    const next = courses[3];
    const screen = renderStudy({ course: original, box: "boxOne" });
    if (phase === "correction") await submit(screen, "water");
    else await act(async () => fireEvent.changeText(screen.getByLabelText("flashcards.card.input.answerLabel"), "ea"));
    setCourseSettings(next);
    await act(async () => screen.rerender(<StudyHarness course={next} box="boxOne" />));
    const input = screen.getByLabelText("flashcards.card.input.answerLabel");
    expect(input.props.value).toBe("");
    expect(input.props.accessibilityHint).toBe("prefix:w");
    expect(screen.queryByLabelText(correctionLabel[1])).toBeNull();
    expect(screen.queryByText("eau")).toBeNull();
    expect(screen.getByTestId("engine-result")).toHaveTextContent("null");
    await act(async () => jest.advanceTimersByTime(CONFIRM_GUARD_MS));
    await submit(screen, "woda");
    expect(onCorrect).toHaveBeenCalledTimes(1);
    expect(mockedAudio).toHaveBeenLastCalledWith(next.courseId, next.externalId, expect.any(String), true,
      expect.objectContaining({ side: "front", text: "woda", phase: "answer" }));
  });
});
