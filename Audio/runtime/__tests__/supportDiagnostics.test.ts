import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { downloadPack, confirmPackDownload } from "../packDownloads";
import { createSupportDiagnosticsAttachment } from "@/src/services/supportDiagnostics";
import { DEBUG_EVENTS_STORAGE_KEY, appendDebugEvent, flushDebugEvents } from "@/src/services/debugEvents";
import { playAssetDelivery } from "@/Audio/modules/play-asset-delivery";

jest.mock("@/Audio/modules/play-asset-delivery", () => ({ playAssetDelivery: {
  addListener: jest.fn(() => ({ remove: jest.fn() })), checkPackReady: jest.fn(async () => false), getPackLocation: jest.fn(async () => null), resolveAssetUri: jest.fn(),
  getPackStates: jest.fn(), fetch: jest.fn(), cancel: jest.fn(), showConfirmationDialog: jest.fn(async () => false),
} }));
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/", documentDirectory: "file:///documents/", EncodingType: { UTF8: "utf8" },
  writeAsStringAsync: jest.fn(async () => {}),
}));
const name = "audio_es_50";
const native = jest.mocked(playAssetDelivery!);
beforeEach(async () => {
  await flushDebugEvents();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(async () => { await flushDebugEvents(); jest.restoreAllMocks(); });

it("persists PAD state/dialog events and includes them in the email JSON attachment", async () => {
  native.fetch.mockResolvedValue([{ name, status: 1, errorCode: 0, downloadedBytes: 0, totalBytes: 223392, transferProgress: 0 }]);
  native.getPackStates.mockResolvedValue([{ name, status: 9, errorCode: 0, downloadedBytes: 0, totalBytes: 223392, transferProgress: 0 }]);
  await downloadPack(name);
  await confirmPackDownload(name);
  const uri = await createSupportDiagnosticsAttachment([]);
  expect(uri).toMatch(/^file:\/\/\/cache\/memicard-diagnostics-.*\.json$/);
  const payload = JSON.parse(jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1]);
  const events = payload.debugEvents.filter((event: { area: string }) => event.area === "pad");
  expect(events.map((event: { event: string }) => event.event)).toEqual(expect.arrayContaining([
    "downloadRequested", "state", "confirmationDialogRequested", "confirmationDialogResult",
  ]));
  expect(events).toEqual(expect.arrayContaining([expect.objectContaining({
    area: "pad", event: "confirmationDialogRequested", ts: expect.any(Number),
    payload: expect.objectContaining({ pack: name, nativeStatus: 9, errorCode: 0, reason: "play", preview: false }),
  })]));
  expect(events).toEqual(expect.arrayContaining([expect.objectContaining({
    event: "confirmationDialogResult", payload: expect.objectContaining({ accepted: false }),
  })]));
  for (const event of events) {
    expect(event.payload).not.toHaveProperty("text");
    expect(event.payload).not.toHaveProperty("courseId");
    expect(event.payload).not.toHaveProperty("uri");
  }
  expect(JSON.parse((await AsyncStorage.getItem(DEBUG_EVENTS_STORAGE_KEY))!)).toEqual(payload.debugEvents);
});
it("waits for a queued event instead of omitting it when a report is generated immediately", async () => {
  void appendDebugEvent("pad", "downloadFailed", { pack: name, errorCode: -6, preview: false });
  await createSupportDiagnosticsAttachment([]);
  const payload = JSON.parse(jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1]);
  expect(payload.debugEvents).toEqual([expect.objectContaining({ area: "pad", event: "downloadFailed",
    payload: { pack: name, errorCode: -6, preview: false } })]);
});
