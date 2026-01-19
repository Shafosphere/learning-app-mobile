import { getFlagSource } from "@/src/constants/languageFlags";
import { CustomCourseSummary } from "@/src/db/sqlite/db";

export type OfficialCourseReviewItem = CustomCourseSummary & {
    sourceLang: string | null;
    targetLang: string | null;
    isMini: boolean;
};

export type OfficialGroup = {
    key: string;
    targetLang: string | null;
    sourceLang: string | null;
    targetFlag?: ReturnType<typeof getFlagSource>;
    sourceFlag?: ReturnType<typeof getFlagSource>;
    courses: OfficialCourseReviewItem[];
};
