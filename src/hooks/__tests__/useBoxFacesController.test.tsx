import { act, renderHook } from "@testing-library/react-native";
import { useBoxFacesController } from "../useBoxFacesController";
import type { BoxesState } from "@/src/types/boxes";

const baseBoxes: BoxesState = {
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
};

describe("useBoxFacesController", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0.8);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("keeps a stable idle face for inactive boxes", () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useBoxFacesController>,
      { activeBox: keyof BoxesState | null }
    >(
      ({ activeBox }) =>
        useBoxFacesController({
          boxes: baseBoxes,
          activeBox,
        }),
      {
        initialProps: { activeBox: null as keyof BoxesState | null },
      }
    );

    expect(result.current.faces.boxOne).toBe("blink");

    rerender({ activeBox: "boxOne" });
    expect(result.current.faces.boxOne).toBe("happy");

    rerender({ activeBox: null });
    expect(result.current.faces.boxOne).toBe("blink");
  });

  it("escalates wrong answers to crying on the third consecutive failure", () => {
    const { result } = renderHook(() =>
      useBoxFacesController({
        boxes: baseBoxes,
        activeBox: "boxOne",
      })
    );

    act(() => {
      result.current.handleWrongAnswer("boxOne");
    });
    expect(result.current.faces.boxOne).toBe("sad");

    act(() => {
      jest.advanceTimersByTime(1200);
      result.current.handleWrongAnswer("boxOne");
    });
    expect(result.current.faces.boxOne).toBe("sad");

    act(() => {
      jest.advanceTimersByTime(1200);
      result.current.handleWrongAnswer("boxOne");
    });
    expect(result.current.faces.boxOne).toBe("crying");
  });

  it("resets the wrong streak after a correct answer and returns to the active face", () => {
    const { result } = renderHook(() =>
      useBoxFacesController({
        boxes: baseBoxes,
        activeBox: "boxOne",
      })
    );

    act(() => {
      result.current.handleWrongAnswer("boxOne");
      result.current.handleWrongAnswer("boxOne");
      result.current.handleCorrectAnswer("boxOne");
    });

    expect(result.current.faces.boxOne).toBe("blushed");

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.faces.boxOne).toBe("happy");

    act(() => {
      result.current.handleWrongAnswer("boxOne");
    });
    expect(result.current.faces.boxOne).toBe("sad");
  });
});
