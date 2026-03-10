import MyButton from "@/src/components/button/button";
import { NOIRLAB_LICENSE_URL } from "@/src/constants/support";
import { useStyles } from "@/src/screens/legal/LegalScreen-styles";
import React, { useCallback } from "react";
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
  sourceCard?: {
    title: string;
    body: string;
    bullets?: string[];
    noteLabel?: string;
    note?: string;
    button: string;
  };
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
    const sourceCardButton = getOptionalText(t, `${sectionBaseKey}.sourceCard.button`);

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
      sourceCard: sourceCardButton
        ? {
            title: t(`${sectionBaseKey}.sourceCard.title`),
            body: t(`${sectionBaseKey}.sourceCard.body`),
            bullets: toBulletList(
              t(`${sectionBaseKey}.sourceCard.bullets`, {
                returnObjects: true,
                defaultValue: [],
              }),
            ),
            noteLabel: getOptionalText(
              t,
              `${sectionBaseKey}.sourceCard.noteLabel`,
            ),
            note: getOptionalText(t, `${sectionBaseKey}.sourceCard.note`),
            button: sourceCardButton,
          }
        : undefined,
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
  const sections = useLegalSections({
    baseKey: heroKey,
    sectionKeys,
    emphasizedSectionKeys,
  });

  const openNoirlabLicense = useCallback(async () => {
    try {
      await Linking.openURL(NOIRLAB_LICENSE_URL);
    } catch (error) {
      console.warn("[Legal] Failed to open NOIRLab license page", error);
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{t(`${heroKey}.hero.title`)}</Text>
        <Text style={styles.heroSubtitle}>{t(`${heroKey}.hero.subtitle`)}</Text>
        <View style={styles.updatedCard}>
          <Text style={styles.updatedLabel}>
            {t(`${heroKey}.hero.updatedLabel`)}
          </Text>
          <Text style={styles.updatedValue}>
            {t(`${heroKey}.hero.updatedValue`)}
          </Text>
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

          {section.sourceCard ? (
            <View style={styles.sourceCard}>
              <Text style={styles.sectionTitle}>{section.sourceCard.title}</Text>
              <Text style={styles.sectionBody}>{section.sourceCard.body}</Text>

              {section.sourceCard.bullets?.length ? (
                <View style={styles.bulletList}>
                  {section.sourceCard.bullets.map((bullet) => (
                    <View key={bullet} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {section.sourceCard.note ? (
                <View style={styles.inlineNote}>
                  {section.sourceCard.noteLabel ? (
                    <Text style={styles.inlineNoteLabel}>
                      {section.sourceCard.noteLabel}
                    </Text>
                  ) : null}
                  <Text style={styles.sectionBody}>{section.sourceCard.note}</Text>
                </View>
              ) : null}

              <View style={styles.buttonRow}>
                <MyButton
                  text={section.sourceCard.button}
                  onPress={openNoirlabLicense}
                  width={140}
                />
              </View>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
