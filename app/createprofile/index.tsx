import { View, Text, Image, Pressable } from "react-native";
import { useStyles } from "@/src/screens/profile/styles_profile";
import { useEffect, useState } from "react";
import { getLanguagePairs } from "@/src/components/db/db";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { usePopup } from "@/src/contexts/PopupContext";
import type { LanguagePair } from "@/src/components/db/db";
import type { LanguageProfile } from "@/src/types/profile";

import PL_FLAG_GRAY from "../../assets/flag/PLgray.png";
import ES_FLAG_GRAY from "../../assets/flag/ESgray.png";
import PM_FLAG_GRAY from "../../assets/flag/PMgray.png";
import US_FLAG_GRAY from "../../assets/flag/USgray.png";

import PL_FLAG from "../../assets/flag/PL.png";
import ES_FLAG from "../../assets/flag/ES.png";
import PM_FLAG from "../../assets/flag/PM.png";
import US_FLAG from "../../assets/flag/US.png";

export default function Profile() {
  const styles = useStyles();
  const { addProfile } = useSettings();
  const setPopup = usePopup();

  const flagMap: Record<string, number> = {
    pl: PL_FLAG,
    es: ES_FLAG,
    pm: PM_FLAG,
    en: US_FLAG,
  };

  const flagGrayMap: Record<string, number> = {
    pl: PL_FLAG_GRAY,
    es: ES_FLAG_GRAY,
    pm: PM_FLAG_GRAY,
    en: US_FLAG_GRAY,
  };

  const [availablePairs, setAvailablePairs] = useState<LanguagePair[]>([]);
  const [activeSource, setSource] = useState<string | null>(null);
  const [activeTarget, setTarget] = useState<string | null>(null);

  useEffect(() => {
    getLanguagePairs()
      .then((pairs) => {
        setAvailablePairs(pairs);
        console.log(pairs);
      })
      .catch((err) => console.error("Błąd pobierania par: ", err));
  }, []);

  const sourceLangs = Array.from(
    new Set(availablePairs.map((p) => p.source_code))
  );
  const targetLangs = Array.from(
    new Set(availablePairs.map((p) => p.target_code))
  );

  return (
    <View style={styles.container}>
      {/* Sekcja „Chcę się nauczyć” */}
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Znam:</Text>
        <View style={styles.grid}>
          {Object.keys(flagMap).map((code) => {
            const isAvailable = targetLangs.includes(code);
            const src = isAvailable ? flagMap[code] : flagGrayMap[code];

            return (
              <Pressable
                key={code}
                onPress={() => {
                  if (isAvailable) {
                    setTarget(code);
                  }
                }}
              >
                <Image
                  source={src}
                  style={[
                    styles.flag,
                    activeTarget === code && styles.flagActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sekcja „Znam” */}
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Chce sie nauczyć:</Text>
        <View style={styles.grid}>
          {Object.keys(flagMap).map((code) => {
            const isAvailable = sourceLangs.includes(code);
            const src = isAvailable ? flagMap[code] : flagGrayMap[code];

            return (
              <Pressable
                key={code}
                onPress={() => {
                  if (isAvailable) {
                    setSource(code);
                  }
                }}
              >
                <Image
                  source={src}
                  style={[
                    styles.flag,
                    activeSource === code && styles.flagActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.buttoncontainer}>
        <MyButton
          text="Zatwierdź"
          color="my_green"
          onPress={async () => {
            const pair = availablePairs.find(
              (p) =>
                p.source_code === activeSource && p.target_code === activeTarget
            );
            if (pair) {
              await addProfile({
                sourceLang: pair.source_code,
                targetLang: pair.target_code,
                sourceLangId: pair.source_id, // NEW
                targetLangId: pair.target_id, // NEW
              } as LanguageProfile);
              setPopup({
                message: "Utworzono profil!",
                color: "my_green",
                duration: 3000,
              });
              setSource(null);
              setTarget(null);
            }
          }}
          disabled={false}
        />
      </View>
    </View>
  );
}
