import MyButton from "@/src/components/button/button";
import { CustomCourseForm } from "@/src/components/customCourse/form/CustomCourseForm";
import { usePopup } from "@/src/contexts/PopupContext";
import { useCustomCourseDraft } from "@/src/hooks/useCustomCourseDraft";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { ScrollView, TextStyle, View } from "react-native";
import { useStyles } from "./CustomCourseScreen-styles";
export default function CustomCourseScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    courseName,
    setCourseName,
    iconId,
    setIconId,
    iconColor,
    colorId,
    reviewsEnabled,
    toggleReviewsEnabled,
    handleColorChange,
  } = useCustomCourseDraft();

  const setPopup = usePopup();

  const handleNavigateToContent = () => {
    const name = courseName.trim();
    if (!name && !iconId) {
      setPopup({
        message: "Musisz podać nazwę kursu i wybrać ikonę",
        color: "my_red",
        duration: 3000,
      });
      return;
    }
    if (!name) {
      setPopup({
        message: "Musisz podać nazwę kursu",
        color: "my_red",
        duration: 3000,
      });
      return;
    }
    if (!iconId) {
      setPopup({
        message: "Musisz wybrać ikonę",
        color: "my_red",
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
        <CustomCourseForm
          title="NOWY KURS"
          courseName={courseName}
          onCourseNameChange={setCourseName}
          reviewsEnabled={reviewsEnabled}
          onToggleReviews={toggleReviewsEnabled}
          iconId={iconId}
          iconColor={iconColor}
          colorId={colorId}
          onIconChange={(value) => setIconId(value)}
          onColorChange={handleColorChange}
        />
      </ScrollView>

      <View style={styles.footer}>
        {/* <MyButton
          color="my_yellow"
          onPress={handleGoBack}
          accessibilityLabel="Wróć do poprzedniego ekranu"
        >
          <Entypo name="arrow-long-left" size={50} color={actionIconColor} />
        </MyButton> */}

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
            // disabled={nextDisabled}
          ></MyButton>
        </View>

        {/* <Entypo
            name="arrow-long-right"
            size={50}
            color={actionIconColor}
            style={styles.manualAddIcon}
          /> */}
        {/* </MyButton> */}
      </View>
    </View>
  );
}
