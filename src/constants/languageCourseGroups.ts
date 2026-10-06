// Language series stay separate from Knowledge categories.
export const LANGUAGE_COURSE_GROUPS = {
  englishFromZero: {
    labelKey: "constants.languageCourseGroups.label.englishFromZero",
    descriptionKey: "constants.languageCourseGroups.description.englishFromZero",
  },
} as const;

export type LanguageCourseGroupId = keyof typeof LANGUAGE_COURSE_GROUPS;
