import { useSettings } from "@/src/contexts/SettingsContext";
import { normalizeCourseFrontImageRole } from "@/src/utils/frontImageRole";

/** Reviews may belong to a different course than the active study selection. */
export function useCourseFrontImageRole(courseId?: number | null) {
  const settings = useSettings();
  return {
    role: normalizeCourseFrontImageRole(courseId == null
      ? settings.courseFrontImageRole
      : settings.getCustomCourseFrontImageRole?.(courseId)),
    hydrated: settings.courseFrontImageRoleHydrated !== false,
  };
}
