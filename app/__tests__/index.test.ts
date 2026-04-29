import AsyncStorage from "@react-native-async-storage/async-storage";

import { resolveStartupRoute } from "../index";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";

jest.mock("@/src/screens/home/HomeScreen/HomeScreen", () => "HomeScreen");
jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    colors: {
      background: "#fff",
    },
  }),
}));
jest.mock("expo-router", () => ({
  Redirect: "Redirect",
}));

describe("resolveStartupRoute", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("starts a clean install at app language selection", async () => {
    await expect(resolveStartupRoute()).resolves.toBe("/createprofile");
  });

  it("keeps language onboarding ahead of existing course state", async () => {
    await AsyncStorage.setItem("activeCourseIdx", JSON.stringify(0));
    await setOnboardingCheckpoint("language_required");

    await expect(resolveStartupRoute()).resolves.toBe("/createprofile");
  });

  it("keeps legacy installs with active course on home when no checkpoint exists", async () => {
    await AsyncStorage.setItem("activeCourseIdx", JSON.stringify(0));

    await expect(resolveStartupRoute()).resolves.toBe("/");
  });
});
