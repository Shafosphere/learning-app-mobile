
export interface CourseCategory {
    id: string;
    label: string;
    description: string;
    icon?: string;
}

export const COURSE_CATEGORIES: Record<string, CourseCategory> = {
    geography: {
        id: "geography",
        label: "Geografia",
        description: "Stolice i flagi",
        icon: "earth-europe",
    },
    kosmos: {
        id: "kosmos",
        label: "Kosmos",
        description: "Astronomia, gwiazdozbiory",
        icon: "rocket",
    },
    historia: {
        id: "historia",
        label: "historia",
        description: "Historia Polski",
        icon: "landmark",
    },
    programming: {
        id: "programming",
        label: "Programowanie",
        description: "JavaScript",
        icon: "code",
    },
    science: {
        id: "science",
        label: "Nauka",
        description: "Astronomia, gwiazdozbiory",
        icon: "atom",
    },
    math: {
        id: "Matura",
        label: "Matura",
        description: "Matematyka",
        icon: "calculator",
    },
};
