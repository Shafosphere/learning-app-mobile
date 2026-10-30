import { act, renderHook } from "@testing-library/react-native";
import { Dimensions, Platform } from "react-native";
import { useSideNavbarLayout } from "../useSideNavbarLayout";

const size = (width: number, height: number) => ({ width, height, scale: 1, fontScale: 1 });
const originalWindow = Dimensions.get("window");
const originalScreen = Dimensions.get("screen");

afterEach(() => {
  act(() => Dimensions.set({ window: originalWindow, screen: originalScreen }));
  jest.restoreAllMocks();
});

it("keeps tablet navigation unchanged when the Android keyboard opens", () => {
  jest.replaceProperty(Platform, "OS", "android");
  Dimensions.set({ window: size(1024, 768), screen: size(1024, 768) });
  const { result } = renderHook(() => useSideNavbarLayout());
  expect(result.current).toBe(false);
  act(() => Dimensions.set({ window: size(1024, 320), screen: size(1024, 768) }));
  expect(result.current).toBe(false);
});

it("keeps portrait phone navigation unchanged when the keyboard opens and updates on rotation", () => {
  jest.replaceProperty(Platform, "OS", "android");
  Dimensions.set({ window: size(390, 740), screen: size(390, 844) });
  const { result } = renderHook(() => useSideNavbarLayout());
  expect(result.current).toBe(false);
  act(() => Dimensions.set({ window: size(390, 300), screen: size(390, 844) }));
  expect(result.current).toBe(false);
  act(() => Dimensions.set({ window: size(740, 320), screen: size(740, 390) }));
  expect(result.current).toBe(true);
  act(() => Dimensions.set({ window: size(390, 740), screen: size(390, 740) }));
  expect(result.current).toBe(false);
});

it("uses the browser viewport for side rails on web", () => {
  jest.replaceProperty(Platform, "OS", "web");
  Dimensions.set({ window: size(740, 390), screen: size(1920, 1080) });
  const { result } = renderHook(() => useSideNavbarLayout());
  expect(result.current).toBe(true);
  act(() => Dimensions.set({ window: size(1024, 768), screen: size(1920, 1080) }));
  expect(result.current).toBe(false);
});
