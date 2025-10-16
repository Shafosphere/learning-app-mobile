import { View, Text, Image, Pressable } from "react-native";
import { useStyles } from "./CreateCourseScreen-styles";
import { useEffect, useState } from "react";
import { getLanguagePairs } from "@/src/db/sqlite/db";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { usePopup } from "@/src/contexts/PopupContext";
import { useRouter } from "expo-router";
import type { LanguagePair } from "@/src/db/sqlite/db";
import type { LanguageCourse } from "@/src/types/course";
import {
  getFlagSource,
  supportedLanguageCodes,
} from "@/src/constants/languageFlags";

export default function CreateCourseScreen() {
  const styles = useStyles();
  const { addCourse } = useSettings();
  const setPopup = usePopup();
  const router = useRouter();

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
          {supportedLanguageCodes.map((code) => {
            const isAvailable = targetLangs.includes(code);
            const src = getFlagSource(code, isAvailable ? "active" : "inactive");

            if (!src) {
              return null;
            }

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
          {supportedLanguageCodes.map((code) => {
            const isAvailable = sourceLangs.includes(code);
            const src = getFlagSource(code, isAvailable ? "active" : "inactive");

            if (!src) {
              return null;
            }

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
        <View style={styles.buttonWrapper}>
          <MyButton
            text="Własny"
            color="my_yellow"
            onPress={() => router.push("/custom_course")}
            disabled={false}
            width={100}
          />
        </View>
        <MyButton
          text="stwórz"
          color="my_green"
          width={100}
          onPress={async () => {
            const pair = availablePairs.find(
              (p) =>
                p.source_code === activeSource && p.target_code === activeTarget
            );
            if (pair) {
              await addCourse({
                sourceLang: pair.source_code,
                targetLang: pair.target_code,
                sourceLangId: pair.source_id, // NEW
                targetLangId: pair.target_id, // NEW
              } as LanguageCourse);
              setPopup({
                message: "Utworzono kurs!",
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
