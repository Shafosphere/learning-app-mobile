import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

export async function countDueReviewsAt(
  pinnedOfficialCourseIds: number[],
  atMs: number = Date.now()
): Promise<number> {
  const customRows = await getCustomCoursesWithCardCounts();
  const officialIds = new Set(pinnedOfficialCourseIds);
  const coursesToCount = customRows.filter((course) => {
    if (!course.reviewsEnabled) {
      return false;
    }
    if (course.isOfficial) {
      return officialIds.has(course.id);
    }
    return true;
  });

  const dueCounts = await Promise.all(
    coursesToCount.map(async (course) => {
      try {
        return await countDueCustomReviews(course.id, atMs);
      } catch (error) {
        console.warn(
          `[DueReviews] Failed to count reviews for course ${course.id}`,
          error
        );
        return 0;
      }
    })
  );

  return dueCounts.reduce((sum, count) => sum + count, 0);
}
