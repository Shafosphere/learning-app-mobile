import { getDeviceLayout, useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { act, renderHook } from "@testing-library/react-native";
import { Dimensions, Platform } from "react-native";

describe("getDeviceLayout", () => {
  it.each([
    [360, 640, "compact", "medium", true, false, "portrait"],
    [412, 924, "compact", "expanded", false, false, "portrait"],
    [390, 844, "compact", "medium", false, false, "portrait"],
    [844, 390, "expanded", "compact", false, false, "landscape"],
    [768, 1024, "medium", "expanded", false, true, "portrait"],
    [1024, 768, "expanded", "medium", false, true, "landscape"],
    [600, 960, "medium", "expanded", false, true, "portrait"],
    [960, 600, "expanded", "medium", false, true, "landscape"],
    [852, 883, "expanded", "medium", false, true, "portrait"],
  ] as const)(
    "classifies %i x %i",
    (
      width,
      height,
      widthClass,
      heightClass,
      isSmallPhoneLayout,
      isTabletLayout,
      orientation,
    ) => {
      expect(getDeviceLayout(width, height)).toEqual({
        width,
        height,
        shortestSide: Math.min(width, height),
        longestSide: Math.max(width, height),
        orientation,
        widthClass,
        heightClass,
        isCompactWidth: widthClass === "compact",
        isMediumWidth: widthClass === "medium",
        isExpandedWidth: widthClass === "expanded",
        isCompactHeight: heightClass === "compact",
        isMediumHeight: heightClass === "medium",
        isExpandedHeight: heightClass === "expanded",
        isSmallPhoneLayout,
        isTabletLayout,
      });
    },
  );

  it.each([
    [599, "compact"],
    [600, "medium"],
    [839, "medium"],
    [840, "expanded"],
  ] as const)("classifies width boundary %i as %s", (width, widthClass) => {
    expect(getDeviceLayout(width, 1000).widthClass).toBe(widthClass);
  });

  it.each([
    [479, "compact"],
    [480, "medium"],
    [899, "medium"],
    [900, "expanded"],
  ] as const)("classifies height boundary %i as %s", (height, heightClass) => {
    expect(getDeviceLayout(1000, height).heightClass).toBe(heightClass);
  });
});

describe("keyboard-independent screen layout", () => {
  const originalWindow = Dimensions.get("window");
  const originalScreen = Dimensions.get("screen");
  const size = (width: number, height: number) => ({ width, height, scale: 1, fontScale: 1 });

  afterEach(() => {
    act(() => Dimensions.set({ window: originalWindow, screen: originalScreen }));
    jest.restoreAllMocks();
  });

  it("keeps a landscape tablet classified as a tablet when the keyboard resizes its window", () => {
    Dimensions.set({ window: size(1024, 720), screen: size(1024, 768) });
    const { result } = renderHook(() => useDeviceLayout({ sizeSource: "screen" }));
    expect(result.current).toMatchObject({ isTabletLayout: true, orientation: "landscape" });
    act(() => Dimensions.set({ window: size(1024, 320), screen: size(1024, 768) }));
    expect(result.current).toMatchObject({ isTabletLayout: true, orientation: "landscape" });
    act(() => Dimensions.set({ window: size(768, 500), screen: size(768, 1024) }));
    expect(result.current).toMatchObject({ isTabletLayout: true, orientation: "portrait" });
  });

  it("updates the policy when a phone unfolds into a large display", () => {
    Dimensions.set({ window: size(390, 800), screen: size(390, 844) });
    const { result } = renderHook(() => useDeviceLayout({ sizeSource: "screen" }));
    expect(result.current.isTabletLayout).toBe(false);
    act(() => Dimensions.set({ window: size(844, 350), screen: size(844, 390) }));
    expect(result.current).toMatchObject({ isTabletLayout: false, orientation: "landscape" });
    act(() => Dimensions.set({ window: size(852, 840), screen: size(852, 883) }));
    expect(result.current.isTabletLayout).toBe(true);
  });

  it("uses the portrait activity inside a letterboxed landscape tablet, including keyboard entry", () => {
    Dimensions.set({ window: size(691, 922), screen: size(1474, 922) });
    const { result } = renderHook(() => useDeviceLayout({ sizeSource: "screen" }));
    expect(result.current).toMatchObject({ width: 691, height: 922, orientation: "portrait", isTabletLayout: true });
    act(() => Dimensions.set({ window: size(691, 430), screen: size(1474, 922) }));
    expect(result.current).toMatchObject({ orientation: "portrait", isTabletLayout: true });
    act(() => Dimensions.set({ window: size(1474, 922), screen: size(1474, 922) }));
    expect(result.current.orientation).toBe("landscape");
  });

  it("uses the browser viewport rather than the physical monitor on web", () => {
    const os = jest.replaceProperty(Platform, "OS", "web");
    Dimensions.set({ window: size(390, 800), screen: size(1920, 1080) });
    const { result } = renderHook(() => useDeviceLayout({ sizeSource: "screen" }));
    expect(result.current).toMatchObject({ isTabletLayout: false, orientation: "portrait" });
    os.restore();
  });

  it("keeps physical tablet classification when its portrait window is narrower than 600 dp", () => {
    Dimensions.set({ window: size(480, 768), screen: size(1024, 768) });
    const { result } = renderHook(() => ({
      layout: useDeviceLayout({ sizeSource: "screen" }),
      policy: useDeviceLayout({ sizeSource: "physicalScreen" }),
    }));
    expect(result.current.layout).toMatchObject({ width: 480, orientation: "portrait", isTabletLayout: false });
    expect(result.current.policy).toMatchObject({ width: 1024, orientation: "landscape", isTabletLayout: true });
    act(() => Dimensions.set({ window: size(480, 320), screen: size(1024, 768) }));
    expect(result.current.policy.isTabletLayout).toBe(true);
    act(() => Dimensions.set({ window: size(390, 800), screen: size(390, 844) }));
    expect(result.current.policy.isTabletLayout).toBe(false);
  });
});
