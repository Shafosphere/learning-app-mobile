import { CourseFinishedPanel } from "@/src/components/flashcards/CourseFinishedPanel/CourseFinishedPanel";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import { useStyles } from "./CourseFinishedPanelPreviewScreen-styles";

export default function CourseFinishedPanelPreviewScreen() {
  const styles = useStyles();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.panelWrap}>
        <CourseFinishedPanel
          courseName="Angielski medyczny"
          customCourseFlagSource={getFlagSource("pl")}
          courseIconProps={resolveCourseIconProps("flag:en", "#0F172A")}
          cardsCountLabel="42"
          accuracyLabel="91%"
          learningTimeLabel="18 min"
          onBackToCourses={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}
