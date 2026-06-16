import { useWindowDimensions } from "react-native";

export type WidthClass = "compact" | "medium" | "expanded";
export type HeightClass = "compact" | "medium" | "expanded";

export interface DeviceLayout {
  width: number;
  height: number;
  shortestSide: number;
  longestSide: number;
  orientation: "portrait" | "landscape";
  widthClass: WidthClass;
  heightClass: HeightClass;
  isCompactWidth: boolean;
  isMediumWidth: boolean;
  isExpandedWidth: boolean;
  isCompactHeight: boolean;
  isMediumHeight: boolean;
  isExpandedHeight: boolean;
  isSmallPhoneLayout: boolean;
  isTabletLayout: boolean;
}

const WIDTH_BREAKPOINTS = {
  medium: 600,
  expanded: 840,
} as const;

const HEIGHT_BREAKPOINTS = {
  medium: 480,
  expanded: 900,
} as const;

const SMALL_PHONE_MAX_SHORT_SIDE = 380;
const TABLET_LAYOUT_MIN_SHORT_SIDE = 600;

function getWidthClass(width: number): WidthClass {
  if (width >= WIDTH_BREAKPOINTS.expanded) return "expanded";
  if (width >= WIDTH_BREAKPOINTS.medium) return "medium";
  return "compact";
}

function getHeightClass(height: number): HeightClass {
  if (height >= HEIGHT_BREAKPOINTS.expanded) return "expanded";
  if (height >= HEIGHT_BREAKPOINTS.medium) return "medium";
  return "compact";
}

export function getDeviceLayout(width: number, height: number): DeviceLayout {
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const widthClass = getWidthClass(width);
  const heightClass = getHeightClass(height);
  const isSmallPhoneLayout = shortestSide <= SMALL_PHONE_MAX_SHORT_SIDE;

  return {
    width,
    height,
    shortestSide,
    longestSide,
    orientation: width >= height ? "landscape" : "portrait",
    widthClass,
    heightClass,
    isCompactWidth: widthClass === "compact",
    isMediumWidth: widthClass === "medium",
    isExpandedWidth: widthClass === "expanded",
    isCompactHeight: heightClass === "compact",
    isMediumHeight: heightClass === "medium",
    isExpandedHeight: heightClass === "expanded",
    isSmallPhoneLayout,
    isTabletLayout: shortestSide >= TABLET_LAYOUT_MIN_SHORT_SIDE,
  };
}

export function useDeviceLayout(): DeviceLayout {
  const { width, height } = useWindowDimensions();

  return getDeviceLayout(width, height);
}
