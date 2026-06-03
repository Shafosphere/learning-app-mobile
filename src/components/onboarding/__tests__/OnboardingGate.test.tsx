import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { OnboardingGate } from "../OnboardingGate";
import {
  getOnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";

const mockReplace = jest.fn();
let mockPathname = "/support";
let mockSettings = {
  courses: [] as unknown[],
  pinnedOfficialCourseIds: [] as number[],
  activeCourse: null as unknown,
  activeCustomCourseId: null as number | null,
  hasSeenCustomCourseEntrySettings: jest.fn(() => false),
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => mockSettings,
}));

jest.mock("@/src/services/onboardingCheckpoint", () => ({
  getOnboardingCheckpoint: jest.fn(),
  setOnboardingCheckpoint: jest.fn(() => Promise.resolve()),
  subscribeOnboardingCheckpoint: jest.fn(() => jest.fn()),
}));

const mockedGetCheckpoint = getOnboardingCheckpoint as jest.Mock;
const mockedSetCheckpoint = setOnboardingCheckpoint as jest.Mock;

describe("OnboardingGate welcome routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/support";
    mockSettings = {
      courses: [],
      pinnedOfficialCourseIds: [],
      activeCourse: null,
      activeCustomCourseId: null,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    };
    mockedGetCheckpoint.mockResolvedValue("welcome_required");
  });

  it("redirects support back to welcome while the step is active", async () => {
    render(<OnboardingGate />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/createprofile");
    });
  });

  it("redirects other routes back to welcome while the step is active", async () => {
    mockPathname = "/coursepanel";

    render(<OnboardingGate />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/createprofile");
    });
  });

  it("does not allow support after welcome is completed", async () => {
    mockedGetCheckpoint.mockResolvedValue("pin_required");

    render(<OnboardingGate />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/createcourse");
    });
  });

  it("keeps activation onboarding active after a course is already active", async () => {
    mockPathname = "/";
    mockedGetCheckpoint.mockResolvedValue("activate_required");
    mockSettings = {
      courses: [],
      pinnedOfficialCourseIds: [11],
      activeCourse: null,
      activeCustomCourseId: 11,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    };

    render(<OnboardingGate />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/coursepanel");
    });
    expect(mockedSetCheckpoint).not.toHaveBeenCalledWith("done");
  });
});
