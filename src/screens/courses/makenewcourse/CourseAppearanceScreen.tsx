import MyButton from "@/src/components/button/button";
import { usePopup } from "@/src/contexts/PopupContext";
import { useCustomCourseDraft } from "@/src/hooks/useCustomCourseDraft";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TextStyle, View } from "react-native";
import { useCustomCourseFormStyles } from "../editcourse/components/courseContent/CustomCourseForm-styles";
import { CourseIconColorSelector } from "../editcourse/components/iconEdit/iconEdit";
import { CourseNameField } from "../editcourse/components/nameEdit/nameEdit";
import { useStyles } from "./CourseAppearanceScreen-styles";
export default function CustomCourseScreen() {
  const styles = useStyles();
  const formStyles = useCustomCourseFormStyles();
  const router = useRouter();
  const {
    courseName,
    setCourseName,
    iconId,
    setIconId,
    iconColor,
    colorId,
    reviewsEnabled,
    handleColorChange,
  } = useCustomCourseDraft();

  const setPopup = usePopup();

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
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>NOWY KURS</Text>

          <View style={formStyles.content}>
            <View>
              <CourseNameField
                value={courseName}
                onChange={setCourseName}
              />
            </View>

            <View style={formStyles.iconSection}>
              <Text style={formStyles.label}>ikona</Text>
              <CourseIconColorSelector
                selectedIcon={iconId}
                selectedColor={iconColor}
                selectedColorId={colorId ?? undefined}
                onIconChange={(value) => setIconId(value)}
                onColorChange={handleColorChange}
                styles={{
                  iconsContainer: formStyles.iconsContainer,
                  iconWrapper: formStyles.iconWrapper,
                  iconWrapperSelected: formStyles.iconWrapperSelected,
                  colorsContainer: formStyles.colorsContainer,
                  colorSwatch: formStyles.courseColor,
                  colorSwatchSelected: formStyles.courseColorSelected,
                }}
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
            accessibilityLabel="Przejdź do ustawień zawartości kursu"
          ></MyButton>
        </View>
      </View>
    </View>
  );
}
