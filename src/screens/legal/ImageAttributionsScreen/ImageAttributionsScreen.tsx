import Ionicons from "@expo/vector-icons/Ionicons";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getImageAttributionCourse } from "@/src/data/imageAttributions";
import { useStyles } from "@/src/screens/legal/ImageAttributionsScreen/ImageAttributionsScreen-styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

function currentLanguage(language: string) {
  return language.startsWith("pl") ? "pl" : "en";
}

export default function ImageAttributionsScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string | string[] }>();
  const id = Array.isArray(courseId) ? courseId[0] : courseId;
  const course = getImageAttributionCourse(id ?? "");
  const { t, i18n } = useTranslation();
  const { colors } = useSettings();
  const styles = useStyles();
  const router = useRouter();
  const [linkError, setLinkError] = useState(false);
  const [expandedAttributionId, setExpandedAttributionId] = useState<string | null>(null);
  const language = currentLanguage(i18n.language);

  const openUrl = useCallback(async (url: string) => {
    setLinkError(false);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError(true);
    }
  }, []);

  const countLabel = useMemo(
    () => course ? t("legal.licenses.attributions.count", { count: course.attributions.length }) : "",
    [course, t],
  );

  const renderLinks = (attribution: NonNullable<typeof course>["attributions"][number]) => (
    <View style={styles.detailLinks}>
      <Pressable accessibilityRole="link" style={styles.textLink} onPress={() => void openUrl(attribution.sourceUrl)}>
        <Text style={styles.textLinkLabel}>{t("legal.licenses.attributions.sourceButton")}</Text>
        <Ionicons name="open-outline" size={16} color={colors.headline} />
      </Pressable>
      {attribution.licenseUrl ? (
        <Pressable accessibilityRole="link" style={styles.textLink} onPress={() => void openUrl(attribution.licenseUrl!)}>
          <Text style={styles.textLinkLabel}>{t("legal.licenses.attributions.licenseButton")}</Text>
          <Ionicons name="open-outline" size={16} color={colors.headline} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!course ? (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>{t("legal.licenses.attributions.notFoundTitle")}</Text>
            <Text style={styles.subtitle}>{t("legal.licenses.attributions.notFoundBody")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.pageHeader}>
              <Text style={styles.title}>{course.title[language]}</Text>
              <Text style={styles.subtitle}>{t("legal.licenses.attributions.intro")}</Text>
              <Text style={styles.count}>{countLabel}</Text>
              {linkError ? <Text style={styles.error}>{t("legal.licenses.attributions.linkError")}</Text> : null}
            </View>

            <View style={styles.compactTable}>
              <View style={styles.compactHeaderRow}>
                <Text style={[styles.compactHeaderCell, styles.compactBirdColumn]}>{t("legal.licenses.attributions.columns.bird")}</Text>
                <Text style={[styles.compactHeaderCell, styles.compactAuthorColumn]}>{t("legal.licenses.attributions.columns.author")}</Text>
                <Text style={[styles.compactHeaderCell, styles.compactLicenseColumn]}>{t("legal.licenses.attributions.columns.license")}</Text>
              </View>
              {course.attributions.map((attribution) => {
                const expanded = expandedAttributionId === attribution.id;
                return (
                  <View key={attribution.id} style={styles.compactEntry}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${attribution.commonName}, ${t("legal.licenses.attributions.showDetails")}`}
                      accessibilityState={{ expanded }}
                      style={styles.compactRow}
                      onPress={() => setExpandedAttributionId(expanded ? null : attribution.id)}
                    >
                      <View style={[styles.compactCell, styles.compactBirdColumn]}>
                        <Text style={styles.birdName}>{attribution.commonName}</Text>
                        <Text style={styles.scientificName}>{attribution.scientificName}</Text>
                      </View>
                      <Text style={[styles.compactCellText, styles.compactAuthorColumn]} numberOfLines={3}>{attribution.author}</Text>
                      <View style={[styles.compactCell, styles.compactLicenseColumn, styles.compactLicenseCell]}>
                        <Text style={styles.licenseText}>{attribution.license === "Public domain" ? t("legal.licenses.attributions.publicDomain") : attribution.license}</Text>
                        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.paragraph} />
                      </View>
                    </Pressable>
                    {expanded ? (
                      <View style={styles.compactDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{t("legal.licenses.attributions.columns.title")}</Text>
                          <Text style={styles.detailValue}>{attribution.title}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{t("legal.licenses.attributions.columns.changes")}</Text>
                          <Text style={styles.detailValue}>{attribution.changes[language]}</Text>
                        </View>
                        {renderLinks(attribution)}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <MyButton color="my_yellow" width={60} accessibilityLabel={t("app.actions.back")} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={colors.headline} />
          </MyButton>
        </View>
      </View>
    </View>
  );
}
