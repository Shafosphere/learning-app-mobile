import Ionicons from "@expo/vector-icons/Ionicons";
import LegalDocumentScreen from "@/src/components/legal/LegalDocumentScreen";
import { IMAGE_ATTRIBUTION_COURSES } from "@/src/data/imageAttributions";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useStyles } from "./LicensesScreen-styles";

const normalize = (text: string) => text.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");

export default function LicensesScreen() {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const router = useRouter();
  const { colors } = useThemeSettings();
  const [query, setQuery] = useState("");
  const language = i18n.language.startsWith("pl") ? "pl" : "en";
  const courses = IMAGE_ATTRIBUTION_COURSES
    .filter(course => normalize(course.title[language]).includes(normalize(query.trim())))
    .sort((a, b) => a.title[language].localeCompare(b.title[language], language));

  return (
    <LegalDocumentScreen heroKey="legal.licenses" sectionKeys={["materials"]}>
      <View style={styles.directory}>
        <Text style={styles.title}>{t("legal.licenses.courses.title")}</Text>
        <Text style={styles.description}>{t("legal.licenses.courses.body")}</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.paragraph} />
          <TextInput style={styles.searchInput} value={query} onChangeText={setQuery}
            placeholder={t("legal.licenses.courses.search")} placeholderTextColor={colors.paragraph}
            accessibilityLabel={t("legal.licenses.courses.search")} autoCorrect={false} returnKeyType="search" />
          {query.length > 0 && <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel={t("legal.licenses.courses.clear")} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.paragraph} />
          </Pressable>}
        </View>
        <View style={styles.list}>
          {courses.map((course, index) => (
              <Pressable key={course.id} onPress={() => router.push(`/licenses/${course.id}`)} accessibilityRole="link" style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.rowPressed]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{course.title[language]}</Text>
                  <Text style={styles.rowMeta}>{t("legal.licenses.attributions.count", { count: course.attributions.length })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.headline} />
              </Pressable>
          ))}
          {courses.length === 0 && <Text style={styles.empty}>{t("legal.licenses.courses.empty")}</Text>}
        </View>
      </View>
    </LegalDocumentScreen>
  );
}
