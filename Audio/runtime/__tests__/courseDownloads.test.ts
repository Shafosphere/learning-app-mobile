import type { NativePackState } from "@/Audio/modules/play-asset-delivery";

let mockListener: (state: NativePackState) => void;
const mockReady = new Set<string>();
const mockStatuses = new Map<string, number>();
const mockFetch = jest.fn();
const mockCancel = jest.fn();
const nativeState = (name: string, status: number, downloadedBytes = 0): NativePackState => ({
  name, status, downloadedBytes, totalBytes: 47519712, errorCode: 0, transferProgress: 0,
});
jest.mock("@/Audio/modules/play-asset-delivery", () => ({ playAssetDelivery: {
  addListener: jest.fn((_event, listener) => { mockListener = listener; return { remove: jest.fn() }; }),
  checkPackReady: jest.fn(async (name) => mockReady.has(name)),
  getPackStates: jest.fn(async (names: string[]) => names.map((name) => ({ name, status: mockStatuses.get(name) ?? 8,
    downloadedBytes: 0, totalBytes: 47519712, errorCode: 0, transferProgress: 0 }))),
  fetch: (...args: unknown[]) => mockFetch(...args), cancel: (...args: unknown[]) => mockCancel(...args),
  showConfirmationDialog: jest.fn(async () => false),
} }));
jest.mock("react-native", () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
let course: typeof import("../courseDownloads");
const slug = "fr_to_pl_first_50";
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
beforeEach(() => {
  mockReady.clear(); mockStatuses.clear(); jest.clearAllMocks();
  jest.spyOn(console, "info").mockImplementation(() => {});
  mockFetch.mockImplementation(async ([name]: string[]) => [nativeState(name, 1)]);
  mockCancel.mockImplementation(async ([name]: string[]) => [nativeState(name, 6)]);
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    course = require("../courseDownloads");
  });
});
afterEach(() => jest.restoreAllMocks());

it("refreshes without downloading; all French courses share one transfer", async () => {
  await course.refreshCourse(slug);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(course.getCourseDownload(slug)).toMatchObject({ phase: "missing", totalBytes: 47519712 });
  await Promise.all([course.downloadCourse(slug), course.downloadCourse("fr_to_en_first_50"), course.downloadCourse("french_b2")]);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(["audio_fr"]);
  mockListener(nativeState("audio_fr", 2, 100)); await flush();
  expect(course.getCourseDownload("french_b2")).toMatchObject({ phase: "downloading", downloadedBytes: 100 });
  mockReady.add("audio_fr");
  mockListener(nativeState("audio_fr", 4, 47519712)); await flush();
  for (const name of [slug, "fr_to_en_first_50", "french_b2"]) expect(course.getCourseDownload(name).phase).toBe("ready");
});
it("cancels the whole language, then retries it", async () => {
  await course.downloadCourse(slug);
  await course.cancelCourse("french_b2");
  expect(mockCancel).toHaveBeenCalledWith(["audio_fr"]);
  expect(course.getCourseDownload(slug).phase).toBe("cancelled");
  await course.downloadCourse(slug);
  expect(mockFetch).toHaveBeenCalledTimes(2);
});
it("does not treat old packs as ready and does not open confirmation automatically", async () => {
  mockReady.add("audio_fr_shared"); mockReady.add("audio_fr_50");
  mockStatuses.set("audio_fr", 9);
  await course.refreshCourse(slug);
  expect(course.getCourseDownload(slug)).toMatchObject({ phase: "confirmation", confirmationPack: "audio_fr" });
  expect(mockFetch).not.toHaveBeenCalled();
});
it("keeps snapshots stable for unrelated events and exposes shared progress", async () => {
  await course.refreshCourse(slug);
  const snapshot = course.getCourseDownload(slug);
  await course.refreshCourse(slug);
  expect(course.getCourseDownload(slug)).toBe(snapshot);
  mockListener(nativeState("audio_es", 2, 100)); await flush();
  expect(course.getCourseDownload(slug)).toBe(snapshot);
  mockListener(nativeState("audio_fr", 2, 100)); await flush();
  expect(course.getCourseDownload("french_b2").downloadedBytes).toBe(100);
});
