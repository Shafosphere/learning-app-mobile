import React from "react";
import { act, render } from "@testing-library/react-native";
import { Keyboard, Platform, Text } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { AppOrientationController } from "../AppOrientationController";
import { TutorialOrientationProvider, useTutorialOrientationState, useTutorialPortrait } from "@/src/contexts/TutorialOrientationContext";

let mockScreen = { width: 1024, height: 768, orientation: "landscape", isTabletLayout: true };
let mockWindowWidth = 1024;
jest.mock("@/src/hooks/useDeviceLayout", () => ({ useDeviceLayout: () => mockScreen }));
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return new Proxy(RN, {
    get(target, property) {
      if (property === "useWindowDimensions") return () => ({ width: mockWindowWidth, height: 400 });
      return target[property];
    },
  });
});
jest.mock("expo-screen-orientation", () => ({
  OrientationLock: { DEFAULT: 0, PORTRAIT_UP: 3 },
  lockAsync: jest.fn().mockResolvedValue(undefined),
}));
const lockAsync = ScreenOrientation.lockAsync as jest.Mock;
const { DEFAULT, PORTRAIT_UP } = ScreenOrientation.OrientationLock;

function Request({ enabled }: { enabled: boolean }) {
  const ready = useTutorialPortrait(enabled);
  return <Text testID="ready">{String(ready)}</Text>;
}
let state: ReturnType<typeof useTutorialOrientationState>;
function Probe() {
  state = useTutorialOrientationState();
  return null;
}
function Scene({ enabled = true, second = false }: { enabled?: boolean; second?: boolean }) {
  return <TutorialOrientationProvider>
    <AppOrientationController />
    <Request enabled={enabled} />
    {second ? <Request enabled /> : null}
    <Probe />
  </TutorialOrientationProvider>;
}
const flush = () => act(async () => {});
function rotateToPortrait() {
  mockScreen = { width: 768, height: 1024, orientation: "portrait", isTabletLayout: true };
  mockWindowWidth = 768;
}

describe("tutorial orientation policy", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScreen = { width: 1024, height: 768, orientation: "landscape", isTabletLayout: true };
    mockWindowWidth = 1024;
    lockAsync.mockReset().mockResolvedValue(undefined);
    jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  });
  afterEach(async () => {
    await flush();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("waits for portrait, settled targets and acknowledgement, then releases the tablet lock", async () => {
    const app = render(<Scene />);
    await flush();
    expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP);
    expect(Keyboard.dismiss).toHaveBeenCalled();
    expect(state?.ready).toBe(false);
    expect(state?.showNotice).toBe(true);
    rotateToPortrait();
    app.rerender(<Scene />);
    act(() => jest.advanceTimersByTime(399));
    expect(state?.layoutReady).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(state?.layoutReady).toBe(true);
    expect(state?.ready).toBe(false);
    act(() => state?.acknowledge());
    expect(app.getByTestId("ready").props.children).toBe("true");
    app.rerender(<Scene enabled={false} />);
    await flush();
    expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT);
    app.unmount();
  });

  it("starts a landscape web tutorial after layout settles without a rotation notice or native lock", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    const app = render(<Scene />);
    await flush();
    expect(state?.showNotice).toBe(false);
    expect(state?.ready).toBe(false);
    act(() => jest.advanceTimersByTime(400));
    expect(state?.layoutReady).toBe(true);
    expect(app.getByTestId("ready").props.children).toBe("true");
    expect(state?.showNotice).toBe(false);
    app.unmount();
    await flush();
    expect(lockAsync).not.toHaveBeenCalled();
  });

  it("locks a tutorial started in portrait and pauses without losing its request on later rotation", async () => {
    rotateToPortrait();
    const app = render(<Scene />);
    await flush();
    act(() => jest.advanceTimersByTime(400));
    expect(state?.ready).toBe(true);
    expect(state?.showNotice).toBe(false);
    expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP);
    // Simulate a platform that ignores the lock or changes its display shape.
    mockScreen = { width: 1024, height: 768, orientation: "landscape", isTabletLayout: true };
    mockWindowWidth = 1024;
    app.rerender(<Scene />);
    expect(state?.ready).toBe(false);
    expect(state?.portraitRequired).toBe(true);
    rotateToPortrait();
    app.rerender(<Scene />);
    act(() => jest.advanceTimersByTime(400));
    act(() => state?.acknowledge());
    expect(state?.ready).toBe(true);
    app.unmount();
    await flush();
    expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT);
  });

  it("keeps the lock until the last tutorial owner leaves", async () => {
    const app = render(<Scene second />);
    await flush();
    app.rerender(<Scene enabled={false} second />);
    await flush();
    expect(state?.portraitRequired).toBe(true);
    expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP);
    app.rerender(<Scene enabled={false} />);
    await flush();
    expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT);
    app.unmount();
  });

  it("stays paused after a failed native lock and resumes after manual rotation", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    lockAsync.mockImplementation((lock) => lock === PORTRAIT_UP
      ? Promise.reject(new Error("unsupported")) : Promise.resolve());
    const app = render(<Scene />);
    await flush();
    act(() => jest.advanceTimersByTime(5000));
    expect(warn).toHaveBeenCalled();
    expect(state?.ready).toBe(false);
    expect(state?.showNotice).toBe(true);
    rotateToPortrait();
    app.rerender(<Scene />);
    act(() => jest.advanceTimersByTime(400));
    act(() => state?.acknowledge());
    expect(state?.ready).toBe(true);
    app.unmount();
  });
});
