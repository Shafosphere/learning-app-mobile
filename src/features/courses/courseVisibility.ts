import {
  OFFICIAL_COURSE_AVAILABILITY,
  type OfficialCourseAvailability,
} from "@/src/constants/officialCourseAvailability";
import type { NativeLanguage } from "@/src/i18n";

export type CourseVisibilityItem = {
  id: number;
  slug: string | null;
};

export function filterCoursesForNativeLanguage<T extends CourseVisibilityItem>(
  courses: T[],
  nativeLanguage: NativeLanguage,
  pinnedCourseIds: readonly number[],
  availability: OfficialCourseAvailability = OFFICIAL_COURSE_AVAILABILITY
): T[] {
  const pinned = new Set(pinnedCourseIds);
  const availableSlugs = new Set(availability[nativeLanguage]);
  return courses.filter(
    (course) =>
      pinned.has(course.id) ||
      (course.slug != null && availableSlugs.has(course.slug))
  );
}
