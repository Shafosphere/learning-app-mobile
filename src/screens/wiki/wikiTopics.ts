export type BlockTone = "pink" | "green" | "yellow";

export type WikiBlock =
  | { type: "heading"; text: string; icon?: string; tone?: BlockTone }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; tone?: BlockTone }
  | { type: "callout"; text: string; tone?: BlockTone };

export type WikiTopic = {
  title: string;
  subtitle: string;
  blocks: WikiBlock[];
};

export const WIKI_TOPICS: WikiTopic[] = [
  {
    title: "Intro",
    subtitle: "O czym jest ta apka",
    blocks: [
      {
        type: "paragraph",
        text: "Hej! Ta aplikacja to Twój osobisty trener do nauki na fiszkach.",
      },
      {
        type: "paragraph",
        text: "Zapomnij o starej metodzie „zakryj paluszkiem i powtórz w myślach” – tutaj wszystko działa sprawniej i bardziej aktywnie.",
      },
      { type: "heading", icon: "🎯", text: "Jak to działa?", tone: "pink" },
      {
        type: "paragraph",
        text: "Używamy zmodyfikowanego systemu Leitnera (znasz pewnie pudełka na fiszki).",
      },
      {
        type: "list",
        items: [
          "Trudne słówka wracają częściej",
          "Opanowane pojawiają się rzadziej",
          "Ty uczysz się efektywnie, bez tracenia czasu",
        ],
        tone: "pink",
      },
      { type: "heading", icon: "💡", text: "Dlaczego warto?", tone: "green" },
      {
        type: "paragraph",
        text: "Ta apka powstała, bo chciałem mieć coś prostego, działającego offline i nie szpiegującego mnie.",
      },
      {
        type: "paragraph",
        text: "Żadnych kont, żadnego wysyłania danych – wszystko zostaje na Twoim telefonie.",
      },
      {
        type: "paragraph",
        text: "Tworzona w 100% przeze mnie, dla Ciebie. Offline, prywatna, bez zbędnych fajerwerków. Po prostu działa. I tyle. 🚀",
      },
    ],
  },
  {
    title: "Przypinanie kursu",
    subtitle: "Jak przypiąć kurs",
    blocks: [
      {
        type: "paragraph",
        text: "Ekran przypinania to Twój osobisty selektor – coś jak Spotify, tylko dla nauki.",
      },
      {
        type: "heading",
        icon: "📌",
        text: "Co tu robisz?",
        tone: "pink",
      },
      {
        type: "list",
        items: [
          "Przeglądasz wszystkie kursy i wybierasz te, które Cię teraz interesują",
          "Masz kilka tematów na raz? Przypnij je i miej pod ręką",
          "Przypięte kursy lądują na kolejnym ekranie – tym do aktywacji",
        ],
        tone: "pink",
      },
      {
        type: "callout",
        text: "Nie przesadzaj z liczbą przypiętych kursów – im mniej, tym łatwiej się skupić. Możesz je zmienić w każdej chwili.",
        tone: "pink",
      },
    ],
  },
  {
    title: "Aktywacja kursu",
    subtitle: "Jak aktywować kurs",
    blocks: [
      {
        type: "paragraph",
        text: "Tutaj widzisz kursy, które przypiąłeś/przypiełaś na poprzednim ekranie. To Twoja robocza lista.",
      },
      { type: "heading", icon: "✅", text: "Jak to działa?", tone: "green" },
      {
        type: "list",
        items: [
          "Kliknij na kurs, żeby go aktywować",
          "Aktywny kurs = jego fiszki pojawią się w grze",
          "Możesz mieć aktywny tylko jeden kurs naraz",
        ],
        tone: "green",
      },
      { type: "heading", icon: "⚙️", text: "Co jeszcze?", tone: "pink" },
      {
        type: "paragraph",
        text: "Tapping w ikonkę obok kursu otwiera ustawienia – tam wyłączysz odwracanie fiszek, zmienisz tolerancję literówek i inne szczegóły.",
      },
      {
        type: "callout",
        text: "Szybki start: aktywuj kurs → wejdź w grę → zacznij naukę. Proste jak drut! 💪",
        tone: "green",
      },
    ],
  },
  {
    title: "Ustawienia",
    subtitle: "Dostosuj pod siebie",
    blocks: [
      {
        type: "paragraph",
        text: "Apka daje Ci dwa rodzaje ustawień – dla kursów i dla całej aplikacji.",
      },
      { type: "heading", icon: "⚙️", text: "Ustawienia kursu", tone: "green" },
      {
        type: "list",
        items: [
          "Odwracanie fiszek – możesz wyłączyć, jeśli np. uczysz się flag",
          "Tolerancja literówek – jak bardzo apka ma wybaczać błędy",
          "Czułość na wielkość liter – wielka czy mała? Twój wybór",
          "Inne detale, które sprawiają, że nauka działa tak, jak chcesz",
        ],
        tone: "green",
      },
      {
        type: "heading",
        icon: "🎨",
        text: "Ustawienia aplikacji",
        tone: "pink",
      },
      {
        type: "list",
        items: [
          "Motyw (ciemny/jasny)",
          "Język interfejsu",
          "Dźwięki i wibracje",
          "Opcje globalne dla całej apki",
        ],
        tone: "pink",
      },
      {
        type: "callout",
        text: "Pobaw się ustawieniami – każdy ma inny styl nauki. Znajdź swój! 🎯",
        tone: "green",
      },
    ],
  },
  {
    title: "Fiszki",
    subtitle: "Jak działa gra?",
    blocks: [
      {
        type: "paragraph",
        text: "To serce aplikacji. Tutaj uczysz się na fiszkach w sposób sprytny i efektywny.",
      },
      { type: "heading", icon: "📦", text: "System 5 pudełek", tone: "pink" },
      {
        type: "paragraph",
        text: "Każde nowe słówko zaczyna w Pudełku 1. Za każdą poprawną odpowiedź wędruje do kolejnego pudełka aż do Pudełka 5 – tam znika z nauki jako opanowane.",
      },
      {
        type: "heading",
        icon: "❌",
        text: "Co przy błędzie?",
        tone: "pink",
      },
      {
        type: "paragraph",
        text: "Pomyłka? Fiszka wraca do Pudełka 1. To nie kara – dzięki temu powtórzysz trudniejsze rzeczy częściej.",
      },
      { type: "heading", icon: "🎮", text: "Jak grać?", tone: "green" },
      {
        type: "list",
        items: [
          "Widzisz fiszkę → wpisujesz odpowiedź → sprawdzasz",
          "Prawidłowa? Idziesz dalej",
          "Błędna? Wracasz do początku tej fiszki",
          "Apka pokazuje najpierw fiszki z niższych pudełek (trudniejsze)",
        ],
        tone: "green",
      },
      {
        type: "callout",
        text: "Powtarzasz to, czego nie umiesz, a nie tracisz czasu na to, co już znasz. Nauka na skróty, no offense. 😎",
        tone: "pink",
      },
    ],
  },
  {
    title: "Tworzenie kursu",
    subtitle: "Jak stworzyć własny kurs",
    blocks: [
      {
        type: "paragraph",
        text: "Chcesz stworzyć własny kurs? Super pomysł! Tutaj dowiesz się jak.",
      },
      { type: "heading", icon: "📝", text: "Tworzenie od zera", tone: "green" },
      {
        type: "list",
        items: [
          "Dodawaj fiszki ręcznie – wprowadzasz po kolei przód i tył fiszki",
          "Importuj z pliku CSV – przygotuj plik w odpowiednim formacie",
        ],
        tone: "green",
      },
      { type: "heading", icon: "📊", text: "Typy fiszek", tone: "green" },
      {
        type: "list",
        items: [
          "Tradycyjne – przód / tył (np. słowo po polsku / słowo po koreańsku)",
          "Prawda / Fałsz – pytanie + odpowiedź tak/nie",
          "Z obrazkiem – grafika (np. flaga kraju → nazwa kraju)",
        ],
        tone: "green",
      },
      { type: "heading", icon: "📥", text: "Import z CSV", tone: "pink" },
      {
        type: "paragraph",
        text: "Format pliku zależy od typu fiszek. W kreatorze masz przykładowe szablony do pobrania – weź jeden, wypełnij i importuj.",
      },
      {
        type: "paragraph",
        text: "Kolumny zazwyczaj to: przód, tył (i opcjonalnie link do obrazka). Możesz też wyeksportować kurs do CSV, żeby zrobić backup albo podzielić się z kimś.",
      },
      {
        type: "callout",
        text: "Zacznij od małego kursu (20-30 fiszek), żeby ogarnąć jak działa. Potem możesz tworzyć większe. 📚",
        tone: "green",
      },
    ],
  },
  {
    title: "Powtórki",
    subtitle: "Jak robić powtórki",
    blocks: [
      {
        type: "callout",
        text: "Wkrótce. 🚧",
        tone: "pink",
      },
    ],
  },
];
