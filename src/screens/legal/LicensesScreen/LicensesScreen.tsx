import LegalDocumentScreen from "@/src/components/legal/LegalDocumentScreen";
import MyButton from "@/src/components/button/button";
import { useStyles } from "@/src/components/legal/LegalScreen-styles";
import { IMAGE_ATTRIBUTION_COURSES } from "@/src/data/imageAttributions";
import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export default function LicensesScreen() {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const language = i18n.language.startsWith("pl") ? "pl" : "en";

  return (
    <LegalDocumentScreen
      heroKey="legal.licenses"
      sectionKeys={["materials"]}
    >
      {IMAGE_ATTRIBUTION_COURSES.map((course) => (
        <View key={course.id} style={styles.courseCard}>
          <Text style={styles.courseCardTitle}>{course.title[language]}</Text>
          <Text style={styles.courseCardBody}>{t("legal.licenses.courses.body")}</Text>
          <Link href={`/licenses/${course.id}`} asChild>
            <MyButton
              text={t("legal.licenses.courses.button")}
              autoWidth
              style={styles.courseCardButton}
            />
          </Link>
        </View>
      ))}
    </LegalDocumentScreen>
  );
}
