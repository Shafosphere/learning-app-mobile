import type { PlayAssetDeliveryModule } from '@/Audio/modules/play-asset-delivery';
let mockPAD = false;
let mockNative: PlayAssetDeliveryModule;
jest.mock('../generated/bundledImages', () => ({ get usesImagePAD() { return mockPAD; }, bundledImageSets: {} }));
jest.mock('@/Audio/modules/play-asset-delivery', () => ({ get playAssetDelivery() { return mockNative; } }));
jest.mock('react-native', () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
const originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
function load(development: boolean) {
  Object.defineProperty(globalThis, '__DEV__', { value: development, configurable: true });
  let store!: typeof import('../packDownloads');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    store = require('../packDownloads');
  });
  return store;
}
const name = 'images_birds';
beforeEach(() => {
  mockPAD = false; jest.useFakeTimers();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  mockNative = {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    fetch: jest.fn(async () => [{ name, status: 1, errorCode: 0, downloadedBytes: 0, totalBytes: 100, transferProgress: 0 }]),
    cancel: jest.fn(), getPackStates: jest.fn(), getPackLocation: jest.fn(), resolveAssetUri: jest.fn(), checkPackReady: jest.fn(), showConfirmationDialog: jest.fn(),
  };
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); if (originalDev) Object.defineProperty(globalThis, '__DEV__', originalDev); });
it('previews bundled image downloads in development even with a native client', async () => {
  const store = load(true);
  expect(store.getPackDownload(name).phase).toBe('missing');
  await store.refreshPack(name);
  await store.downloadPack(name);
  expect(store.getPackDownload(name).phase).toBe('pending');
  await jest.advanceTimersByTimeAsync(650 * 7);
  expect(store.getPackDownload(name).phase).toBe('ready');
  expect(mockNative.fetch).not.toHaveBeenCalled();
  expect(mockNative.checkPackReady).not.toHaveBeenCalled();
});
it('can cancel preview without cancelling a native pack', async () => {
  const store = load(true);
  await store.downloadPack(name); await store.cancelPack(name);
  await jest.advanceTimersByTimeAsync(10000);
  expect(store.getPackDownload(name).phase).toBe('cancelled');
  expect(mockNative.cancel).not.toHaveBeenCalled();
});
it.each([[true, true], [false, false]])('uses real PAD for development=%s and PAD variant=%s', async (development, pad) => {
  mockPAD = pad;
  const store = load(development);
  await store.downloadPack(name); await jest.advanceTimersByTimeAsync(10000);
  expect(mockNative.fetch).toHaveBeenCalledWith([name]);
  expect(store.getPackDownload(name)).toMatchObject({ phase: 'pending', nativeStatus: 1 });
});
