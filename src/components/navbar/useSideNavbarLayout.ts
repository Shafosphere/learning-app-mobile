import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";

export function useSideNavbarLayout() {
  const { isTabletLayout, orientation, width } = useDeviceLayout({ sizeSource: "screen" });
  return !isTabletLayout && orientation === "landscape" && width >= 600;
}
