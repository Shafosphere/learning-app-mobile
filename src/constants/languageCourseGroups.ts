// Language series stay separate from Knowledge categories.
export const LANGUAGE_COURSE_GROUPS = {
  spanishFromZero: {
    labelKey: "constants.languageCourseGroups.label.spanishFromZero",
    descriptionKey: "constants.languageCourseGroups.description.spanishFromZero",
  },
  frenchFromZero: {
    labelKey: "constants.languageCourseGroups.label.frenchFromZero",
    descriptionKey: "constants.languageCourseGroups.description.frenchFromZero",
  },
  englishFromZero: {
    labelKey: "constants.languageCourseGroups.label.englishFromZero",
    descriptionKey: "constants.languageCourseGroups.description.englishFromZero",
  },
} as const;

export type LanguageCourseGroupId = keyof typeof LANGUAGE_COURSE_GROUPS;
