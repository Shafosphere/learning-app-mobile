import { getAudioPack } from "../catalog";
import type { PlayAssetDeliveryModule } from "@/Audio/modules/play-asset-delivery";

let mockNative: PlayAssetDeliveryModule | null = null;
jest.mock("@/Audio/modules/play-asset-delivery", () => ({ get playAssetDelivery() { return mockNative; } }));
jest.mock("react-native", () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
const originalDev = Object.getOwnPropertyDescriptor(globalThis, "__DEV__");
function load(development: boolean) {
  Object.defineProperty(globalThis, "__DEV__", { value: development, configurable: true });
  let store!: typeof import("../packDownloads");
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    store = require("../packDownloads");
  });
  return store;
}
const name = "audio_es";
beforeEach(() => { mockNative = null; jest.useFakeTimers(); jest.spyOn(console, "info").mockImplementation(() => {}); });
afterEach(() => {
  jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks();
  if (originalDev) Object.defineProperty(globalThis, "__DEV__", originalDev);
});

it("exposes a download preview only in development without native PAD", async () => {
  const store = load(true);
  expect(store.getPackDownload(name)).toMatchObject({ phase: "missing", totalBytes: getAudioPack(name)!.sourceBytes, nativeStatus: null });
  const listener = jest.fn(); const unsubscribe = store.subscribePackDownloads(listener);
  await store.downloadPack(name);
  expect(store.getPackDownload(name).phase).toBe("pending");
  await jest.advanceTimersByTimeAsync(650);
  expect(store.getPackDownload(name)).toMatchObject({ phase: "downloading", nativeStatus: null });
  await jest.advanceTimersByTimeAsync(650 * 5);
  expect(store.getPackDownload(name).phase).toBe("transferring");
  await jest.advanceTimersByTimeAsync(650);
  expect(store.getPackDownload(name).phase).toBe("ready");
  expect(listener).toHaveBeenCalled(); unsubscribe();
  await store.refreshPack(name);
  expect(store.getPackDownload(name).phase).toBe("ready");
});
it("cancels and restarts simulated progress without lingering completion", async () => {
  const store = load(true);
  await store.downloadPack(name); await store.cancelPack(name);
  await jest.advanceTimersByTimeAsync(10000);
  expect(store.getPackDownload(name).phase).toBe("cancelled");
  await store.downloadPack(name); await jest.advanceTimersByTimeAsync(650 * 7);
  expect(store.getPackDownload(name).phase).toBe("ready");
});
it("never enables simulation in release builds or for unknown packs", async () => {
  const store = load(false);
  await store.downloadPack(name); await jest.advanceTimersByTimeAsync(10000);
  expect(store.getPackDownload(name).phase).toBe("unavailable");
  const preview = load(true);
  await preview.downloadPack("unknown");
  expect(preview.getPackDownload("unknown").phase).toBe("unavailable");
});
it("uses real PAD when native support is present, even in development", async () => {
  const native = { addListener: jest.fn(() => ({ remove: jest.fn() })), getPackLocation: jest.fn(), resolveAssetUri: jest.fn(), checkPackReady: jest.fn(),
    getPackStates: jest.fn(), fetch: jest.fn(async () => [{ name, status: 1, errorCode: 0, downloadedBytes: 0, totalBytes: 123, transferProgress: 0 }]),
    cancel: jest.fn(), showConfirmationDialog: jest.fn() };
  mockNative = native;
  const store = load(true);
  await store.downloadPack(name); await jest.advanceTimersByTimeAsync(10000);
  expect(native.fetch).toHaveBeenCalledWith([name]);
  expect(store.getPackDownload(name)).toMatchObject({ phase: "pending", nativeStatus: 1, totalBytes: 123 });
});
