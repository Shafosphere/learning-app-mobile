import { Asset } from 'expo-asset';
import { resolveImageUri } from '../images';
import { refreshPack } from '../packDownloads';
jest.mock('../generated/bundledImages', () => ({ usesImagePAD: false, bundledImageSets: { images_birds: { '01_White_Stork_Wei_storch_Ciconia_ciconia.webp': 101 } } }));
jest.mock('../packDownloads', () => ({ subscribePackDownloads: () => () => {}, refreshPack: jest.fn() }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn(() => ({ downloadAsync: async () => {}, localUri: 'file:///bundled/stork.webp' })) } }));
it('uses bundled files without PAD on Expo Go, iOS and web', async () => {
  expect(await resolveImageUri('asset://images_birds/01_White_Stork_Wei_storch_Ciconia_ciconia.webp')).toBe('file:///bundled/stork.webp');
  expect(Asset.fromModule).toHaveBeenCalledWith(101);
  expect(refreshPack).not.toHaveBeenCalled();
});
