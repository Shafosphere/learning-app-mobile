import MyButton from "@/src/components/button/button";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useStyles } from "@/src/components/legal/LegalScreen-styles";
import React from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type LegalSection = {
  key: string;
  title: string;
  body: string;
  bullets?: string[];
  noteLabel?: string;
  note?: string;
  emphasis?: boolean;
};

type LegalDocumentScreenProps = {
  heroKey: string;
  sectionKeys: string[];
  emphasizedSectionKeys?: string[];
};

function toBulletList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function getOptionalText(
  t: ReturnType<typeof useTranslation>["t"],
  key: string,
): string | undefined {
  const value = t(key, { defaultValue: "" });
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function useLegalSections({
  baseKey,
  sectionKeys,
  emphasizedSectionKeys,
}: {
  baseKey: string;
  sectionKeys: string[];
  emphasizedSectionKeys?: string[];
}): LegalSection[] {
  const { t } = useTranslation();
  const emphasized = new Set(emphasizedSectionKeys ?? []);

  return sectionKeys.map((sectionKey) => {
    const sectionBaseKey = `${baseKey}.sections.${sectionKey}`;

    return {
      key: sectionKey,
      title: t(`${sectionBaseKey}.title`),
      body: t(`${sectionBaseKey}.body`),
      bullets: toBulletList(
        t(`${sectionBaseKey}.bullets`, {
          returnObjects: true,
          defaultValue: [],
        }),
      ),
      noteLabel: getOptionalText(t, `${sectionBaseKey}.noteLabel`),
      note: getOptionalText(t, `${sectionBaseKey}.note`),
      emphasis: emphasized.has(sectionKey),
    };
  });
}

export default function LegalDocumentScreen({
  heroKey,
  sectionKeys,
  emphasizedSectionKeys,
}: LegalDocumentScreenProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { isTabletLayout, shortestSide } = useDeviceLayout();
  const useCenteredTabletLayout = isTabletLayout || shortestSide >= 560;
  const onlineUrl = getOptionalText(t, `${heroKey}.hero.onlineUrl`);
  const onlineButton = getOptionalText(t, `${heroKey}.hero.onlineButton`);
  const sections = useLegalSections({
    baseKey: heroKey,
    sectionKeys,
    emphasizedSectionKeys,
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={[
          styles.scrollView,
          useCenteredTabletLayout && styles.scrollViewTablet,
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{t(`${heroKey}.hero.title`)}</Text>
          <Text style={styles.heroSubtitle}>{t(`${heroKey}.hero.subtitle`)}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.updatedCard}>
              <Text style={styles.updatedLabel}>
                {t(`${heroKey}.hero.updatedLabel`)}
              </Text>
              <Text style={styles.updatedValue}>
                {t(`${heroKey}.hero.updatedValue`)}
              </Text>
            </View>
            {onlineUrl ? (
              <MyButton
                text={onlineButton ?? onlineUrl}
                color="my_yellow"
                width={116}
                textLines={1}
                accessibilityLabel={onlineButton ?? onlineUrl}
                style={styles.onlineButton}
                onPress={() => {
                  void Linking.openURL(onlineUrl);
                }}
                textStyle={styles.onlineButtonText}
              />
            ) : null}
          </View>
        </View>

        {sections.map((section) => (
          <View
            key={section.key}
            style={[
              styles.sectionCard,
              section.emphasis ? styles.sectionCardEmphasis : null,
            ]}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>

            {section.bullets?.length ? (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet) => (
                  <View key={bullet} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {section.note ? (
              <View style={styles.inlineNote}>
                {section.noteLabel ? (
                  <Text style={styles.inlineNoteLabel}>{section.noteLabel}</Text>
                ) : null}
                <Text style={styles.sectionBody}>{section.note}</Text>
              </View>
            ) : null}

          </View>
        ))}
      </ScrollView>
    </View>
  );
}
