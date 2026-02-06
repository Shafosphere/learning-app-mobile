export type IntroMessage = {
  title: string;
  description: string;
  gateId?: string;
  autoAdvanceOnGate?: boolean;
};

export const COURSE_ACTIVATE_INTRO_MESSAGES: IntroMessage[] = [
  {
    title: "Aktywuj kurs",
    description:
      "Tutaj aktywujesz kurs, gry będą używać fiszek z aktywnego kursu.",
  },
  {
    title: "Ustawienia kursu",
    description:
      "Każdy kurs ma swoje ustawienia, które możesz zmieniać w kazdej chwili.",
  },
];

export const COURSE_PIN_INTRO_MESSAGES: IntroMessage[] = [
  {
    title: "Cześć, jestem X",
    description: "Oprowadzę Cię po aplikacji. Zacznijmy od wybrania kursów",
  },
  {
    title: "Przypnij kilka kursów",
    description:
      "Możesz przypiąć więcej niż jeden kurs naraz. Po prostu zaznacz te, które cie interesują.",
  },
  {
    title: "Po przypięciu kliknij Dalej",
    description:
      "Przycisk u dołu włączy się, gdy przypniesz co najmniej jeden kurs.",
    gateId: "course_pinned",
    autoAdvanceOnGate: true,
  },
  {
    title: "Własne kursy!",
    description:
      "Pożniej bedziesz mógł zrobić własne kursy z swoimi fiszkami! :3",
  },
];

export const FLASHCARDS_INTRO_MESSAGES: IntroMessage[] = [
  {
    title: "To jest główna gra",
    description: "Inspirowana systemem Leitnera. Tutaj uczymy się słówek.",
  },
  {
    title: "Cel gry",
    description: "Celem gry jest przeniesienie słówka przez wszystkie pudełka.",
  },
  {
    title: "Aktywuj pudełko",
    description:
      "Klikając pudełko, aktywujesz je i losujesz przy okazji nową fiszkę.",
  },
  {
    title: "Podaj odpowiedź",
    description:
      "W karcie pojawia się wylosowana fiszka, w zależności od jej typu masz podać odpowiedź lub kliknąć przycisk",
    gateId: "box_selected",
  },
  {
    title: "Za skomplikowane?",
    description:
      "Jeśli czegoś nie rozumiesz, zajrzyj do przewodnika na stronie głównej. Możesz tam przejść, klikając moją miniaturkę na górnym pasku.",
    gateId: "box_selected",
  },
];

export const BRAIN_INTRO_MESSAGES: IntroMessage[] = [
  {
    title: "Co to?",
    description: "Tutaj wybierasz metode powtórki.",
  },
  {
    title: "Wybierz tryb powtórek",
    description:
      "Przycisk 'start' to szybka sesja mini gier. Przycisk 'Tradycyjne' to klasyczne wpisywanie tłumaczeń.",
  },
  {
    title: "Po sesji",
    description:
      "Na końcu obu trybów zobaczysz tabelę z podsumowaniem wyników.",
  },
];
