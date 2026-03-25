import { stripDiacritics } from "@/src/utils/diacritics";

export type CourseNameConflictKind = "none" | "duplicate" | "similar";

export type CourseNameCandidate = {
  id: number;
  name: string;
};

export type CourseNameConflictResult = {
  kind: CourseNameConflictKind;
  matchedCourse: CourseNameCandidate | null;
};

const normalizeWhitespace = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export const normalizeCourseNameForComparison = (value: string): string => {
  const normalized = stripDiacritics(normalizeWhitespace(value).toLowerCase());
  return normalized.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
};

const normalizeCourseNameCompact = (value: string): string =>
  normalizeCourseNameForComparison(value).replace(/[\s\-.!?,;:/\\()[\]{}"'`~]+/g, "");

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  const next = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    next[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(
        next[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = next[j];
    }
  }

  return prev[b.length];
};

const isSimilarNormalizedName = (left: string, right: string): boolean => {
  if (!left || !right || left === right) {
    return false;
  }

  const leftCompact = normalizeCourseNameCompact(left);
  const rightCompact = normalizeCourseNameCompact(right);

  if (!leftCompact || !rightCompact || leftCompact === rightCompact) {
    return false;
  }

  if (
    leftCompact.includes(rightCompact) ||
    rightCompact.includes(leftCompact)
  ) {
    const lengthGap = Math.abs(leftCompact.length - rightCompact.length);
    return lengthGap <= 3;
  }

  const distance = levenshteinDistance(leftCompact, rightCompact);
  const maxLength = Math.max(leftCompact.length, rightCompact.length);

  if (maxLength <= 6) {
    return distance <= 1;
  }
  if (maxLength <= 12) {
    return distance <= 2;
  }
  return distance <= 3;
};

export const findCourseNameConflict = (
  name: string,
  courses: CourseNameCandidate[],
  currentCourseId?: number | null,
): CourseNameConflictResult => {
  const normalizedTarget = normalizeCourseNameForComparison(name);
  if (!normalizedTarget) {
    return { kind: "none", matchedCourse: null };
  }

  const comparableCourses = courses.filter((course) => course.id !== currentCourseId);

  const duplicateMatch =
    comparableCourses.find(
      (course) =>
        normalizeCourseNameForComparison(course.name) === normalizedTarget,
    ) ?? null;
  if (duplicateMatch) {
    return { kind: "duplicate", matchedCourse: duplicateMatch };
  }

  const similarMatch =
    comparableCourses.find((course) =>
      isSimilarNormalizedName(course.name, name),
    ) ?? null;

  return similarMatch
    ? { kind: "similar", matchedCourse: similarMatch }
    : { kind: "none", matchedCourse: null };
};
