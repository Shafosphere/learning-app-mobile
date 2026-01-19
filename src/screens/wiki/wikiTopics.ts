export type WikiTopic = {
  title: string;
  subtitle: string;
  content: string;
};

export const WIKI_TOPICS: WikiTopic[] = [
  {
    title: "Intro",
    subtitle: "O czym jest ta apka",
    content:
      "[NAZWA APLIKACJI] to prosta aplikacja do nauki na fiszkach, zbudowana jako alternatywa dla popularnej metody „zakryj / powtórz w głowie / powtórz w kółko”.\n" +
      "Zamiast tego dostajesz narzędzie, które pomaga uczyć się bardziej aktywnie i w sposób uporządkowany.\n\n" +
      "Jak działa nauka\n\n" +
      "Aplikacja opiera się na zmodyfikowanej wersji systemu Leitnera (pudełka na fiszki).\n" +
      "Idea jest prosta: fiszki, które sprawiają trudność, wracają częściej, a te opanowane — rzadziej.\n\n" +
      "Prywatność i offline\n\n" +
      "Aplikacja jest tworzona w 100% przeze mnie.\n" +
      "Działa w pełni offline.\n" +
      "Nie zbiera żadnych danych i nie wysyła nic na serwery.\n" +
      "Wszystko jest przechowywane lokalnie na Twoim urządzeniu.\n\n" +
      "Po co to wszystko\n\n" +
      "Celem jest ułatwić regularną naukę bez frustracji, żeby stało się to przyjemne.",
  },
  {
    title: "Przypinanie kursu",
    subtitle: "Jak przypiąć kurs",
    content: "Wkrótce.",
  },
  {
    title: "Aktywacja kursu",
    subtitle: "Jak aktywować kurs",
    content: "Wkrótce.",
  },
  {
    title: "Fiszki",
    subtitle: "Jak działają fiszki",
    content: "Wkrótce.",
  },
  {
    title: "Tworzenie kursu",
    subtitle: "Jak stworzyć własny kurs",
    content: "Wkrótce.",
  },
  {
    title: "Powtórki",
    subtitle: "Jak robić powtórki",
    content: "Wkrótce.",
  },
];
