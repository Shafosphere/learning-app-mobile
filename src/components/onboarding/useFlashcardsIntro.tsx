import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { getOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import { View, StyleProp, ViewStyle } from "react-native";

type IntroMessage = {
  title: string;
  description: string;
};

type UseFlashcardsIntroOptions = {
  messages?: IntroMessage[];
  containerStyle?: StyleProp<ViewStyle>;
  storageKey?: string;
};

export function useFlashcardsIntro(options?: UseFlashcardsIntroOptions) {
  const [showIntro, setShowIntro] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const storageKey = options?.storageKey ?? "@flashcards_intro_seen_v1";
  const defaultOverlay: ViewStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 6,
    paddingHorizontal: 4,
    paddingTop: 8,
  };

  const introMessages = useMemo<IntroMessage[]>(
    () =>
      options?.messages ?? [
        {
          title: "To jest główna gra",
          description:
            "Inspirowana systemem Leitnera. Tutaj uczymy się słówek.",
        },
        {
          title: "Cel gry",
          description: "Celem gry jest przeniesienie słówka przez wszystkie pudełka.",
        },
        {
          title: "Dodaj słówka",
          description:
            "Klikając przycisk 'Dodaj słówka', dodajesz z aktualnego kursu 10 kolejnych fiszek do pudełka nr 1.",
        },
        {
          title: "Aktywuj pudełko",
          description:
            "Klikając pudełko, aktywujesz je i losujesz przy okazji nową fiszkę. Kliknij pudełko, w którym jest liczba 10.",
        },
        {
          title: "Podaj odpowiedź",
          description: "W karcie pojawia się wylosowana fiszka i miejsce na odpowiedź. Podaj ją.",
        },
        {
          title: "I co teraz?",
          description:
            "Jeżeli odpowiedziałeś dobrze, słówko przeskoczy do kolejnego pudełka. Jeżeli źle, słówko zawsze wróci do pudełka nr 1.",
        },
        {
          title: "Rób to sam",
          description:
            "Sam kontrolujesz, które pudełko jest aktywne, a także ile słówek jest w pudełkach.",
        },
        {
          title: "Równowaga",
          description:
            "Ważne jest, żeby dodawać nie za dużo, ale też nie za mało słówek. Jeżeli nie chcesz robić tego sam, uruchom tryb auto w ustawieniach danego kursu.",
        },
        {
          title: "Za trudne?",
          description:
            "Możesz zawsze włączyć pudełko nr 0 w ustawieniach kursu. To specjalne pudełko, które pozwala zapoznać się z fiszkami.",
        },
      ],
    [options?.messages]
  );

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const seen = await AsyncStorage.getItem(storageKey);
        if (!mounted) return;
        if (seen === "1") {
          return;
        }
        const cp = await getOnboardingCheckpoint();
        if (!mounted) return;
        if (cp === "done") {
          setShowIntro(true);
          setIntroStep(0);
        }
      } catch {
        // ignore
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const handleIntroClose = useCallback(() => {
    setIntroStep((prev) => {
      const next = prev + 1;
      if (next >= introMessages.length) {
        setShowIntro(false);
        void AsyncStorage.setItem(storageKey, "1");
        return prev;
      }
      return next;
    });
  }, [introMessages.length, storageKey]);

  const IntroOverlay = useCallback(() => {
    if (!showIntro || !introMessages[introStep]) return null;
    return (
      <View
        style={[defaultOverlay, options?.containerStyle]}
        pointerEvents="box-none"
      >
        <LogoMessage
          floating
          offset={{ top: 8, left: 8, right: 8 }}
          title={introMessages[introStep].title}
          description={introMessages[introStep].description}
          onClose={handleIntroClose}
          closeLabel="Następny komunikat"
        />
      </View>
    );
  }, [defaultOverlay, handleIntroClose, introMessages, introStep, options?.containerStyle, showIntro]);

  return { IntroOverlay, showIntro, introStep, setShowIntro, setIntroStep };
}

export default useFlashcardsIntro;
