import MyButton from "@/src/components/button/button";
import { usePopup } from "@/src/contexts/PopupContext";
import { getCustomCourseNameCandidates } from "@/src/db/sqlite/db";
import { useCustomCourseDraft } from "@/src/hooks/useCustomCourseDraft";
import {
  findCourseNameConflict,
  type CourseNameCandidate,
} from "@/src/utils/customCourseNameConflicts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TextStyle, View } from "react-native";
import { CourseIconColorSelector } from "@/src/components/courseEditor/iconEdit/iconEdit";
import { useStyles } from "./CourseAppearanceScreen-styles";
export default function CustomCourseScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    courseName,
    setCourseName,
    iconId,
    setIconId,
    iconColor,
    setIconColor,
    colorId,
    setColorId,
    reviewsEnabled,
    handleColorChange,
  } = useCustomCourseDraft();
  const [existingCourses, setExistingCourses] = useState<CourseNameCandidate[]>([]);

  const setPopup = usePopup();
  useEffect(() => {
    let isMounted = true;
    void getCustomCourseNameCandidates()
      .then((rows) => {
        if (isMounted) {
          setExistingCourses(rows);
        }
      })
      .catch((error) => {
        console.error("Failed to load custom course names", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);
  const nameConflict = useMemo(
    () => findCourseNameConflict(courseName, existingCourses),
    [courseName, existingCourses],
  );
  const nameValidationMessage = useMemo(() => {
    if (nameConflict.kind === "duplicate" && nameConflict.matchedCourse) {
      return `Kurs o nazwie „${nameConflict.matchedCourse.name}” już istnieje.`;
    }
    if (nameConflict.kind === "similar" && nameConflict.matchedCourse) {
      return `Podobna nazwa już istnieje: „${nameConflict.matchedCourse.name}”.`;
    }
    return null;
  }, [nameConflict]);

  const handleNavigateToContent = () => {
    const name = courseName.trim();
    if (!name && !iconId) {
      setPopup({
        message: "Musisz podać nazwę kursu i wybrać ikonę",
        color: "angry",
        duration: 3000,
      });
      return;
    }
    if (!name) {
      setPopup({
        message: "Musisz podać nazwę kursu",
        color: "angry",
        duration: 3000,
      });
      return;
    }
    if (!iconId) {
      setPopup({
        message: "Musisz wybrać ikonę",
        color: "angry",
        duration: 3000,
      });
      return;
    }
    if (nameConflict.kind === "duplicate") {
      setPopup({
        message: "Ta nazwa kursu jest już zajęta.",
        color: "angry",
        duration: 3200,
      });
      return;
    }
    const params: Record<string, string> = {
      name,
      iconId,
      iconColor,
      reviewsEnabled: reviewsEnabled ? "1" : "0",
    };
    if (colorId) {
      params.colorId = colorId;
    }
    router.push({ pathname: "/custom_course/content", params });
  };

  // const nextDisabled = !courseName.trim() || !iconId;
  const actionIconColor =
    (styles.manualAddIcon as TextStyle)?.color ??
    (styles.cardActionIcon as TextStyle)?.color ??
    "black";

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>NOWY KURS</Text>

          <View style={styles.formContent}>
            <View>
              <CourseIconColorSelector
                courseName={courseName}
                onCourseNameChange={setCourseName}
                selectedIcon={iconId}
                selectedColor={iconColor}
                selectedColorId={colorId ?? undefined}
                onIconChange={(value) => setIconId(value)}
                onColorChange={handleColorChange}
                onColorHexChange={(hex) => {
                  setIconColor(hex);
                  setColorId(null);
                }}
                previewName={courseName}
                nameValidationState={nameConflict.kind}
                nameValidationMessage={nameValidationMessage}
                iconSectionDescription="Wybierz symbol, który łatwo rozpoznasz na liście kursów."
                colorSectionDescription="Kolor jest akcentem (avatar, przycisk, chipy)."
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonsRow}>
          <MyButton
            color="my_yellow"
            onPress={handleGoBack}
            disabled={false}
            width={60}
            accessibilityLabel="Wróć do panelu kursów"
          >
            <Ionicons name="arrow-back" size={28} color={actionIconColor} />
          </MyButton>

          <MyButton
            color="my_green"
            text="dalej"
            onPress={handleNavigateToContent}
            disabled={nameConflict.kind === "duplicate"}
            accessibilityLabel="Przejdź do ustawień zawartości kursu"
          ></MyButton>
        </View>
      </View>
    </View>
  );
}
