import { CourseCategory } from "@/src/constants/courseCategories";
import { getFlagSource } from "@/src/constants/languageFlags";
import { CustomCourseSummary } from "@/src/db/sqlite/db";

export type OfficialCourseListItem = CustomCourseSummary & {
    sourceLang: string | null;
    targetLang: string | null;
    smallFlag: string | null;
    isMini: boolean;
    categoryId?: string;
};

export type CourseGroup = {
    key: string;
    category?: CourseCategory;
    sourceLang: string | null;
    targetLang: string | null;
    sourceFlag?: ReturnType<typeof getFlagSource>;
    targetFlag?: ReturnType<typeof getFlagSource>;
    official: OfficialCourseListItem[];
};

export type SelectedCourse = { type: "custom"; id: number };
