import { getDeviceLayout } from "@/src/hooks/useDeviceLayout";

describe("getDeviceLayout", () => {
  it.each([
    [390, 844, "compact", "medium", false, "portrait"],
    [844, 390, "expanded", "compact", false, "landscape"],
    [768, 1024, "medium", "expanded", true, "portrait"],
    [1024, 768, "expanded", "medium", true, "landscape"],
    [600, 960, "medium", "expanded", true, "portrait"],
  ] as const)(
    "classifies %i x %i",
    (width, height, widthClass, heightClass, isTabletLayout, orientation) => {
      expect(getDeviceLayout(width, height)).toEqual({
        width,
        height,
        shortestSide: Math.min(width, height),
        longestSide: Math.max(width, height),
        orientation,
        widthClass,
        heightClass,
        isCompact: widthClass === "compact",
        isMedium: widthClass === "medium",
        isExpanded: widthClass === "expanded",
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
