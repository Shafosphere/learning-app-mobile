import { AppState } from 'react-native';
import { playAssetDelivery } from '@/Audio/modules/play-asset-delivery';
import { resolveImageUri } from '../images';
import { refreshPack } from '../packDownloads';
import data from '../generated/images.json';

jest.mock('../generated/bundledImages', () => ({ usesImagePAD: true, bundledImageSets: {} }));
jest.mock('@/Audio/modules/play-asset-delivery', () => ({ playAssetDelivery: { resolveAssetUri: jest.fn() } }));
let mockPhase = 'ready';
const mockListeners = new Set<() => void>();
jest.mock('../packDownloads', () => ({
  getPackDownload: jest.fn(() => ({ phase: mockPhase })), refreshPack: jest.fn(async () => {}),
  subscribePackDownloads: (listener: () => void) => { mockListeners.add(listener); return () => mockListeners.delete(listener); },
}));
const reference = `asset://images_birds/${Object.keys(data.packs.images_birds.files)[0]}`;
beforeEach(() => { jest.clearAllMocks(); mockPhase = 'ready'; jest.mocked(playAssetDelivery!.resolveAssetUri).mockResolvedValue('file:///pack/stork.webp'); });
let mockForeground: (state: import("react-native").AppStateStatus) => void;
jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => { mockForeground = handler; return { remove: jest.fn() }; });
it('resolves stable identifiers to current paths; never stores paths in database', async () => {
  expect(await resolveImageUri(reference)).toBe('file:///pack/stork.webp');
  expect(refreshPack).not.toHaveBeenCalled();
  expect(playAssetDelivery!.resolveAssetUri).toHaveBeenCalledWith('images_birds', Object.keys(data.packs.images_birds.files)[0]);
  expect(await resolveImageUri('file:///user/photo.png')).toBe('file:///user/photo.png');
  expect(await resolveImageUri('asset://images_birds/../outside')).toBeNull();
});
it('invalidates cached locations on pack state changes and retries after download', async () => {
  mockPhase = 'missing'; mockListeners.forEach(listener => listener());
  expect(await resolveImageUri(reference)).toBeNull();
  mockPhase = 'ready'; mockListeners.forEach(listener => listener());
  jest.mocked(playAssetDelivery!.resolveAssetUri).mockResolvedValue('file:///updated/stork.webp');
  expect(await resolveImageUri(reference)).toBe('file:///updated/stork.webp');
});

it('invalidates locations on foreground and returns null for missing files', async () => {
  mockForeground('active');
  jest.mocked(playAssetDelivery!.resolveAssetUri).mockResolvedValue('file:///new-install/stork.webp');
  expect(await resolveImageUri(reference)).toBe('file:///new-install/stork.webp');
  mockForeground('active');
  jest.mocked(playAssetDelivery!.resolveAssetUri).mockResolvedValue(null);
  expect(await resolveImageUri(reference)).toBeNull();
});
