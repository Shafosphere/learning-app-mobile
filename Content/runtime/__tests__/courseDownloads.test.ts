import type { NativePackState } from '@/Audio/modules/play-asset-delivery';
jest.mock("../generated/bundledImages", () => ({ usesImagePAD: true }));

let mockListener: (state: NativePackState) => void;
const mockReady = new Set<string>();
const mockFetch = jest.fn();
const mockCancel = jest.fn();
const mockSizes: Record<string, number> = { images_birds: 100, images_leaves: 200 };
const state = (name: string, status: number, downloadedBytes = 0): NativePackState => ({ name, status, downloadedBytes, totalBytes: mockSizes[name], errorCode: 0, transferProgress: 0 });
jest.mock('../catalog', () => ({
  getContentPack: (name: string) => mockSizes[name] ? { kind: 'images', sourceBytes: mockSizes[name], manifestHash: name } : undefined,
  getCourseImagePacks: (slug: string) => slug === 'mixed' ? ['images_birds', 'images_leaves'] : ['ptaki', 'birds_fr'].includes(slug) ? ['images_birds'] : [],
}));
jest.mock('@/Audio/modules/play-asset-delivery', () => ({ playAssetDelivery: {
  addListener: jest.fn((_event, listener) => { mockListener = listener; return { remove: jest.fn() }; }),
  checkPackReady: jest.fn(async (name) => mockReady.has(name)),
  getPackStates: jest.fn(async (names: string[]) => names.map(name => ({ name, status: 8, downloadedBytes: 0, totalBytes: mockSizes[name], errorCode: 0, transferProgress: 0 }))),
  fetch: (...args: unknown[]) => mockFetch(...args), cancel: (...args: unknown[]) => mockCancel(...args),
  showConfirmationDialog: jest.fn(async () => false),
} }));
jest.mock('react-native', () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
let course: typeof import('../courseDownloads');
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
beforeEach(() => {
  mockReady.clear(); jest.clearAllMocks();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  mockFetch.mockImplementation(async ([name]: string[]) => [state(name, 1)]);
  mockCancel.mockImplementation(async ([name]: string[]) => [state(name, 6)]);
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    course = require('../courseDownloads');
  });
});
afterEach(() => jest.restoreAllMocks());
it('shares one transfer and cancellation across course languages', async () => {
  await course.refreshCourse('ptaki');
  expect(mockFetch).not.toHaveBeenCalled();
  await Promise.all([course.downloadCourse('ptaki'), course.downloadCourse('birds_fr')]);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(['images_birds']);
  mockListener(state('images_birds', 2, 50)); await flush();
  expect(course.getCourseDownload('birds_fr')).toMatchObject({ phase: 'downloading', totalBytes: 100, downloadedBytes: 50 });
  await course.cancelCourse('birds_fr');
  expect(mockCancel).toHaveBeenCalledWith(['images_birds']);
  expect(course.getCourseDownload('ptaki').phase).toBe('cancelled');
});
it('downloads only missing packs and leaves installed packs untouched', async () => {
  mockReady.add('images_birds');
  await course.downloadCourse('mixed');
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(['images_leaves']);
  mockListener(state('images_leaves', 2, 100)); await flush();
  expect(course.getCourseDownload('mixed')).toMatchObject({ phase: 'downloading', totalBytes: 200, downloadedBytes: 100 });
  mockReady.add('images_leaves');
  mockListener(state('images_leaves', 4, 200)); await flush();
  expect(course.getCourseDownload('mixed').phase).toBe('ready');
});
it('keeps aggregate progress stable when one of multiple packs completes', async () => {
  await course.downloadCourse('mixed');
  mockListener(state('images_birds', 2, 50));
  mockListener(state('images_leaves', 2, 100)); await flush();
  expect(course.getCourseDownload('mixed')).toMatchObject({ totalBytes: 300, downloadedBytes: 150 });
  mockReady.add('images_birds');
  mockListener(state('images_birds', 4, 100)); await flush();
  expect(course.getCourseDownload('mixed')).toMatchObject({ phase: 'downloading', totalBytes: 300, downloadedBytes: 200 });
  const snapshot = course.getCourseDownload('mixed');
  expect(course.getCourseDownload('mixed')).toBe(snapshot);
});
