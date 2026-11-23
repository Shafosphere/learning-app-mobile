import { Asset } from 'expo-asset';
import { invalidateImages, resolveImageUri } from '../images';
import { refreshPack } from '../packDownloads';
import * as FileSystem from 'expo-file-system/legacy';
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn(async () => ({ exists: true })) }));
jest.mock('../generated/bundledImages', () => ({ usesImagePAD: false, bundledImageSets: { images_birds: { '01_White_Stork_Wei_storch_Ciconia_ciconia.webp': 101 } } }));
jest.mock('../packDownloads', () => ({ subscribePackDownloads: () => () => {}, refreshPack: jest.fn() }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn(() => ({ downloadAsync: async () => {}, localUri: 'file:///bundled/stork.webp' })) } }));
it('uses bundled files without PAD on Expo Go, iOS and web', async () => {
  expect(await resolveImageUri('asset://images_birds/01_White_Stork_Wei_storch_Ciconia_ciconia.webp')).toBe('file:///bundled/stork.webp');
  expect(Asset.fromModule).toHaveBeenCalledWith(101);
  expect(refreshPack).not.toHaveBeenCalled();
});

it.each([false, true])('downloads a deleted Expo cache file again (cached resolution: %s)', async (cached) => {
  invalidateImages();
  let exists = true;
  const asset = {
    localUri: 'file:///cache/tree.jpg' as string | null,
    uri: 'http://metro/tree.jpg',
    downloaded: true,
    downloadAsync: jest.fn(async () => {
      if (asset.downloaded) return;
      exists = true;
      asset.localUri = 'file:///cache/tree.jpg';
      asset.downloaded = true;
    }),
  };
  jest.mocked(Asset.fromModule).mockReturnValue(asset as any);
  jest.mocked(FileSystem.getInfoAsync).mockImplementation(async () => ({ exists }) as any);
  const reference = 'asset://images_birds/01_White_Stork_Wei_storch_Ciconia_ciconia.webp';
  if (cached) await resolveImageUri(reference);
  exists = false;
  expect(await resolveImageUri(reference)).toBe('file:///cache/tree.jpg');
  expect(exists).toBe(true);
  expect(asset.downloaded).toBe(true);
});

it('returns unavailable when a download does not restore the file', async () => {
  invalidateImages();
  jest.mocked(FileSystem.getInfoAsync).mockResolvedValue({ exists: false } as any);
  jest.mocked(Asset.fromModule).mockReturnValue({
    localUri: 'file:///cache/tree.jpg', uri: 'file:///cache/tree.jpg',
    downloaded: true, downloadAsync: jest.fn(async () => {}),
  } as any);
  expect(await resolveImageUri('asset://images_birds/01_White_Stork_Wei_storch_Ciconia_ciconia.webp')).toBeNull();
});
