import { AppState, type AppStateStatus } from "react-native";
import { playAssetDelivery, type NativePackState } from "@/Audio/modules/play-asset-delivery";
import { cancelPack, confirmPackDownload, downloadPack, getPackDownload, refreshPack, subscribePackDownloads } from "../packDownloads";

let mockPackListener: (state: NativePackState) => void;
let mockAppStateListener: (state: AppStateStatus) => void;
jest.spyOn(AppState, "addEventListener").mockImplementation((_event, handler) => {
  mockAppStateListener = handler; return { remove: jest.fn() };
});

jest.mock("@/Audio/modules/play-asset-delivery", () => ({ playAssetDelivery: {
  addListener: jest.fn((_event, listener) => { mockPackListener = listener; return { remove: jest.fn() }; }), getPackLocation: jest.fn(), resolveAssetUri: jest.fn(), checkPackReady: jest.fn(),
  getPackStates: jest.fn(), fetch: jest.fn(), cancel: jest.fn(), showConfirmationDialog: jest.fn(),
} }));
const native = jest.mocked(playAssetDelivery!);
const name = "audio_es_50";
const state = (status: number): NativePackState => ({ name, status, errorCode: 0, totalBytes: 223392,
  downloadedBytes: status === 4 ? 223392 : 0, transferProgress: 0 });
const flush = async () => { for (let i = 0; i < 24; i++) await Promise.resolve(); };
jest.spyOn(console, "info").mockImplementation(() => {});
beforeEach(() => {
  jest.clearAllMocks();
  native.checkPackReady.mockResolvedValue(false);
  native.resolveAssetUri.mockResolvedValue("file:///audio.mp3");
  native.getPackStates.mockResolvedValue([state(8)]);
  native.fetch.mockResolvedValue([state(1)]);
  native.cancel.mockResolvedValue([state(6)]);
  native.showConfirmationDialog.mockResolvedValue(true);
});
it("checks availability without automatically requesting downloads", async () => {
  await refreshPack(name);
  expect(getPackDownload(name).phase).toBe("missing"); expect(native.fetch).not.toHaveBeenCalled();
});
it("subscribers can leave without cancelling downloads; completion verifies files", async () => {
  const unsubscribe = subscribePackDownloads(jest.fn());
  await downloadPack(name); unsubscribe();
  expect(getPackDownload(name).phase).toBe("pending"); expect(native.cancel).not.toHaveBeenCalled();
  native.checkPackReady.mockResolvedValue(true);
  const listener = mockPackListener; listener(state(4)); await flush();
  expect(getPackDownload(name).phase).toBe("ready");
  native.checkPackReady.mockResolvedValue(false);
  listener(state(4)); await flush();
  expect(getPackDownload(name).phase).toBe("failed");
});
it("supports cancellation, retry and required Google Play confirmation", async () => {
  await cancelPack(name); expect(getPackDownload(name).phase).toBe("cancelled");
  await downloadPack(name); expect(getPackDownload(name).phase).toBe("pending");
  native.fetch.mockResolvedValueOnce([state(7)]);
  await downloadPack(name); expect(getPackDownload(name).phase).toBe("confirmation");
  native.getPackStates.mockResolvedValue([state(7)]);
  await confirmPackDownload(name);
  expect(native.showConfirmationDialog).toHaveBeenCalledTimes(1);
  expect(getPackDownload(name).phase).toBe("pending");
});
it("retains native network/storage error codes", async () => {
  native.fetch.mockRejectedValueOnce({ code: "PAD_-10" });
  await downloadPack(name); expect(getPackDownload(name)).toMatchObject({ phase: "failed", errorCode: -10 });
  native.fetch.mockRejectedValueOnce({ code: "PAD_-6" });
  await downloadPack(name); expect(getPackDownload(name)).toMatchObject({ phase: "failed", errorCode: -6 });
});
it("rechecks locations after resuming the application", async () => {
  native.checkPackReady.mockResolvedValue(true);
  mockAppStateListener("active"); await flush();
  expect(getPackDownload(name).phase).toBe("ready");
  native.checkPackReady.mockResolvedValue(false);
  mockAppStateListener("active"); await flush();
  expect(getPackDownload(name).phase).toBe("missing");
});
it("does not let a late fetch response overwrite a newer completion event", async () => {
  let complete!: (value: NativePackState[]) => void;
  native.fetch.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  const pending = downloadPack(name);
  native.checkPackReady.mockResolvedValue(true);
  mockPackListener(state(4)); await flush();
  complete([state(1)]); await pending;
  expect(getPackDownload(name).phase).toBe("ready");
});

it("retains distinct raw confirmation statuses without automatically opening a dialog", async () => {
  for (const [status, reason] of [[7, "wifi"], [9, "play"]] as const) {
    native.getPackStates.mockResolvedValue([state(status)]);
    await refreshPack(name);
    expect(getPackDownload(name)).toMatchObject({ phase: "confirmation", nativeStatus: status, confirmationReason: reason });
  }
  expect(native.showConfirmationDialog).not.toHaveBeenCalled();
  native.checkPackReady.mockResolvedValue(true);
  mockPackListener(state(4)); await flush();
  expect(getPackDownload(name).phase).toBe("ready");
  expect(native.showConfirmationDialog).not.toHaveBeenCalled();
});
it("merges simultaneous refreshes of the same pack into one native query", async () => {
  const first = refreshPack(name), second = refreshPack(name);
  expect(first).toBe(second);
  await Promise.all([first, second]);
  expect(native.getPackStates).toHaveBeenCalledTimes(1);
  expect(native.checkPackReady).toHaveBeenCalledTimes(1);
  expect(native.resolveAssetUri).not.toHaveBeenCalled();
});

it("checks a large pack through one native call with its expected manifest hash", async () => {
  native.checkPackReady.mockResolvedValue(true);
  await refreshPack("audio_fr_b2");
  expect(native.checkPackReady).toHaveBeenCalledTimes(1);
  expect(native.checkPackReady).toHaveBeenCalledWith("audio_fr_b2", expect.stringMatching(/^[a-f0-9]{64}$/));
  expect(native.resolveAssetUri).not.toHaveBeenCalled();
  expect(getPackDownload("audio_fr_b2").phase).toBe("ready");
});

it("discards an in-flight readiness result on resume and performs a fresh check", async () => {
  let finish!: (available: boolean) => void;
  native.checkPackReady.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = refreshPack(name);
  mockAppStateListener("active");
  finish(true); await pending; await flush();
  expect(native.checkPackReady.mock.calls.filter(([pack]) => pack === name)).toHaveLength(2);
  expect(getPackDownload(name).phase).toBe("missing");
});
it("skips stale confirmation if the pack has completed or no longer needs consent", async () => {
  native.getPackStates.mockResolvedValue([state(9)]);
  await refreshPack(name);
  native.checkPackReady.mockResolvedValue(true);
  await confirmPackDownload(name);
  expect(getPackDownload(name).phase).toBe("ready");
  expect(native.showConfirmationDialog).not.toHaveBeenCalled();
  native.checkPackReady.mockResolvedValue(false);
  native.getPackStates.mockResolvedValue([state(2)]);
  await confirmPackDownload(name);
  expect(native.showConfirmationDialog).not.toHaveBeenCalled();
});
it("does not open a dialog if completion arrives while fresh confirmation is being checked", async () => {
  native.getPackStates.mockResolvedValue([state(9)]);
  await refreshPack(name);
  let complete!: (value: NativePackState[]) => void;
  let queryStarted!: () => void;
  const started = new Promise<void>((resolve) => { queryStarted = resolve; });
  native.getPackStates.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; queryStarted(); }));
  const pending = confirmPackDownload(name);
  await started;
  native.checkPackReady.mockResolvedValue(true);
  mockPackListener(state(4)); await flush();
  complete([state(9)]); await pending;
  expect(getPackDownload(name)).toMatchObject({ phase: "ready", confirmationPending: false });
  expect(native.showConfirmationDialog).not.toHaveBeenCalled();
});
it("a double tap opens one dialog, with a lock shared across course rows", async () => {
  native.getPackStates.mockResolvedValue([state(9)]);
  let finish!: (accepted: boolean) => void;
  let dialogStarted!: () => void;
  const started = new Promise<void>((resolve) => { dialogStarted = resolve; });
  native.showConfirmationDialog.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; dialogStarted(); }));
  const first = confirmPackDownload(name), second = confirmPackDownload(name);
  expect(first).toBe(second);
  expect(getPackDownload(name).confirmationPending).toBe(true);
  await started;
  expect(native.showConfirmationDialog).toHaveBeenCalledTimes(1);
  finish(false); await Promise.all([first, second]);
  expect(native.fetch).not.toHaveBeenCalled();
  expect(getPackDownload(name).confirmationPending).toBe(false);
  expect(console.info).toHaveBeenCalledWith("[PAD]", expect.objectContaining({ event: "confirmationDialogResult", accepted: false }));
});
it("does not fetch again if the pack becomes ready while a dialog is open", async () => {
  native.getPackStates.mockResolvedValue([state(7)]);
  await refreshPack(name);
  native.getPackStates.mockResolvedValue([state(7)]);
  native.showConfirmationDialog.mockImplementationOnce(async () => {
    native.checkPackReady.mockResolvedValue(true); return true;
  });
  await confirmPackDownload(name);
  expect(getPackDownload(name).phase).toBe("ready");
  expect(native.fetch).not.toHaveBeenCalled();
});
it("requires a new explicit tap if transfer consent becomes Play installation confirmation", async () => {
  native.getPackStates.mockResolvedValue([state(7)]);
  await refreshPack(name);
  native.getPackStates.mockResolvedValue([state(9)]);
  await confirmPackDownload(name);
  expect(getPackDownload(name)).toMatchObject({ phase: "confirmation", nativeStatus: 9, confirmationReason: "play", confirmationPending: false });
  expect(native.showConfirmationDialog).not.toHaveBeenCalled();
});

it("preserves snapshot identity and skips notifications for repeated native state and refresh results", async () => {
  await refreshPack(name);
  const snapshot = getPackDownload(name);
  const listener = jest.fn();
  const unsubscribe = subscribePackDownloads(listener);
  try {
    mockPackListener(state(8)); await flush();
    await refreshPack(name);
    expect(getPackDownload(name)).toBe(snapshot);
    expect(listener).not.toHaveBeenCalled();
    expect(native.checkPackReady).toHaveBeenCalledTimes(2); // Equality must not skip readiness checks.

    mockPackListener({ ...state(2), downloadedBytes: 100 }); await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    const progress = getPackDownload(name);
    mockPackListener({ ...state(2), downloadedBytes: 100 }); await flush();
    expect(getPackDownload(name)).toBe(progress);
    expect(listener).toHaveBeenCalledTimes(1);
    mockPackListener({ ...state(5), errorCode: -10 }); await flush();
    expect(getPackDownload(name)).toMatchObject({ phase: "failed", errorCode: -10 });
    expect(listener).toHaveBeenCalledTimes(2);
    mockPackListener(state(7)); await flush();
    expect(getPackDownload(name).confirmationReason).toBe("wifi");
    mockPackListener(state(9)); await flush();
    expect(getPackDownload(name).confirmationReason).toBe("play");
    expect(listener).toHaveBeenCalledTimes(4);
  } finally {
    unsubscribe();
  }
});
