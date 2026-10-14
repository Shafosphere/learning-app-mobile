import type { NativePackState } from "@/Audio/modules/play-asset-delivery";

let mockListener: (state: NativePackState) => void;
const mockReady = new Set<string>();
const mockStatuses = new Map<string, number>();
const mockFetch = jest.fn();
const mockCancel = jest.fn();
const nativeState = (name: string, status: number, downloadedBytes = 0): NativePackState => ({
  name, status, downloadedBytes, totalBytes: name === "audio_fr_50" ? 64800 : 454464, errorCode: 0, transferProgress: 0,
});
jest.mock("@/Audio/modules/play-asset-delivery", () => ({ playAssetDelivery: {
  addListener: jest.fn((_event, listener) => { mockListener = listener; return { remove: jest.fn() }; }),
  checkPackReady: jest.fn(async (name) => mockReady.has(name)),
  getPackStates: jest.fn(async (names: string[]) => names.map((name) => ({ name, status: mockStatuses.get(name) ?? 8,
    downloadedBytes: 0, totalBytes: name === "audio_fr_50" ? 64800 : 454464, errorCode: 0, transferProgress: 0 }))),
  fetch: (...args: unknown[]) => mockFetch(...args), cancel: (...args: unknown[]) => mockCancel(...args),
  showConfirmationDialog: jest.fn(async () => false),
} }));
jest.mock("react-native", () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
let course: typeof import("../courseDownloads");
let packs: typeof import("../packDownloads");
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    packs = require("../packDownloads");
  });
});
afterEach(() => jest.restoreAllMocks());

it("does not download on refresh; partial readiness shows only missing bytes", async () => {
  mockReady.add("audio_fr_shared");
  await course.refreshCourse(slug);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(course.getCourseDownload(slug)).toMatchObject({ phase: "missing", totalBytes: 64800 });
  expect(course.getCourseDownload(slug)).toBe(course.getCourseDownload(slug));
  await course.downloadCourse(slug);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(["audio_fr_50"]);
});
it("requires all packs for offline readiness and keeps total progress stable", async () => {
  await course.downloadCourse(slug);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(course.getCourseDownload(slug).totalBytes).toBe(519264);
  mockReady.add("audio_fr_50");
  mockListener(nativeState("audio_fr_50", 4, 64800)); await flush();
  expect(course.getCourseDownload(slug)).toMatchObject({ phase: "pending", totalBytes: 519264, downloadedBytes: 64800 });
  expect(course.getCourseDownload("fr_to_en_first_50").phase).not.toBe("ready");
  mockReady.add("audio_fr_shared");
  mockListener(nativeState("audio_fr_shared", 4, 454464)); await flush();
  expect(course.getCourseDownload(slug).phase).toBe("ready");
  expect(course.getCourseDownload("fr_to_en_first_50").phase).toBe("ready");
});
it("shared courses do not start duplicate downloads; cancellation leaves completed packs intact", async () => {
  await Promise.all([course.downloadCourse(slug), course.downloadCourse("fr_to_en_first_50")]);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  mockReady.add("audio_fr_50"); mockListener(nativeState("audio_fr_50", 4, 64800)); await flush();
  await course.cancelCourse("fr_to_en_first_50");
  expect(mockCancel).toHaveBeenCalledTimes(1);
  expect(mockCancel).toHaveBeenCalledWith(["audio_fr_shared"]);
  expect(packs.getPackDownload("audio_fr_50").phase).toBe("ready");
  expect(course.getCourseDownload(slug).phase).toBe("cancelled");
  await course.downloadCourse(slug);
  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(mockFetch).toHaveBeenLastCalledWith(["audio_fr_shared"]);
});
it("a failed member prevents readiness; retry fetches only unavailable members", async () => {
  mockReady.add("audio_fr_50");
  mockStatuses.set("audio_fr_shared", 5);
  await course.refreshCourse(slug);
  expect(course.getCourseDownload(slug).phase).toBe("failed");
  await course.downloadCourse(slug);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(["audio_fr_shared"]);
});
it("aggregates confirmation without fetching or opening dialogs automatically", async () => {
  mockReady.add("audio_fr_50"); mockStatuses.set("audio_fr_shared", 9);
  await course.refreshCourse(slug);
  expect(course.getCourseDownload(slug)).toMatchObject({ phase: "confirmation", confirmationReason: "play", confirmationPack: "audio_fr_shared" });
  expect(mockFetch).not.toHaveBeenCalled();
});
