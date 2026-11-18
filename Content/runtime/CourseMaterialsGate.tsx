import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeSettings } from '@/src/contexts/SettingsContext';
import { getCustomCourseById } from '@/src/db/sqlite/db';
import { usesImagePAD } from './images';
import { getCourseImagePacks } from './catalog';
import { getCourseDownload, refreshCourse } from './courseDownloads';
import { subscribePackDownloads } from './packDownloads';
import { CourseImageDownloadRow } from './CourseImageDownloadRow';

export function CourseMaterialsGate({ courseId, children }: { courseId: number | null; children: ReactNode }) {
  return usesImagePAD && courseId != null ? <NativeGate key={courseId} courseId={courseId}>{children}</NativeGate> : <>{children}</>;
}
function NativeGate({ courseId, children }: { courseId: number; children: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useThemeSettings();
  const [course, setCourse] = useState<{ slug: string | null; name: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [needsDownload, setNeedsDownload] = useState(false);
  const slug = course?.slug ?? '';
  const snapshot = useSyncExternalStore(subscribePackDownloads, useCallback(() => getCourseDownload(slug), [slug]));
  const check = useCallback(async () => {
    setError(false);
    try {
      const record = await getCustomCourseById(courseId);
      if (!record) throw new Error('Course not found');
      const current = { slug: record.isOfficial ? record.slug ?? null : null, name: record.name };
      setCourse(current);
      const required = getCourseImagePacks(current.slug);
      if (required.length) {
        await refreshCourse(current.slug!);
        if (getCourseDownload(current.slug!).phase !== 'ready') { setNeedsDownload(true); setAdmitted(false); }
      }
      setChecked(true);
    } catch { setError(true); }
  }, [courseId]);
  useEffect(() => { void check(); }, [check]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state === 'active') { void check(); } });
    return () => sub.remove();
  }, [check]);
  const noRequirements = course && !getCourseImagePacks(course.slug).length;
  const ready = snapshot.phase === 'ready';
  useEffect(() => {
    if (checked && course && !noRequirements && !ready) { setNeedsDownload(true); setAdmitted(false); }
  }, [checked, course, noRequirements, ready]);
  if (checked && !error && (noRequirements || (ready && (!needsDownload || admitted)))) return <>{children}</>;
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
    {error ? <>
      <Text style={{ color: colors.paragraph }}>{t('contentDownload.lookupError')}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void check(); }} style={{ padding: 16 }}><Text style={{ color: colors.headline }}>{t('audioDownload.retry')}</Text></Pressable>
    </> : !checked ? <ActivityIndicator color={colors.headline} /> : <>
      <Text style={{ color: colors.headline, marginBottom: 24 }}>{t('contentDownload.required')}</Text>
      <CourseImageDownloadRow slug={course?.slug} courseName={course?.name ?? ''} />
      {ready ? <Pressable accessibilityRole="button" onPress={() => setAdmitted(true)} style={{ padding: 16, marginTop: 16, borderRadius: 12, backgroundColor: colors.my_green }}><Text style={{ color: colors.font }}>{t('contentDownload.start')}</Text></Pressable> : null}
    </>}
  </View>;
}
