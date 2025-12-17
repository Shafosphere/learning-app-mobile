export type QuoteCategory = "win" | "loss" | "startup" | "general";

export interface Quote {
    text: string;
    author?: string;
    category: QuoteCategory;
}

export const QUOTES: Quote[] = [
    // Startup
    {
        text: "Każdy dzień to nowa szansa, żeby stać się lepszym!",
        category: "startup",
    },
    {
        text: "Gotowy na dawkę wiedzy? Zaczynamy!",
        category: "startup",
    },
    {
        text: "Małe kroki prowadzą do wielkich celów.",
        category: "startup",
    },
    // Win
    {
        text: "Świetna robota! Oby tak dalej!",
        category: "win",
    },
    {
        text: "Jesteś mistrzem! Wiedza wchodzi Ci do głowy!",
        category: "win",
    },
    {
        text: "Brawo! Kolejny krok do perfekcji zaliczony.",
        category: "win",
    },
    // Loss / Failure
    {
        text: "Nie poddawaj się! Porażki uczą najwięcej.",
        category: "loss",
    },
    {
        text: "Trudności to tylko przystanek w drodze do sukcesu.",
        category: "loss",
    },
    {
        text: "Głowa do góry! Następnym razem pójdzie lepiej.",
        category: "loss",
    },
    // General / Fallback
    {
        text: "Nauka to podróż, nie wyścig.",
        category: "general",
    },
];
