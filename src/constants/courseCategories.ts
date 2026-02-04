
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
    programming: {
        id: "programming",
        label: "Programowanie",
        icon: "code",
    },
    science: {
        id: "science",
        label: "Nauka",
        icon: "atom",
    },
    math: {
        id: "math",
        label: "Matematyka",
        icon: "calculator",
    },
};
