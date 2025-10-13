import { ScrollView, TextStyle, View } from "react-native";
import MyButton from "@/src/components/button/button";
import { useStyles } from "./CustomProfileScreen-styles";
import { useRouter } from "expo-router";
import { CustomProfileForm } from "@/src/components/customProfile/form/CustomProfileForm";
import { useCustomProfileDraft } from "@/src/hooks/useCustomProfileDraft";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function CustomProfileScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    profileName,
    setProfileName,
    iconId,
    setIconId,
    iconColor,
    colorId,
    reviewsEnabled,
    toggleReviewsEnabled,
    handleColorChange,
  } = useCustomProfileDraft();

  const handleNavigateToContent = () => {
    const name = profileName.trim();
    if (!iconId || !name) {
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
    router.push({ pathname: "/custom_profile/content", params });
  };

  const nextDisabled = !profileName.trim() || !iconId;
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
        <CustomProfileForm
          title="NOWY PROFIL"
          profileName={profileName}
          onProfileNameChange={setProfileName}
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
        <MyButton
          color="my_yellow"
          onPress={handleGoBack}
          accessibilityLabel="Wróć do poprzedniego ekranu"
        >
          <Entypo name="arrow-long-left" size={50} color={actionIconColor} />
        </MyButton>
        <MyButton
          color="my_green"
          text="dalej"
          onPress={handleNavigateToContent}
          accessibilityLabel="Przejdź do ustawień zawartości profilu"
          disabled={nextDisabled}
        >
          {/* <Entypo
            name="arrow-long-right"
            size={50}
            color={actionIconColor}
            style={styles.manualAddIcon}
          /> */}
        </MyButton>
      </View>
    </View>
  );
}
