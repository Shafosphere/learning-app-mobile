
export interface CourseCategory {
    id: string;
    label: string;
    descriptionKey: string;
    icon?: string;
}

export const COURSE_CATEGORIES: Record<string, CourseCategory> = {
    geography: {
        id: "geography",
        label: "Geografia",
        descriptionKey: "constants.courseCategories.description.stoliceIFlagi",
        icon: "earth-europe",
    },
    kosmos: {
        id: "kosmos",
        label: "Kosmos",
        descriptionKey: "constants.courseCategories.description.astronomiaGwiazdozbiory",
        icon: "rocket",
    },
    historia: {
        id: "historia",
        label: "historia",
        descriptionKey: "constants.courseCategories.description.historiaPolski",
        icon: "landmark",
    },
    mitologia: {
        id: "mitologia",
        label: "Mitologia",
        descriptionKey: "constants.courseCategories.description.mityBogowieIBohaterowie",
        icon: "book-open",
    },
    programming: {
        id: "programming",
        label: "Programowanie",
        descriptionKey: "constants.courseCategories.description.javascript",
        icon: "code",
    },
    science: {
        id: "science",
        label: "Nauka",
        descriptionKey: "constants.courseCategories.description.astronomiaGwiazdozbiory",
        icon: "atom",
    },
    math: {
        id: "Matura",
        label: "Matura",
        descriptionKey: "constants.courseCategories.description.matematyka",
        icon: "calculator",
    },
};
