import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useContentImage } from '../useContentImage';
import { resolveImageUri } from '../images';
let mockRevision = 0;
const mockListeners = new Set<() => void>();
jest.mock('../images', () => ({
  resolveImageUri: jest.fn(),
  getImageRevision: () => mockRevision,
  subscribeImages: (listener: () => void) => { mockListeners.add(listener); return () => { mockListeners.delete(listener); }; },
}));
it('settles missing images without a retry loop; pack revision retries resolution', async () => {
  jest.mocked(resolveImageUri).mockResolvedValue(null);
  const { result } = renderHook(() => useContentImage('asset://images_birds/stork.webp'));
  await waitFor(() => expect(result.current).toEqual({ uri: null, loading: false }));
  expect(resolveImageUri).toHaveBeenCalledTimes(1);
  jest.mocked(resolveImageUri).mockResolvedValue('file:///updated/stork.webp');
  act(() => { mockRevision++; mockListeners.forEach(listener => listener()); });
  await waitFor(() => expect(result.current).toEqual({ uri: 'file:///updated/stork.webp', loading: false }));
});
it('normal image URIs remain synchronous and do not call PAD', () => {
  jest.mocked(resolveImageUri).mockClear();
  const { result } = renderHook(() => useContentImage('file:///user/photo.png'));
  expect(result.current).toEqual({ uri: 'file:///user/photo.png', loading: false });
  expect(resolveImageUri).not.toHaveBeenCalled();
});
