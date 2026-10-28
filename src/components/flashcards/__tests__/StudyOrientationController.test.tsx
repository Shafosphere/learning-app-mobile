import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Platform } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { StudyOrientationController } from "../StudyOrientationController";

let mockPathname = "/flashcards";
let mockLandscapeEnabled = false;
jest.mock("expo-router", () => ({ usePathname: () => mockPathname }));
jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({ flashcardsLandscapeEnabled: mockLandscapeEnabled }),
}));
jest.mock("expo-screen-orientation", () => ({
  OrientationLock: { DEFAULT: 0, PORTRAIT_UP: 3 },
  lockAsync: jest.fn().mockResolvedValue(undefined),
}));

const lockAsync = ScreenOrientation.lockAsync as jest.Mock;
const { DEFAULT, PORTRAIT_UP } = ScreenOrientation.OrientationLock;

describe("StudyOrientationController", () => {
  beforeEach(() => {
    mockPathname = "/flashcards";
    mockLandscapeEnabled = false;
    lockAsync.mockClear();
  });

  it("locks the whole study screen on entry, allows opt-in, and releases on exit", async () => {
    const screen = render(<StudyOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP));
    mockLandscapeEnabled = true;
    screen.rerender(<StudyOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT));
    mockLandscapeEnabled = false;
    mockPathname = "/review/reviewflashcards";
    screen.rerender(<StudyOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(PORTRAIT_UP));
    mockPathname = "/custom_profile/settings";
    screen.rerender(<StudyOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT));
    screen.unmount();
    await act(async () => {});
  });

  it("finishes a pending lock before releasing it after fast navigation", async () => {
    let finishLock!: () => void;
    lockAsync.mockImplementationOnce(() => new Promise<void>((resolve) => { finishLock = resolve; }));
    const screen = render(<StudyOrientationController />);
    await waitFor(() => expect(lockAsync).toHaveBeenCalledWith(PORTRAIT_UP));
    mockPathname = "/";
    screen.rerender(<StudyOrientationController />);
    expect(lockAsync).toHaveBeenCalledTimes(1);
    await act(async () => finishLock());
    await waitFor(() => expect(lockAsync).toHaveBeenLastCalledWith(DEFAULT));
    screen.unmount();
    await act(async () => {});
  });

  it("does not request unsupported browser orientation locks", async () => {
    const os = jest.replaceProperty(Platform, "OS", "web");
    const screen = render(<StudyOrientationController />);
    await act(async () => {});
    screen.unmount();
    await act(async () => {});
    expect(lockAsync).not.toHaveBeenCalled();
    os.restore();
  });
});
