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
      "Klikając pudełko, aktywujesz je i losujesz przy okazji nową fiszkę. Kliknji te gdzie sa słówka",
  },
  {
    title: "Podaj odpowiedź",
    description:
      "W karcie pojawia się wylosowana fiszka i miejsce na odpowiedź",
    gateId: "box_selected",
  },
  {
    title: "Wpisaleś źle",
    description:
      "Nie martw sie, teraz musis poprawić swoją odpwiedź nadpisując ten tekst :3",
    gateId: "first_wrong_answer",
  },
  {
    title: "Wpisaleś dobrze",
    description: "Brawo, fiszka teraz leci do kolejnego pudełka :3",
    gateId: "first_right_answer",
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
