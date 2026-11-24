import type { PlayAssetDeliveryModule } from '@/Audio/modules/play-asset-delivery';
import { AppState } from 'react-native';
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
  jest.mocked(AppState.addEventListener).mockClear();
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
it.each([
  [false, 0, 'pending'],
  [false, 650, 'downloading'],
  [false, 650 * 6, 'transferring'],
  [true, 0, 'pending'],
  [true, 650, 'downloading'],
  [true, 650 * 6, 'transferring'],
] as const)('finishes a preview after resume (forced=%s, elapsed=%s, phase=%s)', async (forced, elapsed, phase) => {
  mockPAD = forced;
  const store = load(true);
  const restore = forced ? store.previewMissingImagePacks([name]) : () => {};
  await store.downloadPack(name);
  await jest.advanceTimersByTimeAsync(elapsed);
  expect(store.getPackDownload(name).phase).toBe(phase);
  const onAppStateChange = jest.mocked(AppState.addEventListener).mock.calls[0][1];
  onAppStateChange('background');
  await jest.advanceTimersByTimeAsync(100);
  onAppStateChange('active');
  await jest.advanceTimersByTimeAsync(650 * 7 - elapsed - 100);
  expect(store.getPackDownload(name)).toMatchObject({
    phase: 'ready',
    downloadedBytes: store.getPackDownload(name).totalBytes,
  });
  expect(mockNative.fetch).not.toHaveBeenCalled();
  expect(mockNative.checkPackReady).not.toHaveBeenCalled();
  expect(mockNative.getPackStates).not.toHaveBeenCalled();
  restore();
});
it.each([[true, true], [false, false]])('uses real PAD for development=%s and PAD variant=%s', async (development, pad) => {
  mockPAD = pad;
  const store = load(development);
  await store.downloadPack(name); await jest.advanceTimersByTimeAsync(10000);
  expect(mockNative.fetch).toHaveBeenCalledWith([name]);
  expect(store.getPackDownload(name)).toMatchObject({ phase: 'pending', nativeStatus: 1 });
});

it('temporarily previews an installed native pack, simulates retry, and restores its snapshot', async () => {
  mockPAD = true;
  mockNative.checkPackReady = jest.fn(async () => true);
  const store = load(true);
  await store.refreshPack(name);
  const installed = store.getPackDownload(name);
  expect(installed.phase).toBe('ready');
  jest.mocked(mockNative.checkPackReady).mockClear();
  const restore = store.previewMissingImagePacks([name]);
  await store.refreshPack(name);
  expect(store.getPackDownload(name)).toMatchObject({ phase: 'missing', downloadedBytes: 0 });
  await store.downloadPack(name);
  await store.cancelPack(name);
  expect(store.getPackDownload(name).phase).toBe('cancelled');
  await store.downloadPack(name);
  await jest.advanceTimersByTimeAsync(650 * 7);
  expect(store.getPackDownload(name).phase).toBe('ready');
  expect(mockNative.fetch).not.toHaveBeenCalled();
  expect(mockNative.cancel).not.toHaveBeenCalled();
  expect(mockNative.checkPackReady).not.toHaveBeenCalled();
  restore();
  expect(store.getPackDownload(name)).toBe(installed);
});

it('stops preview timers when leaving during a simulated download', async () => {
  const store = load(true);
  const previous = store.getPackDownload(name);
  const restore = store.previewMissingImagePacks([name]);
  await store.downloadPack(name);
  restore();
  await jest.advanceTimersByTimeAsync(10000);
  expect(store.getPackDownload(name)).toBe(previous);
});

it('ignores missing image previews in production', async () => {
  const store = load(false);
  const previous = store.getPackDownload(name);
  const restore = store.previewMissingImagePacks([name]);
  expect(store.getPackDownload(name)).toBe(previous);
  await store.downloadPack(name);
  restore();
  expect(mockNative.fetch).toHaveBeenCalledWith([name]);
});

it('resumes a bundled preview download that was already running before entering', async () => {
  const store = load(true);
  await store.downloadPack(name);
  const restore = store.previewMissingImagePacks([name]);
  expect(store.getPackDownload(name).phase).toBe('missing');
  restore();
  await jest.advanceTimersByTimeAsync(650 * 7);
  expect(store.getPackDownload(name).phase).toBe('ready');
});
