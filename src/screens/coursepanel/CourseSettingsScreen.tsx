import { useEffect, useMemo, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import MyButton from "@/src/components/button/button";
import { CustomCourseForm } from "@/src/components/customCourse/form/CustomCourseForm";
import type { CourseColorOption } from "@/src/constants/customCourse";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { useCourseSettingsStyles } from "./CourseSettingsScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CEFRLevel } from "@/src/types/language";

function getFirstParamValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] ?? null : null;
  }
  return value ?? null;
}

function decodeParam(value: string | string[] | undefined): string {
  const first = getFirstParamValue(value);
  if (!first) {
    return "";
  }
  try {
    return decodeURIComponent(first);
  } catch {
    return first;
  }
}

export default function CourseSettingsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const styles = useCourseSettingsStyles();
  const {
    colors,
    getBuiltinCourseBoxZeroEnabled,
    setBuiltinCourseBoxZeroEnabled,
    getBuiltinCourseAutoflowEnabled,
    setBuiltinCourseAutoflowEnabled,
  } = useSettings();

  const courseName = useMemo(() => {
    const decoded = decodeParam(params.name);
    return decoded || "Kurs językowy";
  }, [params.name]);

  const sourceLang = useMemo(
    () => decodeParam(params.sourceLang),
    [params.sourceLang]
  );
  const targetLang = useMemo(
    () => decodeParam(params.targetLang),
    [params.targetLang]
  );
  const level = useMemo(() => decodeParam(params.level), [params.level]);

  const normalizedSourceLang = sourceLang
    ? sourceLang.toLowerCase()
    : null;
  const normalizedTargetLang = targetLang
    ? targetLang.toLowerCase()
    : null;
  const normalizedLevel = level
    ? (level.toUpperCase() as CEFRLevel)
    : null;

  const [boxZeroEnabled, setBoxZeroEnabled] = useState(() =>
    getBuiltinCourseBoxZeroEnabled({
      sourceLang: normalizedSourceLang,
      targetLang: normalizedTargetLang,
      level: normalizedLevel,
    })
  );

  const [autoflowEnabled, setAutoflowEnabled] = useState(() =>
    getBuiltinCourseAutoflowEnabled({
      sourceLang: normalizedSourceLang,
      targetLang: normalizedTargetLang,
      level: normalizedLevel,
    })
  );

  const [reviewsEnabled, setReviewsEnabled] = useState(true);

  useEffect(() => {
    setBoxZeroEnabled(
      getBuiltinCourseBoxZeroEnabled({
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang,
        level: normalizedLevel,
      })
    );
    setAutoflowEnabled(
      getBuiltinCourseAutoflowEnabled({
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang,
        level: normalizedLevel,
      })
    );
  }, [
    getBuiltinCourseBoxZeroEnabled,
    getBuiltinCourseAutoflowEnabled,
    normalizedSourceLang,
    normalizedTargetLang,
    normalizedLevel,
  ]);

  const handleToggleReviews = () => {
    setReviewsEnabled((prev) => !prev);
  };

  const handleCourseNameChange = (_: string) => {};
  const handleIconChange = (_: string) => {};
  const handleColorChange = (_: CourseColorOption) => {};

  const handleBoxZeroToggle = async (value: boolean) => {
    setBoxZeroEnabled(value);
    await setBuiltinCourseBoxZeroEnabled(
      {
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleAutoflowToggle = async (value: boolean) => {
    setAutoflowEnabled(value);
    await setBuiltinCourseAutoflowEnabled(
      {
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang,
        level: normalizedLevel,
      },
      value
    );
  };

  const languagePair = useMemo(() => {
    if (!sourceLang && !targetLang) {
      return "";
    }
    const from = sourceLang ? sourceLang.toUpperCase() : "???";
    const to = targetLang ? targetLang.toUpperCase() : "???";
    return `${from} → ${to}`;
  }, [sourceLang, targetLang]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <CustomCourseForm
          title="USTAWIENIA KURSU"
          courseName={courseName}
          onCourseNameChange={handleCourseNameChange}
          reviewsEnabled={reviewsEnabled}
          onToggleReviews={handleToggleReviews}
          iconId={null}
          iconColor={DEFAULT_COURSE_COLOR}
          colorId={null}
          onIconChange={handleIconChange}
          onColorChange={handleColorChange}
          nameEditable={false}
          hideIconSection
          hideReviewsToggle
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Faza zapoznania (Box 0)</Text>
              <Text style={styles.toggleSubtitle}>
                Zmieniaj niezależnie dla tego kursu.
              </Text>
            </View>
            <Switch
              value={boxZeroEnabled}
              onValueChange={handleBoxZeroToggle}
              trackColor={{
                false: colors.border,
                true: colors.my_green,
              }}
              thumbColor={colors.background}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Autoflow fiszek</Text>
              <Text style={styles.toggleSubtitle}>
                Automatycznie przełączaj pudełka i pobieraj nowe słowa.
              </Text>
            </View>
            <Switch
              value={autoflowEnabled}
              onValueChange={handleAutoflowToggle}
              trackColor={{
                false: colors.border,
                true: colors.my_green,
              }}
              thumbColor={colors.background}
            />
          </View>
          {languagePair ? (
            <Text style={styles.infoText}>{`Para języków: ${languagePair}`}</Text>
          ) : null}
          {level ? (
            <Text style={styles.infoText}>{`Poziom domyślny: ${level}`}</Text>
          ) : null}
          <Text style={styles.infoHint}>
            Wkrótce dodamy więcej ustawień personalizacji dla tego kursu.
          </Text>
        </CustomCourseForm>
      </ScrollView>
      <View style={styles.footer}>
        <MyButton
          text="wróć"
          color="my_yellow"
          onPress={() => router.back()}
          width={100}
          accessibilityLabel="Wróć do panelu kursów"
        />
      </View>
    </View>
  );
}
