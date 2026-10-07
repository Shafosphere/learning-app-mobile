import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useCallback, useState } from "react";

import { useCourseOverrideSettings } from "@/src/contexts/settings/useCourseOverrideSettings";
import type { CustomCourseRecord } from "@/src/db/sqlite/db";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { useFlashcardsDistribution } from "../useFlashcardsDistribution";

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomReviewedFlashcardIds: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/src/services/debugEvents", () => ({
  appendDebugEvent: jest.fn().mockResolvedValue(undefined),
}));

const getItemImplementation = jest.mocked(AsyncStorage.getItem).getMockImplementation()!;

const cards: WordWithTranslations[] = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  text: `palabra ${index + 1}`,
  translations: [`słowo ${index + 1}`],
  flipped: true,
  type: "text",
}));
const course = { id: 7, reviewsEnabled: false } as CustomCourseRecord;
const noOp = () => undefined;
const emptyIds: number[] = [];
const emptyCards: WordWithTranslations[] = [];

function useStudySession() {
  const settings = useCourseOverrideSettings({
    courses: [], activeCourseIdx: null, activeCustomCourseId: 7,
  });
  const [boxes, setBoxes] = useState<BoxesState>({
    boxZero: [], boxOne: [], boxTwo: [], boxThree: [], boxFour: [], boxFive: [],
  });
  const [usedWordIds, setUsedWordIds] = useState<number[]>([]);
  const [, setBatchIndex] = useState(0);
  const addUsedWordIds = useCallback((ids: number[] | number) => {
    setUsedWordIds((previous) => [...new Set([...previous, ...([ids].flat())])]);
  }, []);
  const distribution = useFlashcardsDistribution({
    activeCustomCourseId: 7, loadedCourseId: 7, customCourse: course,
    customCards: cards, isFocused: true, isReady: true, isLoadingData: false,
    boxes, setBoxes, usedWordIds, addUsedWordIds, removeUsedWordIds: noOp,
    relearningWordIds: emptyIds, setBatchIndex, storageKey: "test-course-7",
    learned: emptyCards, setLearned: noOp, updateSelectedItem: noOp,
    boxZeroEnabled: settings.boxZeroEnabled,
    boxZeroSettingsHydrated: settings.boxZeroSettingsHydrated,
    flashcardsBatchSize: 10,
  });
  return { boxes, settings, distribution };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(() => {
  jest.mocked(AsyncStorage.getItem).mockImplementation(getItemImplementation);
  jest.restoreAllMocks();
});

it.each(
  [true, false].flatMap((enabled) => [
    "flashcards.boxZeroEnabled",
    "flashcards.courseBoxZeroOverrides",
    "flashcards.courseBoxZeroAnswerSideOverrides",
  ].map((delayedKey) => ({ enabled, delayedKey })))
)("waits for $delayedKey before placing the first 10 cards (box zero: $enabled)", async ({ enabled, delayedKey }) => {
  await AsyncStorage.multiSet([
    ["flashcards.boxZeroEnabled", "false"],
    ["flashcards.courseBoxZeroOverrides", JSON.stringify({ builtin: {}, custom: { "7": enabled } })],
    ["flashcards.courseBoxZeroAnswerSideOverrides", JSON.stringify({ builtin: {}, custom: { "7": "front" } })],
  ]);
  const delayedValue = await AsyncStorage.getItem(delayedKey);
  let resolveRead!: (value: string | null) => void;
  const delayedRead = new Promise<string | null>((resolve) => { resolveRead = resolve; });
  jest.spyOn(AsyncStorage, "getItem").mockImplementation((key) =>
    key === delayedKey ? delayedRead : getItemImplementation(key)
  );

  const { result } = renderHook(useStudySession);
  await act(async () => { await Promise.resolve(); });
  expect(result.current.settings.boxZeroSettingsHydrated).toBe(false);
  expect(result.current.boxes.boxZero).toHaveLength(0);
  expect(result.current.boxes.boxOne).toHaveLength(0);
  // Manual and automatic downloads must both wait for persisted settings.
  await act(async () => { await result.current.distribution.handleManualAddFlashcards(); });
  expect(result.current.boxes.boxOne).toHaveLength(0);
  expect(result.current.boxes.boxZero).toHaveLength(0);

  await act(async () => { resolveRead(delayedValue); });
  const target = enabled ? "boxZero" : "boxOne";
  const other = enabled ? "boxOne" : "boxZero";
  await waitFor(() => expect(result.current.boxes[target]).toHaveLength(10));
  expect(result.current.boxes[other]).toHaveLength(0);
  expect(result.current.settings.boxZeroAnswerSide).toBe("front");

  await act(async () => { await result.current.distribution.handleManualAddFlashcards(); });
  await waitFor(() => expect(result.current.boxes[target]).toHaveLength(20));
  expect(new Set(result.current.boxes[target].map((card) => card.id)).size).toBe(20);
  expect(result.current.boxes[other]).toHaveLength(0);
});
