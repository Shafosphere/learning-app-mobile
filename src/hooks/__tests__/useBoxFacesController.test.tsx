import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useBoxFacesController } from "../useBoxFacesController";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

type Params = Parameters<typeof useBoxFacesController>[0];
const baseBoxes: BoxesState = {
  boxZero: [], boxOne: [], boxTwo: [], boxThree: [], boxFour: [], boxFive: [],
};
const defaults: Params = { boxes: baseBoxes, activeBox: "boxOne", isFocused: true, resetKey: "course-1" };
const setup = () => renderHook((props: Params) => useBoxFacesController(props), { initialProps: defaults });
let changeAppState: (status: AppStateStatus) => void;

describe("useBoxFacesController", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0.9);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      changeAppState = listener;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("starts with individual personalities and restores them after selection", () => {
    const { result, rerender } = setup();
    expect(result.current.faces).toEqual({
      boxZero: "owo", boxOne: "nice", boxTwo: "ez", boxThree: "cheerful", boxFour: "sparkle", boxFive: "sleep",
    });
    act(() => result.current.handleSelection("boxOne"));
    expect(result.current.faces.boxOne).toBe("owo");
    act(() => jest.advanceTimersByTime(799));
    expect(result.current.faces.boxOne).toBe("owo");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.faces.boxOne).toBe("nice");
    rerender({ ...defaults, activeBox: "boxTwo" });
    expect(result.current.faces.boxTwo).toBe("ez");
  });

  it("counts batched answers across boxes and reacts only at exact thresholds", () => {
    const { result, rerender } = setup();
    act(() => {
      result.current.handleCorrectAnswer("boxOne");
      result.current.handleCorrectAnswer("boxOne");
    });
    rerender({ ...defaults, activeBox: "boxTwo" });
    act(() => result.current.handleCorrectAnswer("boxTwo"));
    expect(result.current.correctStreak).toBe(3);
    expect(result.current.faces.boxTwo).toBe("sparkle");
    act(() => result.current.handleCorrectAnswer("boxTwo"));
    expect(result.current.faces.boxTwo).toBe("happy");
    act(() => result.current.handleCorrectAnswer("boxTwo"));
    expect(result.current.faces.boxTwo).toBe("ez");
    act(() => result.current.handleCorrectAnswer("boxTwo"));
    expect(result.current.correctStreak).toBe(6);
    expect(result.current.faces.boxTwo).toBe("happy");
  });

  it("encourages after three errors and celebrates recovery after two", () => {
    const { result } = setup();
    act(() => result.current.handleWrongAnswer("boxOne"));
    expect(result.current.faces.boxOne).toBe("sad");
    act(() => result.current.handleWrongAnswer("boxTwo"));
    expect(result.current.faces.boxTwo).toBe("sad");
    act(() => result.current.handleWrongAnswer("boxTwo"));
    expect(result.current.faces.boxTwo).toBe("encouraging");
    act(() => result.current.handleWrongAnswer("boxOne"));
    expect(result.current.faces.boxOne).toBe("encouraging");
    act(() => result.current.handleCorrectAnswer("boxOne"));
    expect(result.current.faces.boxOne).toBe("relieved");
    expect(result.current.wrongStreak).toBe(0);
    expect(result.current.correctStreak).toBe(1);
    act(() => result.current.handleCorrectAnswer("boxOne"));
    expect(result.current.faces.boxOne).toBe("happy");
  });

  it("gives mastery priority over recovery and streaks while still counting answers", () => {
    const { result } = setup();
    act(() => {
      result.current.handleWrongAnswer("boxOne");
      result.current.handleWrongAnswer("boxOne");
      result.current.handleCorrectAnswer("boxOne", { preferLove: true });
    });
    expect(result.current.faces.boxOne).toBe("love");
    act(() => {
      result.current.handleCorrectAnswer("boxOne");
      result.current.handleCorrectAnswer("boxOne", { preferLove: true });
    });
    expect(result.current.correctStreak).toBe(3);
    expect(result.current.faces.boxOne).toBe("love");
    act(() => result.current.handleWrongAnswer("boxOne"));
    expect(result.current.correctStreak).toBe(0);
  });

  it("does not let selection or blocked interactions replace an answer", () => {
    const { result } = setup();
    act(() => {
      result.current.handleCorrectAnswer("boxOne");
      result.current.handleSelection("boxOne");
      result.current.handleBlockedInteraction("boxOne");
    });
    expect(result.current.faces.boxOne).toBe("happy");
    expect(result.current.correctStreak).toBe(1);
    act(() => jest.advanceTimersByTime(1200));
    act(() => result.current.handleBlockedInteraction("boxOne"));
    expect(result.current.faces.boxOne).toBe("owo");
    expect(result.current.correctStreak).toBe(1);
  });

  it("cancels the old timer when a new answer replaces a reaction", () => {
    const { result } = setup();
    act(() => result.current.handleWrongAnswer("boxOne"));
    act(() => jest.advanceTimersByTime(900));
    act(() => result.current.handleCorrectAnswer("boxOne"));
    act(() => jest.advanceTimersByTime(100));
    expect(result.current.faces.boxOne).toBe("happy");
    act(() => jest.advanceTimersByTime(1100));
    expect(result.current.faces.boxOne).toBe("nice");
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(["focus", "course"])("resets counters and timers on %s change", (change) => {
    const { result, rerender } = setup();
    act(() => result.current.handleCorrectAnswer("boxOne"));
    rerender({ ...defaults, ...(change === "focus" ? { isFocused: false } : { resetKey: "course-2" }) });
    expect(result.current.correctStreak).toBe(0);
    expect(result.current.faces.boxOne).toBe("nice");
    expect(jest.getTimerCount()).toBe(0);
    if (change === "focus") {
      act(() => result.current.handleCorrectAnswer("boxOne"));
      expect(result.current.correctStreak).toBe(0);
      rerender(defaults);
    }
    act(() => result.current.handleCorrectAnswer("boxOne"));
    expect(result.current.correctStreak).toBe(1);
  });

  it("clears reactions in background, keeps counters, and ignores background answers", () => {
    const { result } = setup();
    act(() => result.current.handleCorrectAnswer("boxOne"));
    act(() => changeAppState("background"));
    expect(result.current.faces.boxOne).toBe("nice");
    expect(result.current.correctStreak).toBe(1);
    expect(jest.getTimerCount()).toBe(0);
    act(() => result.current.handleCorrectAnswer("boxOne"));
    expect(result.current.correctStreak).toBe(1);
    act(() => changeAppState("active"));
    act(() => {
      result.current.handleCorrectAnswer("boxOne");
      result.current.handleCorrectAnswer("boxOne");
    });
    expect(result.current.faces.boxOne).toBe("sparkle");
  });

  it("removes timers for deleted boxes and cancels everything on unmount", () => {
    const { result, rerender, unmount } = setup();
    act(() => result.current.handleCorrectAnswer("boxOne"));
    const boxes = { ...baseBoxes };
    delete (boxes as Partial<BoxesState>).boxOne;
    rerender({ ...defaults, boxes });
    expect(result.current.faces.boxOne).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
    act(() => result.current.handleCorrectAnswer("boxOne"));
    expect(result.current.correctStreak).toBe(1);
    act(() => result.current.handleCorrectAnswer("boxTwo"));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

const word: WordWithTranslations = { id: 100, text: "word", translations: ["słowo"], flipped: false };
const filledBoxes = { ...baseBoxes, boxFive: [word] };

describe("box selection and final-box contents", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      changeAppState = listener;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("draws once per accepted manual selection, never on renders or automatic changes", () => {
    const { result, rerender } = setup();
    expect(Math.random).not.toHaveBeenCalled();
    rerender({ ...defaults, activeBox: "boxTwo" });
    expect(Math.random).not.toHaveBeenCalled();
    expect(result.current.faces.boxTwo).toBe("ez");
    act(() => result.current.handleSelection("boxTwo"));
    expect(result.current.faces.boxTwo).toBe("surprised");
    expect(Math.random).toHaveBeenCalledTimes(1);
    rerender({ ...defaults, activeBox: "boxTwo", boxes: { ...baseBoxes } });
    expect(Math.random).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(800));
    expect(result.current.faces.boxTwo).toBe("ez");
    jest.mocked(Math.random).mockReturnValue(0.75);
    act(() => result.current.handleSelection("boxTwo"));
    expect(result.current.faces.boxTwo).toBe("owo");
    expect(Math.random).toHaveBeenCalledTimes(2);
  });

  it("does not draw for blocked, missing, background, unfocused or lower-priority events", () => {
    const { result, rerender } = setup();
    act(() => result.current.handleBlockedInteraction("boxOne"));
    expect(result.current.faces.boxOne).toBe("owo");
    act(() => {
      result.current.handleCorrectAnswer("boxOne");
      result.current.handleSelection("boxOne");
    });
    expect(result.current.faces.boxOne).toBe("happy");
    const boxes = { ...baseBoxes };
    delete (boxes as Partial<BoxesState>).boxTwo;
    rerender({ ...defaults, boxes });
    act(() => result.current.handleSelection("boxTwo"));
    rerender({ ...defaults, isFocused: false });
    act(() => result.current.handleSelection("boxOne"));
    rerender(defaults);
    act(() => changeAppState("background"));
    act(() => result.current.handleSelection("boxOne"));
    expect(Math.random).not.toHaveBeenCalled();
  });

  it("wakes only on an empty-to-populated transition and sleeps after emptying", () => {
    const { result, rerender } = setup();
    expect(result.current.faces.boxFive).toBe("sleep");
    rerender({ ...defaults, boxes: filledBoxes });
    expect(result.current.faces.boxFive).toBe("surprised");
    expect(Math.random).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(799));
    expect(result.current.faces.boxFive).toBe("surprised");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.faces.boxFive).toBe("love");
    rerender(defaults);
    expect(result.current.faces.boxFive).toBe("sleep");
  });

  it("does not wake on an initially populated box or asynchronous initial hydration", () => {
    const { result, rerender } = renderHook((props: Params) => useBoxFacesController(props), {
      initialProps: { ...defaults, boxes: filledBoxes },
    });
    expect(result.current.faces.boxFive).toBe("love");
    expect(jest.getTimerCount()).toBe(0);
    rerender({ ...defaults, isReady: false });
    rerender({ ...defaults, isReady: false, boxes: filledBoxes });
    rerender({ ...defaults, isReady: true, boxes: filledBoxes });
    expect(result.current.faces.boxFive).toBe("love");
    expect(jest.getTimerCount()).toBe(0);
    expect(Math.random).not.toHaveBeenCalled();
  });

  it("does not wake on course/focus changes or resume from background", () => {
    const { result, rerender } = setup();
    rerender({ ...defaults, resetKey: "course-2", boxes: filledBoxes });
    expect(result.current.faces.boxFive).toBe("love");
    rerender({ ...defaults, isFocused: false });
    rerender({ ...defaults, boxes: filledBoxes });
    expect(result.current.faces.boxFive).toBe("love");
    rerender(defaults);
    act(() => changeAppState("background"));
    rerender({ ...defaults, boxes: filledBoxes });
    act(() => changeAppState("active"));
    expect(result.current.faces.boxFive).toBe("love");
    expect(jest.getTimerCount()).toBe(0);
    expect(Math.random).not.toHaveBeenCalled();
  });

  it("restores current contents after selection even when the box becomes empty", () => {
    const { result, rerender } = renderHook((props: Params) => useBoxFacesController(props), {
      initialProps: { ...defaults, boxes: filledBoxes },
    });
    act(() => result.current.handleSelection("boxFive"));
    rerender(defaults);
    expect(result.current.faces.boxFive).toBe("surprised");
    act(() => jest.advanceTimersByTime(800));
    expect(result.current.faces.boxFive).toBe("sleep");
  });

  it("does not let wake-up replace selection or an answer, and never queues it", () => {
    const { result, rerender } = setup();
    jest.mocked(Math.random).mockReturnValue(0.9);
    act(() => result.current.handleSelection("boxFive"));
    rerender({ ...defaults, boxes: filledBoxes });
    expect(result.current.faces.boxFive).toBe("owo");
    act(() => jest.advanceTimersByTime(800));
    expect(result.current.faces.boxFive).toBe("love");
    rerender(defaults);
    act(() => result.current.handleCorrectAnswer("boxFive"));
    rerender({ ...defaults, boxes: filledBoxes });
    expect(result.current.faces.boxFive).toBe("happy");
    act(() => jest.advanceTimersByTime(1200));
    expect(result.current.faces.boxFive).toBe("love");
    expect(jest.getTimerCount()).toBe(0);
    expect(result.current.correctStreak).toBe(1);
  });

  it("lets selection replace wake-up and an answer replace selection", () => {
    const { result, rerender } = setup();
    rerender({ ...defaults, boxes: filledBoxes });
    act(() => jest.advanceTimersByTime(700));
    jest.mocked(Math.random).mockReturnValue(0.9);
    act(() => result.current.handleSelection("boxFive"));
    act(() => jest.advanceTimersByTime(100));
    expect(result.current.faces.boxFive).toBe("owo");
    act(() => result.current.handleWrongAnswer("boxFive"));
    rerender(defaults);
    act(() => jest.advanceTimersByTime(700));
    expect(result.current.faces.boxFive).toBe("sad");
    act(() => jest.advanceTimersByTime(300));
    expect(result.current.faces.boxFive).toBe("sleep");
    expect(jest.getTimerCount()).toBe(0);
  });
});
