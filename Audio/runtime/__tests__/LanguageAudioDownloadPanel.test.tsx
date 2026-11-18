import React from "react";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { LanguageAudioDownloadPanel, CourseAudioDownloadPanels } from "../LanguageAudioDownloadPanel";
import { resolveThemeColors } from "@/src/theme/theme";
import type { PackDownload } from "../packDownloads";
import { downloadPack, cancelPack, confirmPackDownload, refreshPack } from "../packDownloads";
import en from "@/src/locales/en.json";
import pl from "@/src/locales/pl.json";

const mockListeners = new Set<() => void>();
let mockState: PackDownload;
let mockTheme = "light" as "light" | "dark";
jest.mock("@expo/vector-icons/Feather", () => "Icon");
jest.mock("@/src/contexts/SettingsContext", () => ({ useThemeSettings: () => ({
  colors: jest.requireActual("@/src/theme/theme").resolveThemeColors(mockTheme), accessibilityPreferences: {}, fontScaleMultiplier: 1,
}) }));
jest.mock("../packDownloads", () => ({
  getPackDownload: () => mockState,
  subscribePackDownloads: (listener: () => void) => { mockListeners.add(listener); return () => { mockListeners.delete(listener); }; },
  refreshPack: jest.fn(), downloadPack: jest.fn(), cancelPack: jest.fn(), confirmPackDownload: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks(); mockTheme = "light";
  mockState = { name: "audio_fr", phase: "missing", totalBytes: 47519712, downloadedBytes: 0,
    errorCode: 0, nativeStatus: 8, confirmationReason: null, confirmationPending: false };
});
function update(patch: Partial<PackDownload>) {
  act(() => { mockState = { ...mockState, ...patch }; mockListeners.forEach(listener => listener()); });
}
async function setup(lng = "en", children = <LanguageAudioDownloadPanel packName="audio_fr" />) {
  const i18n = createInstance();
  await i18n.init({ lng, resources: { en: { translation: en }, pl: { translation: pl } }, interpolation: { escapeValue: false } });
  return render(<I18nextProvider i18n={i18n}>{children}</I18nextProvider>);
}
it("offers the entire language, refreshes without a transfer, and downloads only on tap", async () => {
  const screen = await setup();
  expect(screen.getByText("Recordings for all courses")).toBeTruthy();
  expect(screen.getByText("47.52 MB")).toBeTruthy();
  expect(refreshPack).toHaveBeenCalledWith("audio_fr");
  expect(downloadPack).not.toHaveBeenCalled();
  const stopPropagation = jest.fn();
  fireEvent.press(screen.getByText("Download"), { stopPropagation });
  expect(downloadPack).toHaveBeenCalledWith("audio_fr");
  expect(stopPropagation).toHaveBeenCalledTimes(1);
});
it("synchronizes header and course settings and exposes shared progress and completion", async () => {
  const screen = await setup("en", <>
    <LanguageAudioDownloadPanel packName="audio_fr" />
    <CourseAudioDownloadPanels slug="french_b2" />
  </>);
  update({ phase: "downloading", downloadedBytes: 23759856 });
  expect(screen.getAllByText("Downloading · 50%")).toHaveLength(2);
  expect(screen.getAllByRole("progressbar")[0]).toHaveProp("accessibilityValue", { min: 0, max: 100, now: 50 });
  update({ phase: "ready" });
  expect(screen.getAllByText("Downloaded")).toHaveLength(2);
  expect(screen.queryByRole("button")).toBeNull();
});
it("supports cancel, retry, both confirmation reasons and disables in-flight actions", async () => {
  const screen = await setup();
  update({ phase: "downloading" }); fireEvent.press(screen.getByText("Cancel"));
  expect(cancelPack).toHaveBeenCalledWith("audio_fr");
  update({ phase: "confirmation", confirmationReason: "wifi" });
  fireEvent.press(screen.getByText("Allow download"));
  expect(confirmPackDownload).toHaveBeenCalledWith("audio_fr");
  update({ confirmationReason: "play", confirmationPending: true });
  fireEvent.press(screen.getByText("Confirm in Google Play"));
  expect(confirmPackDownload).toHaveBeenCalledTimes(1);
  update({ phase: "failed", confirmationPending: false, errorCode: -10 });
  expect(screen.getByText(en.audioDownload.noSpace)).toBeTruthy();
  fireEvent.press(screen.getByText("Try again"));
  expect(downloadPack).toHaveBeenCalledWith("audio_fr");
  update({ errorCode: -6 }); expect(screen.getByText(en.audioDownload.networkError)).toBeTruthy();
});
it.each(["en", "pl"])("renders translated copy and theme colors in %s", async lng => {
  mockTheme = "dark";
  const screen = await setup(lng);
  const panel = screen.getByTestId("language-audio-panel-audio_fr");
  expect(panel).toHaveStyle({ backgroundColor: resolveThemeColors("dark").secondBackground });
  expect(within(panel).getByText(lng === "pl" ? pl.audioDownload.allCourses : en.audioDownload.allCourses)).toBeTruthy();
});
it("hides unsupported courses and unknown packs", async () => {
  const screen = await setup("en", <><CourseAudioDownloadPanels slug="unknown" /><LanguageAudioDownloadPanel packName="audio_fr_50" /></>);
  expect(screen.queryByRole("button")).toBeNull();
  expect(refreshPack).not.toHaveBeenCalled();
});
