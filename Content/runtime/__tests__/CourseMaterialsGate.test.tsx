import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';
import { CourseMaterialsGate } from '../CourseMaterialsGate';
import { getCustomCourseById } from '@/src/db/sqlite/db';

let mockPAD = true;
let mockPhase = 'missing';
let mockHasImages = true;
let mockForeground: (state: import("react-native").AppStateStatus) => void;
const mockListeners = new Set<() => void>();
const mockSessionMount = jest.fn();
const mockRestorePreview = jest.fn();
const mockPreviewMissingImagePacks = jest.fn((_names: string[]) => mockRestorePreview);
jest.mock('@/src/components/Box/Skin/BoxSkin', () => 'BoxSkin');
jest.mock('../useCourseMaterialsEntrance', () => ({ useCourseMaterialsEntrance: () => ({}) }));
jest.mock('../images', () => ({ get usesImagePAD() { return mockPAD; } }));
jest.mock('../catalog', () => ({ getCourseImagePacks: (slug: string) => slug === 'ptaki' && mockHasImages ? ['images_birds'] : [] }));
jest.mock('../courseDownloads', () => ({ getCourseDownload: () => mockSnapshots[mockPhase], refreshCourse: jest.fn(async () => {}) }));
jest.mock('../packDownloads', () => ({ previewMissingImagePacks: (names: string[]) => mockPreviewMissingImagePacks(names), subscribePackDownloads: (listener: () => void) => { mockListeners.add(listener); return () => { mockListeners.delete(listener); }; } }));
jest.mock('../CourseImageDownloadRow', () => ({ CourseImageDownloadRow: () => { const { Text } = jest.requireActual('react-native'); return <Text>Download panel</Text>; } }));
jest.mock('@/src/db/sqlite/db', () => ({ getCustomCourseById: jest.fn() }));
jest.mock('@/src/contexts/SettingsContext', () => ({ useThemeSettings: () => ({ colors: {} }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
// Stable snapshots are essential for useSyncExternalStore.
const mockSnapshots: Record<string, { phase: string }> = Object.fromEntries(['missing', 'ready', 'failed'].map(phase => [phase, { phase }]));
const update = (phase: string) => act(() => { mockPhase = phase; mockListeners.forEach(listener => listener()); });
function Session() { React.useEffect(() => { mockSessionMount(); }, []); return <Text>Study session</Text>; }
beforeEach(() => {
  jest.clearAllMocks(); mockPAD = true; mockPhase = 'missing'; mockHasImages = true;
  jest.mocked(getCustomCourseById).mockResolvedValue({ slug: 'ptaki', name: 'Birds', isOfficial: true } as any);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => { mockForeground = handler; return { remove: jest.fn() }; });
});
it('does not initialize study/review session before download and explicit Start', async () => {
  const screen = render(<CourseMaterialsGate courseId={1}><Session /></CourseMaterialsGate>);
  await screen.findByText('Download panel');
  expect(mockSessionMount).not.toHaveBeenCalled();
  update('ready');
  expect(mockSessionMount).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('contentDownload.start'));
  await screen.findByText('Study session');
  expect(mockSessionMount).toHaveBeenCalledTimes(1);
  await act(async () => mockForeground('active'));
  expect(mockSessionMount).toHaveBeenCalledTimes(1);
});
it('already installed packs allow entry immediately', async () => {
  mockPhase = 'ready';
  const screen = render(<CourseMaterialsGate courseId={1}><Session /></CourseMaterialsGate>);
  await screen.findByText('Study session');
  expect(screen.queryByText('contentDownload.start')).toBeNull();
});
it('missing pack after foreground blocks session again', async () => {
  mockPhase = 'ready';
  const screen = render(<CourseMaterialsGate courseId={1}><Session /></CourseMaterialsGate>);
  await screen.findByText('Study session');
  update('missing');
  expect(screen.queryByText('Study session')).toBeNull();
  await act(async () => mockForeground('active'));
  await screen.findByText('Download panel');
});
it('lookup errors allow retry and never start the session', async () => {
  jest.mocked(getCustomCourseById).mockRejectedValueOnce(new Error('database unavailable'));
  const screen = render(<CourseMaterialsGate courseId={1}><Session /></CourseMaterialsGate>);
  await screen.findByText('contentDownload.lookupError');
  expect(mockSessionMount).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('audioDownload.retry'));
  await screen.findByText('Download panel');
});
it('courses without image packs and bundled platforms need no downloads', async () => {
  mockHasImages = false;
  const screen = render(<CourseMaterialsGate courseId={1}><Session /></CourseMaterialsGate>);
  await screen.findByText('Study session'); screen.unmount();
  mockPAD = false;
  render(<CourseMaterialsGate courseId={1}><Session /></CourseMaterialsGate>);
  expect(mockSessionMount).toHaveBeenCalledTimes(2);
});

it('previews missing course images on bundled platforms and restores them on exit', async () => {
  mockPAD = false;
  const screen = render(<CourseMaterialsGate courseId={1} previewMissingImages><Session /></CourseMaterialsGate>);
  await screen.findByText('Download panel');
  expect(mockPreviewMissingImagePacks).toHaveBeenCalledWith(['images_birds']);
  expect(mockSessionMount).not.toHaveBeenCalled();
  await act(async () => mockForeground('active'));
  expect(mockPreviewMissingImagePacks).toHaveBeenCalledTimes(1);
  update('ready');
  fireEvent.press(screen.getByText('contentDownload.start'));
  await screen.findByText('Study session');
  screen.unmount();
  expect(mockRestorePreview).toHaveBeenCalledTimes(1);
});

it('does not start a preview if the course lookup finishes after leaving', async () => {
  let resolve!: (value: any) => void;
  jest.mocked(getCustomCourseById).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const screen = render(<CourseMaterialsGate courseId={1} previewMissingImages><Session /></CourseMaterialsGate>);
  screen.unmount();
  await act(async () => resolve({ slug: 'ptaki', name: 'Birds', isOfficial: true }));
  expect(mockPreviewMissingImagePacks).not.toHaveBeenCalled();
});
