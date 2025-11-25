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
          description: "Tutaj codziennie uczysz się słówek w swoim tempie.",
        },
        {
          title: "Jak działa powtarzanie",
          description:
            "Słówka trafiają do pierwszego pudełka. Poprawna odpowiedź przenosi kartę do kolejnego pudełka aż do ostatniego.",
        },
        {
          title: "Gdy popełnisz błąd",
          description:
            "Zła odpowiedź cofa słówko do pudełka nr 1, żeby wzmocnić pamięć. Spróbuj ponownie!",
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
