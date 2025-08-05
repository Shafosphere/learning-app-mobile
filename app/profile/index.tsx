import { View, Text, Image, Pressable } from "react-native";
import { useStyles } from "@/src/screens/profile/styles_profile";
import { useEffect, useState } from "react";
import { getLanguagePairs } from "@/src/components/db/db";
import MyButton from "@/src/components/button/button";

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

  const [availablePairs, setAvailablePairs] = useState<
    { id: number; source_code: string; target_code: string }[]
  >([]);
  const [activeSource, setSource] = useState<string | null>(null);
  const [activeTarget, setTarget] = useState<string | null>(null);

  useEffect(() => {
    getLanguagePairs()
      .then((pairs) => {
        setAvailablePairs(pairs);
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
      {/* Sekcja „Znam” */}
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Znam:</Text>
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
                <View
                  style={[
                    styles.flag,
                    activeSource === code && styles.flagActive,
                  ]}
                >
                  <Image
                    source={src}
                    style={{
                      width: styles.flag.width,
                      height: styles.flag.height,
                      resizeMode: "contain",
                    }}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sekcja „Chcę się nauczyć” */}
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Chce się nauczyć:</Text>
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
                <View
                  style={[
                    styles.flag,
                    activeTarget === code && styles.flagActive,
                  ]}
                >
                  <Image
                    source={src}
                    style={{
                      width: styles.flag.width,
                      height: styles.flag.height,
                      resizeMode: "contain",
                    }}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.buttoncontainer}>
        <MyButton
          text="Confirm"
          color="my_green"
          onPress={() => {
            console.log("Confirm button pressed");
          }}
          disabled={false}
        />
      </View>
    </View>
  );
}
