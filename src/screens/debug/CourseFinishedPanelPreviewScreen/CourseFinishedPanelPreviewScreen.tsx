import { CourseFinishedPanel } from "@/src/components/flashcards/CourseFinishedPanel/CourseFinishedPanel";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useStyles } from "./CourseFinishedPanelPreviewScreen-styles";

export default function CourseFinishedPanelPreviewScreen() {
  const styles = useStyles();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.panelWrap}>
        <CourseFinishedPanel
          courseName="Basic Spanish"
          customCourseFlagSource={getFlagSource("en")}
          courseIconProps={resolveCourseIconProps("flag:es", "#0F172A")}
          cardsCountLabel="42"
          accuracyLabel="91%"
          learningTimeLabel="18 min"
          onBackToCourses={() => router.back()}
        />
      </View>
    </View>
  );
}
