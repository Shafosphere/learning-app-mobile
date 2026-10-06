import type { LanguageCourseGroupId } from "@/src/constants/languageCourseGroups";
import { CourseCategory } from "@/src/constants/courseCategories";
import { getFlagSource } from "@/src/constants/languageFlags";
import { CustomCourseSummary } from "@/src/db/sqlite/db";

export type OfficialCourseListItem = CustomCourseSummary & {
    sourceLang: string | null;
    targetLang: string | null;
    smallFlag: string | null;
    isMini: boolean;
    categoryId?: string;
    languageGroupId?: LanguageCourseGroupId;
    position?: number;
};

export type CourseGroup = {
    key: string;
    category?: CourseCategory;
    languageGroupId?: LanguageCourseGroupId;
    sourceLang: string | null;
    targetLang: string | null;
    sourceFlag?: ReturnType<typeof getFlagSource>;
    targetFlag?: ReturnType<typeof getFlagSource>;
    official: OfficialCourseListItem[];
};
