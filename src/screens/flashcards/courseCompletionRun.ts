import AsyncStorage from "@react-native-async-storage/async-storage";

type StoredCourseCompletionRun = {
  startedAt: number;
};

function getCourseCompletionRunStorageKey(courseId: number): string {
  return `customCourseCompletionRun:${courseId}`;
}

export async function getCourseCompletionRunStartedAt(
  courseId: number
): Promise<number | null> {
  if (!courseId) return null;
  const raw = await AsyncStorage.getItem(getCourseCompletionRunStorageKey(courseId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredCourseCompletionRun | null;
    const startedAt = parsed?.startedAt;
    return typeof startedAt === "number" && Number.isFinite(startedAt)
      ? startedAt
      : null;
  } catch {
    return null;
  }
}

export async function ensureCourseCompletionRunStarted(
  courseId: number,
  nowMs: number = Date.now()
): Promise<number> {
  if (!courseId) return nowMs;
  const existing = await getCourseCompletionRunStartedAt(courseId);
  if (existing != null) {
    return existing;
  }

  const startedAt = Math.max(0, nowMs);
  await AsyncStorage.setItem(
    getCourseCompletionRunStorageKey(courseId),
    JSON.stringify({ startedAt })
  );
  return startedAt;
}

export async function clearCourseCompletionRun(courseId: number): Promise<void> {
  if (!courseId) return;
  await AsyncStorage.removeItem(getCourseCompletionRunStorageKey(courseId));
}
