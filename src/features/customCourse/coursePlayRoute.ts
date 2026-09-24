export type CoursePlayRoute = "/flashcards" | "/course-entry-settings";

export function getCoursePlayRoute(
  courseId: number | null,
  settingsHydrated: boolean,
  hasSeenSettings: (courseId: number) => boolean,
): CoursePlayRoute | null {
  if (!settingsHydrated) return null;
  if (courseId != null && !hasSeenSettings(courseId)) {
    return "/course-entry-settings";
  }
  return "/flashcards";
}
