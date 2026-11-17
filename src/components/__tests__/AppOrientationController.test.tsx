import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Platform } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { AppOrientationController } from "../AppOrientationController";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";

let mockIsTablet = false;
jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: jest.fn(() => ({ isTabletLayout: mockIsTablet })),
}));
jest.mock("expo-screen-orientation", () => ({
  OrientationLock: { DEFAULT: 0, PORTRAIT_UP: 3 },
  lockAsync: jest.fn().mockResolvedValue(undefined),
}));

const lockAsync = ScreenOrientation.lockAsync as jest.Mock;
const { DEFAULT, PORTRAIT_UP } = ScreenOrientation.OrientationLock;

describe("AppOrientationController", () => {
  beforeEach(() => {
    mockIsTablet = false;
    lockAsync.mockClear();
  });

  it("locks phones globally and updates when a foldable opens or closes", async () => {
    const screen = render(<AppOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP));
    mockIsTablet = true;
    screen.rerender(<AppOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT));
    mockIsTablet = false;
    screen.rerender(<AppOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP));
    screen.unmount();
    await act(async () => {});
  });

  it("allows tablet rotation immediately", async () => {
    mockIsTablet = true;
    const screen = render(<AppOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT));
    expect(useDeviceLayout).toHaveBeenLastCalledWith({ sizeSource: "physicalScreen" });
    expect(lockAsync).not.toHaveBeenCalledWith(PORTRAIT_UP);
    screen.unmount();
    await act(async () => {});
  });

  it("keeps phone orientation locked when the application rerenders", async () => {
    const screen = render(<AppOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP));
    screen.rerender(<AppOrientationController />);
    await act(async () => {});
    expect(lockAsync).toHaveBeenCalledTimes(1);
    expect(lockAsync).not.toHaveBeenCalledWith(DEFAULT);
    screen.unmount();
    await act(async () => {});
    expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT);
  });

  it("finishes a pending phone lock before enabling rotation on an unfolded display", async () => {
    let finishLock!: () => void;
    lockAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { finishLock = resolve; }));
    const screen = render(<AppOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenCalledWith(PORTRAIT_UP));
    mockIsTablet = true;
    screen.rerender(<AppOrientationController />);
    expect(lockAsync).toHaveBeenCalledTimes(1);
    await act(async () => finishLock());
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT));
    screen.unmount();
    await act(async () => {});
  });

  it("does not request unsupported browser orientation locks", async () => {
    const os = jest.replaceProperty(Platform, "OS", "web");
    const screen = render(<AppOrientationController />);
    await act(async () => {});
    screen.unmount();
    await act(async () => {});
    expect(lockAsync).not.toHaveBeenCalled();
    os.restore();
  });
});
