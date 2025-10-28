import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import CustomCourseEditor from "@/src/screens/courses/editcourse/CustomCourseEditor";
import { CourseSettingsSection } from "@/src/screens/courses/editcourse/components/SettingsCourse";
import { CourseNameField } from "@/src/screens/courses/editcourse/components/nameEdit/nameEdit";
import { useCourseEditStyles } from "@/src/screens/courses/editcourse/CourseEditScreen-styles";
import type { CEFRLevel } from "@/src/types/language";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

type CourseEditParams = {
  id?: string | string[];
  name?: string | string[];
  lockAppearance?: string | string[];
  sourceLang?: string | string[];
  targetLang?: string | string[];
  level?: string | string[];
};

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

function parseBooleanParam(value: string | string[] | undefined): boolean {
  const raw = getFirstParamValue(value);
  if (!raw) return false;
  const normalized = raw.toString().toLowerCase().trim();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseCourseId(value: string | string[] | undefined): number | null {
  const raw = getFirstParamValue(value);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type BuiltinProps = {
  courseName: string;
  sourceLang: string | null;
  targetLang: string | null;
  level: string | null;
};

export default function CourseEditScreen() {
  const params = useLocalSearchParams<CourseEditParams>();

  const courseId = parseCourseId(params.id);

  if (courseId != null) {
    const initialName = decodeParam(params.name);
    const lockAppearance = parseBooleanParam(params.lockAppearance);
    return (
      <CustomCourseEditor
        courseId={courseId}
        initialName={initialName}
        lockAppearance={lockAppearance}
      />
    );
  }

  const targetLang = decodeParam(params.targetLang);
  const sourceLang = decodeParam(params.sourceLang);
  const level = decodeParam(params.level);
  const courseName = decodeParam(params.name) || "Kurs językowy";

  if (!targetLang && !sourceLang) {
    return <MissingCourseFallback />;
  }

  return (
    <BuiltinCourseEditor
      courseName={courseName}
      sourceLang={sourceLang || null}
      targetLang={targetLang || null}
      level={level || null}
    />
  );
}

function BuiltinCourseEditor({
  courseName,
  sourceLang,
  targetLang,
  level,
}: BuiltinProps) {
  const styles = useCourseEditStyles();
  const router = useRouter();
  const {
    colors,
    getBuiltinCourseBoxZeroEnabled,
    setBuiltinCourseBoxZeroEnabled,
    getBuiltinCourseAutoflowEnabled,
    setBuiltinCourseAutoflowEnabled,
  } = useSettings();

  const normalizedSource = sourceLang ? sourceLang.toLowerCase() : null;
  const normalizedTarget = targetLang ? targetLang.toLowerCase() : null;
  const normalizedLevel = level ? (level.toUpperCase() as CEFRLevel) : null;

  const [boxZeroEnabled, setBoxZeroEnabled] = useState(() =>
    getBuiltinCourseBoxZeroEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [autoflowEnabled, setAutoflowEnabled] = useState(() =>
    getBuiltinCourseAutoflowEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [reviewsEnabled, setReviewsEnabled] = useState(true);

  const handleBoxZeroToggle = async (value: boolean) => {
    setBoxZeroEnabled(value);
    await setBuiltinCourseBoxZeroEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleAutoflowToggle = async (value: boolean) => {
    setAutoflowEnabled(value);
    await setBuiltinCourseAutoflowEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>USTAWIENIA KURSU</Text>
          {/* {languagePair ? (
            <Text
              style={styles.sectionDescription}
            >{`Para języków: ${languagePair}`}</Text>
          ) : null}
          {level ? (
            <Text style={styles.sectionDescription}>{`Poziom: ${level}`}</Text>
          ) : null} */}
          <CourseNameField
            value={courseName}
            onChange={() => {}}
            editable={false}
            disabled
          />
        </View>

        <View style={styles.sectionCard}>
          <CourseSettingsSection
            styles={styles}
            switchColors={{
              thumb: colors.background,
              trackFalse: colors.border,
              trackTrue: colors.my_green,
            }}
            boxZeroEnabled={boxZeroEnabled}
            onToggleBoxZero={handleBoxZeroToggle}
            autoflowEnabled={autoflowEnabled}
            onToggleAutoflow={handleAutoflowToggle}
            reviewsEnabled={reviewsEnabled}
            onToggleReviews={setReviewsEnabled}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            color="my_yellow"
            width={60}
            onPress={() => router.back()}
            accessibilityLabel="Wróć do panelu kursów"
          >
            <Ionicons name="arrow-back" size={28} color={colors.headline} />
          </MyButton>
        </View>
      </View>
    </View>
  );
}

function MissingCourseFallback() {
  const styles = useCourseEditStyles();
  const router = useRouter();
  return (
    <View
      style={[
        styles.container,
        { justifyContent: "center", alignItems: "center", padding: 24 },
      ]}
    >
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
        Nie znaleziono danych kursu.
      </Text>
      <MyButton
        text="wróć"
        color="my_yellow"
        width={120}
        onPress={() => router.back()}
      />
    </View>
  );
}
