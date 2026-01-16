import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import CustomCourseEditor from "@/src/screens/courses/editcourse/CustomCourseEditor";
import { CourseSettingsSection } from "@/src/screens/courses/editcourse/components/SettingsCourse";
import { CourseNameField } from "@/src/screens/courses/editcourse/components/nameEdit/nameEdit";
import { useCourseEditStyles } from "@/src/screens/courses/editcourse/CourseEditScreen-styles";
import type { CEFRLevel } from "@/src/types/language";
import type {
  FlashcardsCardSize,
  FlashcardsImageSize,
} from "@/src/contexts/SettingsContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeScopeId } from "@/src/hooks/useBoxesPersistenceSnapshot";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";

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
    courses,
    getBuiltinCourseBoxZeroEnabled,
    setBuiltinCourseBoxZeroEnabled,
    getBuiltinCourseAutoflowEnabled,
    setBuiltinCourseAutoflowEnabled,
    getBuiltinCourseSkipCorrectionEnabled,
    setBuiltinCourseSkipCorrectionEnabled,
    getBuiltinCourseCardSize,
    setBuiltinCourseCardSize,
    getBuiltinCourseImageSize,
    setBuiltinCourseImageSize,
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
  const [skipCorrectionEnabled, setSkipCorrectionEnabled] = useState(() =>
    getBuiltinCourseSkipCorrectionEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [cardSize, setCardSize] = useState<FlashcardsCardSize>(() =>
    getBuiltinCourseCardSize({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [imageSize, setImageSize] = useState<FlashcardsImageSize>(() =>
    getBuiltinCourseImageSize({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [resettingBoxes, setResettingBoxes] = useState(false);
  const [resettingReviews, setResettingReviews] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  const getMatchingCourse = () =>
    courses.find((course) => {
      const sameSource = normalizedSource
        ? course.sourceLang?.toLowerCase() === normalizedSource
        : true;
      const sameTarget = normalizedTarget
        ? course.targetLang?.toLowerCase() === normalizedTarget
        : true;
      const sameLevel =
        normalizedLevel != null ? course.level === normalizedLevel : true;
      return sameSource && sameTarget && sameLevel;
    });

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

  const handleSkipCorrectionToggle = async (value: boolean) => {
    setSkipCorrectionEnabled(value);
    await setBuiltinCourseSkipCorrectionEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleCardSizeChange = async (value: FlashcardsCardSize) => {
    setCardSize(value);
    await setBuiltinCourseCardSize(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleImageSizeChange = async (value: FlashcardsImageSize) => {
    setImageSize(value);
    await setBuiltinCourseImageSize(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const performResetBoxes = async () => {
    setResettingBoxes(true);
    const matchingCourse = getMatchingCourse();

    if (!matchingCourse?.sourceLangId || !matchingCourse?.targetLangId) {
      setResettingBoxes(false);
      Alert.alert(
        "Brak danych kursu",
        "Nie znaleziono identyfikatorów języków dla tego kursu."
      );
      return;
    }

    try {
      const scopeId = makeScopeId(
        matchingCourse.sourceLangId,
        matchingCourse.targetLangId,
        normalizedLevel ?? "A1"
      );
      const storageKey = `boxes:${scopeId}`;
      await AsyncStorage.removeItem(storageKey);
      Alert.alert(
        "Zresetowano pudełka",
        "Stan pudełek i użyte słówka tego kursu został wyczyszczony."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się zresetować pudełek.");
    } finally {
      setResettingBoxes(false);
    }
  };

  const handleResetBoxes = () => {
    Alert.alert(
      "Reset pudełek",
      "Czyści stan pudełek dla tego kursu i przenosi fiszki do puli nieznanych. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Resetuj", style: "destructive", onPress: performResetBoxes },
      ]
    );
  };

  const performResetReviews = async () => {
    setResettingReviews(true);
    Alert.alert(
      "Reset powtórek",
      "Powtórki dla kursów wbudowanych są wyłączone w nowym formacie."
    );
    setResettingReviews(false);
  };

  const handleResetReviews = () => {
    Alert.alert(
      "Reset powtórek",
      "Usuniesz zapisane powtórki dla tego kursu. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Resetuj", style: "destructive", onPress: performResetReviews },
      ]
    );
  };

  const performResetAll = async () => {
    setResettingAll(true);
    const matchingCourse = getMatchingCourse();

    if (!matchingCourse?.sourceLangId || !matchingCourse?.targetLangId) {
      setResettingAll(false);
      Alert.alert(
        "Brak danych kursu",
        "Nie znaleziono identyfikatorów języków dla tego kursu."
      );
      return;
    }

    try {
      const scopeId = makeScopeId(
        matchingCourse.sourceLangId,
        matchingCourse.targetLangId,
        normalizedLevel ?? "A1"
      );
      await AsyncStorage.removeItem(`boxes:${scopeId}`);
      Alert.alert(
        "Reset całkowity",
        "Wyczyszczono pudełka i przywrócono fiszki jako nieznane."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się wykonać pełnego resetu.");
    } finally {
      setResettingAll(false);
    }
  };

  const handleResetAll = () => {
    Alert.alert(
      "Reset całkowity",
      "Czyści pudełka, powtórki i przywraca wszystkie fiszki jako nieznane dla tego kursu. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Resetuj", style: "destructive", onPress: performResetAll },
      ]
    );
  };

  const matchingCourse = getMatchingCourse();
  const courseSlug = (matchingCourse as { slug?: string } | undefined)?.slug ?? null;
  const matchingManifest = OFFICIAL_PACKS.find(
    (pack) =>
      (courseSlug && pack.slug === courseSlug) || pack.name === courseName
  );
  const courseHasImages = Boolean(matchingManifest?.imageMap);
  const imageSizeEnabled = cardSize === "large" && courseHasImages;

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
            skipCorrectionEnabled={skipCorrectionEnabled}
            onToggleSkipCorrection={handleSkipCorrectionToggle}
            cardSize={cardSize}
            onSelectCardSize={handleCardSizeChange}
            showImageSizeOptions={courseHasImages}
            imageSize={imageSize}
            onSelectImageSize={handleImageSizeChange}
            imageSizeEnabled={imageSizeEnabled}
          />
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Reset pudełek</Text>
              <Text style={styles.toggleSubtitle}>
                Czyści stan pudełek i przywraca fiszki do puli nieznanych.
              </Text>
            </View>
            <MyButton
              text={resettingBoxes ? "Resetuję..." : "Reset pudełek"}
              color="my_red"
              onPress={handleResetBoxes}
              disabled={resettingBoxes}
              width={150}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Reset powtórek</Text>
              <Text style={styles.toggleSubtitle}>
                Usuwa zapisane powtórki dla tego kursu.
              </Text>
            </View>
            <MyButton
              text={resettingReviews ? "Resetuję..." : "Reset powtórek"}
              color="my_red"
              onPress={handleResetReviews}
              disabled={resettingReviews}
              width={150}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Reset całkowity</Text>
              <Text style={styles.toggleSubtitle}>
                Czyści pudełka, powtórki i przywraca wszystkie fiszki jako nieznane.
              </Text>
            </View>
            <MyButton
              text={resettingAll ? "Resetuję..." : "Reset całkowity"}
              color="my_red"
              onPress={handleResetAll}
              disabled={resettingAll}
              width={150}
            />
          </View>
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
