import { getDeviceLayout } from "@/src/hooks/useDeviceLayout";

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
