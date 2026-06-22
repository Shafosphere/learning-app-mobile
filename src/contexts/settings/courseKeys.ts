import type { LanguageCourse } from "@/src/types/course";
import type { CourseBoxZeroKeyParams } from "./types";

export function languagesMatch(
  a: LanguageCourse,
  b: LanguageCourse
): boolean {
  const hasIdsA = a.sourceLangId != null && a.targetLangId != null;
  const hasIdsB = b.sourceLangId != null && b.targetLangId != null;

  if (hasIdsA && hasIdsB) {
    return (
      a.sourceLangId === b.sourceLangId && a.targetLangId === b.targetLangId
    );
  }

  return a.sourceLang === b.sourceLang && a.targetLang === b.targetLang;
}

export function coursesEqual(
  a: LanguageCourse,
  b: LanguageCourse
): boolean {
  if (!languagesMatch(a, b)) {
    return false;
  }
  const levelA = a.level ?? null;
  const levelB = b.level ?? null;
  return levelA === levelB;
}

export function findCourseIndex(
  list: LanguageCourse[],
  course: LanguageCourse
): number {
  const exactIdx = list.findIndex((candidate) =>
    coursesEqual(candidate, course)
  );
  if (exactIdx !== -1) {
    return exactIdx;
  }
  if (course.level != null) {
    return list.findIndex(
      (candidate) => candidate.level == null && languagesMatch(candidate, course)
    );
  }
  return -1;
}

export function makeBuiltinCourseKey({
  sourceLang,
  targetLang,
  level,
}: CourseBoxZeroKeyParams): string {
  const src = (sourceLang ?? "unknown").toLowerCase();
  const tgt = (targetLang ?? "unknown").toLowerCase();
  const lvl = (level ?? "none").toString().toUpperCase();
  return `${src}|${tgt}|${lvl}`;
}
