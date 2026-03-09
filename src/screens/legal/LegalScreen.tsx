import MyButton from "@/src/components/button/button";
import { NOIRLAB_LICENSE_URL, SUPPORT_EMAIL } from "@/src/constants/support";
import { useStyles } from "@/src/screens/legal/LegalScreen-styles";
import React, { useCallback } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type LegalSection = {
  key:
    | "privacy"
    | "localData"
    | "permissions"
    | "contact"
    | "noTracking"
    | "deletion"
    | "licenses";
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

function toBulletList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function useLegalSections(): LegalSection[] {
  const { t } = useTranslation();

  return [
    {
      key: "privacy",
      title: t("legal.sections.privacy.title"),
      body: t("legal.sections.privacy.body"),
    },
    {
      key: "localData",
      title: t("legal.sections.localData.title"),
      body: t("legal.sections.localData.body"),
      bullets: toBulletList(
        t("legal.sections.localData.bullets", {
          returnObjects: true,
        }),
      ),
      noteLabel: t("legal.sections.localData.noteLabel"),
      note: t("legal.sections.localData.note"),
    },
    {
      key: "permissions",
      title: t("legal.sections.permissions.title"),
      body: t("legal.sections.permissions.body"),
      bullets: toBulletList(
        t("legal.sections.permissions.bullets", {
          returnObjects: true,
        }),
      ),
    },
    {
      key: "contact",
      title: t("legal.sections.contact.title"),
      body: t("legal.sections.contact.body"),
      bullets: toBulletList(
        t("legal.sections.contact.bullets", {
          returnObjects: true,
        }),
      ),
      noteLabel: t("legal.sections.contact.noteLabel"),
      note: t("legal.sections.contact.note"),
      emphasis: true,
    },
    {
      key: "noTracking",
      title: t("legal.sections.noTracking.title"),
      body: t("legal.sections.noTracking.body"),
      bullets: toBulletList(
        t("legal.sections.noTracking.bullets", {
          returnObjects: true,
        }),
      ),
    },
    {
      key: "deletion",
      title: t("legal.sections.deletion.title"),
      body: t("legal.sections.deletion.body"),
      bullets: toBulletList(
        t("legal.sections.deletion.bullets", {
          returnObjects: true,
        }),
      ),
    },
    {
      key: "licenses",
      title: t("legal.sections.licenses.title"),
      body: t("legal.sections.licenses.body"),
      bullets: toBulletList(
        t("legal.sections.licenses.bullets", {
          returnObjects: true,
        }),
      ),
      sourceCard: {
        title: t("legal.sections.licenses.sourceCard.title"),
        body: t("legal.sections.licenses.sourceCard.body"),
        bullets: toBulletList(
          t("legal.sections.licenses.sourceCard.bullets", {
            returnObjects: true,
          }),
        ),
        noteLabel: t("legal.sections.licenses.sourceCard.noteLabel"),
        note: t("legal.sections.licenses.sourceCard.note"),
        button: t("legal.sections.licenses.sourceCard.button"),
      },
    },
  ];
}

export default function LegalScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const sections = useLegalSections();

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
        <Text style={styles.heroTitle}>{t("legal.hero.title")}</Text>
        <Text style={styles.heroSubtitle}>{t("legal.hero.subtitle")}</Text>
        <View style={styles.updatedCard}>
          <Text style={styles.updatedLabel}>{t("legal.hero.updatedLabel")}</Text>
          <Text style={styles.updatedValue}>{t("legal.hero.updatedValue")}</Text>
        </View>
      </View>

      {sections.map((section) => (
        <View
          key={section.title}
          style={[
            styles.sectionCard,
            section.emphasis ? styles.sectionCardEmphasis : null,
          ]}
        >
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>

          {section.key === "contact" ? (
            <View style={styles.emailChip}>
              <Text style={styles.emailChipText}>{SUPPORT_EMAIL}</Text>
            </View>
          ) : null}

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
