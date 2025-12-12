
export interface CourseCategory {
    id: string;
    label: string;
    icon?: string;
}

export const COURSE_CATEGORIES: Record<string, CourseCategory> = {
    geography: {
        id: "geography",
        label: "Geografia",
        icon: "earth-europe",
    },
};
