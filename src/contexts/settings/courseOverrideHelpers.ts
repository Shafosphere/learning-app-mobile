import type { LanguageCourse } from "@/src/types/course";

import { makeBuiltinCourseKey } from "./courseKeys";
import type {
  CourseBoxZeroKeyParams,
  CourseOverrideState,
} from "./types";

type SetOverrides<T> = (value: CourseOverrideState<T>) => Promise<void>;

export function resolveBuiltinOverride<T>(
  params: CourseBoxZeroKeyParams,
  overrides: CourseOverrideState<T>,
  defaultValue: T
): T {
  const key = makeBuiltinCourseKey(params);
  return overrides.builtin[key] ?? defaultValue;
}

export function resolveCustomOverride<T>(
  courseId: number,
  overrides: CourseOverrideState<T>,
  defaultValue: T
): T {
  const key = courseId.toString();
  return overrides.custom[key] ?? defaultValue;
}

export async function setBuiltinOverride<T>({
  params,
  value,
  defaultValue,
  overrides,
  setOverrides,
}: {
  params: CourseBoxZeroKeyParams;
  value: T;
  defaultValue: T;
  overrides: CourseOverrideState<T>;
  setOverrides: SetOverrides<T>;
}): Promise<void> {
  const key = makeBuiltinCourseKey(params);
  const current = overrides.builtin[key];
  const shouldRemove = value === defaultValue;
  if (shouldRemove && current === undefined) {
    return;
  }
  if (!shouldRemove && current === value) {
    return;
  }
  const nextBuiltin = { ...overrides.builtin };
  if (shouldRemove) {
    delete nextBuiltin[key];
  } else {
    nextBuiltin[key] = value;
  }
  await setOverrides({
    builtin: nextBuiltin,
    custom: { ...overrides.custom },
  });
}

export async function setCustomOverride<T>({
  courseId,
  value,
  defaultValue,
  overrides,
  setOverrides,
}: {
  courseId: number;
  value: T;
  defaultValue: T;
  overrides: CourseOverrideState<T>;
  setOverrides: SetOverrides<T>;
}): Promise<void> {
  const key = courseId.toString();
  const current = overrides.custom[key];
  const shouldRemove = value === defaultValue;
  if (shouldRemove && current === undefined) {
    return;
  }
  if (!shouldRemove && current === value) {
    return;
  }
  const nextCustom = { ...overrides.custom };
  if (shouldRemove) {
    delete nextCustom[key];
  } else {
    nextCustom[key] = value;
  }
  await setOverrides({
    builtin: { ...overrides.builtin },
    custom: nextCustom,
  });
}

export function resolveActiveCourseOverride<T>({
  courses,
  activeCourseIdx,
  activeCustomCourseId,
  defaultValue,
  getBuiltin,
  getCustom,
}: {
  courses: LanguageCourse[];
  activeCourseIdx: number | null;
  activeCustomCourseId: number | null;
  defaultValue: T;
  getBuiltin: (params: CourseBoxZeroKeyParams) => T;
  getCustom: (courseId: number) => T;
}): T {
  if (activeCustomCourseId != null) {
    return getCustom(activeCustomCourseId);
  }
  if (activeCourseIdx != null) {
    const course = courses[activeCourseIdx];
    if (course) {
      return getBuiltin({
        sourceLang: course.sourceLang,
        targetLang: course.targetLang,
        level: course.level ?? null,
      });
    }
  }
  return defaultValue;
}
