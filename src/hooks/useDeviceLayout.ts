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
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isTabletLayout: boolean;
}

function getWidthClass(width: number): WidthClass {
  if (width >= 840) return "expanded";
  if (width >= 600) return "medium";
  return "compact";
}

function getHeightClass(height: number): HeightClass {
  if (height >= 900) return "expanded";
  if (height >= 480) return "medium";
  return "compact";
}

export function getDeviceLayout(width: number, height: number): DeviceLayout {
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const widthClass = getWidthClass(width);
  const heightClass = getHeightClass(height);

  return {
    width,
    height,
    shortestSide,
    longestSide,
    orientation: width >= height ? "landscape" : "portrait",
    widthClass,
    heightClass,
    isCompact: widthClass === "compact",
    isMedium: widthClass === "medium",
    isExpanded: widthClass === "expanded",
    isTabletLayout: shortestSide >= 600,
  };
}

export function useDeviceLayout(): DeviceLayout {
  const { width, height } = useWindowDimensions();

  return getDeviceLayout(width, height);
}
