
export interface CourseCategory {
    id: string;
    labelKey: string;
    descriptionKey: string;
    icon?: string;
}

export const COURSE_CATEGORIES: Record<string, CourseCategory> = {
    geography: {
        id: "geography",
        labelKey: "constants.courseCategories.label.geography",
        descriptionKey: "constants.courseCategories.description.stoliceIFlagi",
        icon: "earth-europe",
    },
    kosmos: {
        id: "kosmos",
        labelKey: "constants.courseCategories.label.kosmos",
        descriptionKey: "constants.courseCategories.description.astronomiaGwiazdozbiory",
        icon: "rocket",
    },
    historia: {
        id: "historia",
        labelKey: "constants.courseCategories.label.historia",
        descriptionKey: "constants.courseCategories.description.historiaPolski",
        icon: "landmark",
    },
    mitologia: {
        id: "mitologia",
        labelKey: "constants.courseCategories.label.mitologia",
        descriptionKey: "constants.courseCategories.description.mityBogowieIBohaterowie",
        icon: "book-open",
    },
    road_signs: {
        id: "road_signs",
        labelKey: "constants.courseCategories.label.roadSigns",
        descriptionKey: "constants.courseCategories.description.znakiDrogowe",
        icon: "road",
    },
    programming: {
        id: "programming",
        labelKey: "constants.courseCategories.label.programming",
        descriptionKey: "constants.courseCategories.description.javascript",
        icon: "code",
    },
    science: {
        id: "science",
        labelKey: "constants.courseCategories.label.science",
        descriptionKey: "constants.courseCategories.description.astronomiaGwiazdozbiory",
        icon: "atom",
    },
    math: {
        id: "Matura",
        labelKey: "constants.courseCategories.label.math",
        descriptionKey: "constants.courseCategories.description.matematyka",
        icon: "calculator",
    },
};
