import React from "react";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import { CourseAudioDownloadRow } from "../CourseAudioDownloadRow";
import { downloadCourse, cancelCourse, confirmCourseDownload, refreshCourse } from "../courseDownloads";
import type { PackDownload } from "../packDownloads";

let mockState: PackDownload;
const mockListeners = new Set<() => void>();
jest.mock("@expo/vector-icons/FontAwesome6", () => "Icon");
jest.mock("@expo/vector-icons/Feather", () => "Icon");
jest.mock("../courseDownloads", () => ({
  getCourseDownload: () => mockState,
  refreshCourse: jest.fn(async () => {}), downloadCourse: jest.fn(), cancelCourse: jest.fn(), confirmCourseDownload: jest.fn(),
}));
jest.mock("../packDownloads", () => ({ subscribePackDownloads: (listener: () => void) => {
  mockListeners.add(listener); return () => { mockListeners.delete(listener); };
} }));
jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: () => ({ colors: {} }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, values?: { value?: string; action?: string; course?: string }) =>
  key === "audioDownload.size" ? `${values?.value} MB` : key === "audioDownload.courseAction" ? `${values?.action} — ${values?.course}` : key }) }));
beforeEach(() => {
  jest.clearAllMocks();
  mockState = { name: "audio_es_50", phase: "missing", totalBytes: 223392, downloadedBytes: 0, errorCode: 0,
    nativeStatus: 8, confirmationReason: null, confirmationPending: false };
});
function update(patch: Partial<PackDownload>) {
  act(() => {
    mockState = { ...mockState, ...patch };
    mockListeners.forEach((listener) => listener());
  });
}
it("downloads only on an explicit tap and stops press propagation", () => {
  const screen = render(<CourseAudioDownloadRow slug="es_to_pl_first_50" courseName="Spanish PL" />);
  expect(refreshCourse).toHaveBeenCalledWith("es_to_pl_first_50");
  expect(downloadCourse).not.toHaveBeenCalled();
  const stopPropagation = jest.fn();
  fireEvent.press(screen.getByText("audioDownload.download"), { stopPropagation });
  expect(downloadCourse).toHaveBeenCalledWith("es_to_pl_first_50");
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(screen.getByText("audioDownload.title · 0.22 MB")).toBeTruthy();
  expect(screen.queryByText("audioDownload.description")).toBeNull();
});
it("both course rows observe the same download and ready state", () => {
  const screen = render(<>
    <CourseAudioDownloadRow slug="es_to_pl_first_50" courseName="Spanish PL" />
    <CourseAudioDownloadRow slug="es_to_en_first_50" courseName="Spanish EN" />
  </>);
  update({ phase: "downloading", nativeStatus: 2, downloadedBytes: 100000 });
  expect(screen.getAllByText("audioDownload.downloading")).toHaveLength(2);
  update({ phase: "ready", nativeStatus: 4 });
  for (const slug of ["es_to_pl_first_50", "es_to_en_first_50"]) {
    const row = within(screen.getByTestId(`course-audio-row-${slug}`));
    expect(row.getByText("audioDownload.downloaded")).toBeTruthy();
    expect(row.queryByRole("button")).toBeNull();
  }
});
it.each(["es_to_pl_first_150", "es_to_pl_first_327", "es_to_en_first_150", "es_to_en_first_327"])("offers the course download for %s", (slug) => {
  const screen = render(<CourseAudioDownloadRow slug={slug} courseName="Spanish" />);
  expect(screen.getByTestId(`course-audio-row-${slug}`)).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.download"));
  expect(downloadCourse).toHaveBeenCalledWith(slug);
});
it("offers cancel, transfer confirmation, Play confirmation and retry", () => {
  mockState = { ...mockState, phase: "downloading", nativeStatus: 2 };
  const screen = render(<CourseAudioDownloadRow slug="es_to_pl_first_50" courseName="Spanish" />);
  fireEvent.press(screen.getByText("audioDownload.cancel"));
  expect(cancelCourse).toHaveBeenCalledWith("es_to_pl_first_50");
  update({ phase: "confirmation", nativeStatus: 7, confirmationReason: "wifi" });
  expect(screen.getByText("audioDownload.waitingForWifi")).toBeTruthy();
  expect(screen.queryByText("audioDownload.playConfirmation")).toBeNull();
  fireEvent.press(screen.getByText("audioDownload.confirmTransfer"));
  expect(confirmCourseDownload).toHaveBeenCalledTimes(1);
  update({ nativeStatus: 9, confirmationReason: "play" });
  expect(screen.getByText("audioDownload.playConfirmation")).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.confirm"));
  expect(confirmCourseDownload).toHaveBeenCalledTimes(2);
  update({ phase: "failed", nativeStatus: 5, errorCode: -10 });
  expect(screen.getByText("audioDownload.noSpace")).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.retry"));
  expect(downloadCourse).toHaveBeenCalledWith("es_to_pl_first_50");
});
it("disables actions while checking and while a confirmation is in flight", () => {
  mockState = { ...mockState, phase: "checking", nativeStatus: null };
  const screen = render(<CourseAudioDownloadRow slug="es_to_pl_first_50" courseName="Spanish" />);
  expect(screen.queryByRole("button")).toBeNull();
  update({ phase: "confirmation", nativeStatus: 9, confirmationReason: "play", confirmationPending: true });
  fireEvent.press(screen.getByText("audioDownload.confirm"));
  expect(confirmCourseDownload).not.toHaveBeenCalled();
});
it("hides the row for unsupported courses and disables unsupported clients", () => {
  const screen = render(<CourseAudioDownloadRow slug="unknown_course" courseName="Other course" />);
  expect(screen.queryByTestId("course-audio-row-unknown_course")).toBeNull();
  mockState = { ...mockState, phase: "unavailable" };
  screen.rerender(<CourseAudioDownloadRow slug="es_to_pl_first_50" courseName="Spanish" />);
  expect(screen.getByText("audioDownload.unavailable")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
it.each(["french_a1", "french_a2", "french_b1", "french_b2", "fr_to_pl_first_50", "fr_to_pl_first_150", "fr_to_pl_first_332",
  "fr_to_en_first_50", "fr_to_en_first_150", "fr_to_en_first_332"])("downloads all French course dependencies for %s", (slug) => {
  const screen = render(<CourseAudioDownloadRow slug={slug} courseName="French" />);
  expect(screen.getByTestId(`course-audio-row-${slug}`)).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.download"));
  expect(downloadCourse).toHaveBeenCalledWith(slug);
});
