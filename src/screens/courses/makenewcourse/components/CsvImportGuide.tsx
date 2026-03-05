import MyButton from "@/src/components/button/button";
import { getCsvFieldLabel } from "@/src/screens/courses/makenewcourse/csvImport/schema";
import type { CsvTemplateKey } from "@/src/screens/courses/makenewcourse/csvImport/templates";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, Text, View } from "react-native";

interface CsvImportGuideProps {
  onPickCsvFile: () => void;
  onPickTxtFile: () => void;
  onDownloadTemplate: (templateKey: CsvTemplateKey) => void;
  downloadingTemplateKey?: CsvTemplateKey | null;
  selectedFileName: string | null;
  isAnalyzing?: boolean;
}

type GuideSectionKey = CsvTemplateKey;

type GuideField = {
  key: string;
  description: string;
  required: boolean;
  note?: string;
};

type GuideSection = {
  key: GuideSectionKey;
  title: string;
  summary: string;
  fields: GuideField[];
  tips?: string[];
};

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.headline,
  },
  cardSubtitle: {
    fontSize: 13,
    textTransform: "uppercase" as const,
    fontWeight: "800",
    color: colors.paragraph,
    letterSpacing: 0.4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.paragraph,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.paragraph,
  },
  actionsRow: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  sectionTitle: {
    marginTop: 2,
    fontSize: 13,
    textTransform: "uppercase" as const,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: colors.paragraph,
  },
  accordionCard: {
    backgroundColor: colors.secondBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden" as const,
  },
  accordionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accordionHeaderActive: {
    backgroundColor: colors.my_green + "14",
  },
  accordionIndexBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  accordionIndexText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.headline,
  },
  accordionHeaderContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.headline,
  },
  accordionSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.paragraph,
  },
  chevron: {
    color: colors.headline,
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  fieldCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 6,
  },
  fieldHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  fieldNameBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fieldNameText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: colors.headline,
  },
  requiredPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  requiredPillText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase" as const,
  },
  requiredPillRequired: {
    backgroundColor: colors.my_green + "1A",
    borderColor: colors.my_green,
  },
  requiredPillRequiredText: {
    color: colors.headline,
  },
  requiredPillOptional: {
    backgroundColor: colors.secondBackground,
    borderColor: colors.border,
  },
  requiredPillOptionalText: {
    color: colors.paragraph,
  },
  fieldDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.paragraph,
  },
  fieldNote: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.headline,
  },
  tipsBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.my_yellow,
    backgroundColor: colors.my_yellow + "1A",
    padding: 10,
    gap: 4,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase" as const,
    color: colors.headline,
  },
  tipsLine: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.paragraph,
  },
  fileInfo: {
    marginTop: 2,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.my_green,
    backgroundColor: colors.my_green + "1A",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  fileText: {
    flex: 1,
    fontSize: 14,
    color: colors.headline,
    fontWeight: "700",
  },
  templateButtonRow: {
    marginTop: 2,
    alignItems: "flex-end" as const,
  },
}));

type GuideAccordionSectionProps = {
  section: GuideSection;
  index: number;
  expanded: boolean;
  locale: "pl" | "en";
  downloadingTemplateKey?: CsvTemplateKey | null;
  onDownloadTemplate: (templateKey: CsvTemplateKey) => void;
  onPress: () => void;
  styles: ReturnType<typeof useStyles>;
};

function GuideAccordionSection({
  section,
  index,
  expanded,
  locale,
  onDownloadTemplate,
  downloadingTemplateKey,
  onPress,
  styles,
}: GuideAccordionSectionProps) {
  const { t } = useTranslation();
  const isDownloadingTemplate = downloadingTemplateKey === section.key;

  return (
    <View style={styles.accordionCard}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.accordionHeader,
          expanded && styles.accordionHeaderActive,
          pressed && { opacity: 0.86 },
        ]}
      >
        <View style={styles.accordionIndexBadge}>
          <Text style={styles.accordionIndexText}>{index + 1}</Text>
        </View>

        <View style={styles.accordionHeaderContent}>
          <Text style={styles.accordionTitle}>{section.title}</Text>
          <Text style={styles.accordionSummary}>{section.summary}</Text>
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          style={styles.chevron}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.accordionBody}>
          {section.fields.map((field) => (
            <View key={field.key} style={styles.fieldCard}>
              <View style={styles.fieldHeaderRow}>
                <View style={styles.fieldNameBadge}>
                  <Text style={styles.fieldNameText}>
                    {getCsvFieldLabel(field.key, locale)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.requiredPill,
                    field.required
                      ? styles.requiredPillRequired
                      : styles.requiredPillOptional,
                  ]}
                >
                  <Text
                    style={[
                      styles.requiredPillText,
                      field.required
                        ? styles.requiredPillRequiredText
                        : styles.requiredPillOptionalText,
                    ]}
                  >
                    {field.required
                      ? t("courseCreator.csvGuide.required")
                      : t("courseCreator.csvGuide.optional")}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldDescription}>{field.description}</Text>
              {field.note ? <Text style={styles.fieldNote}>{field.note}</Text> : null}
            </View>
          ))}

          {section.tips?.length ? (
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>{t("courseCreator.csvGuide.important")}</Text>
              {section.tips.map((tip) => (
                <Text key={tip} style={styles.tipsLine}>
                  • {tip}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.templateButtonRow}>
            <MyButton
              text={
                isDownloadingTemplate
                  ? t("courseCreator.csvGuide.downloading")
                  : t("courseCreator.csvGuide.downloadTemplate")
              }
              onPress={
                isDownloadingTemplate
                  ? undefined
                  : () => onDownloadTemplate(section.key)
              }
              disabled={isDownloadingTemplate}
              width={170}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function CsvImportGuide({
  onPickCsvFile,
  onPickTxtFile,
  onDownloadTemplate,
  downloadingTemplateKey = null,
  selectedFileName,
  isAnalyzing = false,
}: CsvImportGuideProps) {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const locale: "pl" | "en" = i18n.resolvedLanguage?.startsWith("en") ? "en" : "pl";
  const [expandedKey, setExpandedKey] = useState<GuideSectionKey>("self_assess");

  const guideSections: GuideSection[] = [
    {
      key: "self_assess",
      title: t("courseCreator.csvGuide.sections.selfAssess.title"),
      summary: t("courseCreator.csvGuide.sections.selfAssess.summary"),
      fields: [
        {
          key: "front_text",
          description: t("courseCreator.csvGuide.sections.selfAssess.fields.frontText.description"),
          required: true,
        },
        {
          key: "explanation",
          description: t("courseCreator.csvGuide.sections.selfAssess.fields.explanation.description"),
          required: false,
        },
      ],
    },
    {
      key: "traditional",
      title: t("courseCreator.csvGuide.sections.traditional.title"),
      summary: t("courseCreator.csvGuide.sections.traditional.summary"),
      fields: [
        {
          key: "front_text",
          description: t("courseCreator.csvGuide.sections.traditional.fields.frontText.description"),
          required: true,
        },
        {
          key: "back_text",
          description: t("courseCreator.csvGuide.sections.traditional.fields.backText.description"),
          required: true,
          note: t("courseCreator.csvGuide.sections.traditional.fields.backText.note"),
        },
        {
          key: "explanation",
          description: t("courseCreator.csvGuide.sections.traditional.fields.explanation.description"),
          required: false,
        },
        {
          key: "flip",
          description: t("courseCreator.csvGuide.sections.traditional.fields.flip.description"),
          required: false,
        },
      ],
    },
    {
      key: "true_false",
      title: t("courseCreator.csvGuide.sections.trueFalse.title"),
      summary: t("courseCreator.csvGuide.sections.trueFalse.summary"),
      fields: [
        {
          key: "front_text",
          description: t("courseCreator.csvGuide.sections.trueFalse.fields.frontText.description"),
          required: true,
        },
        {
          key: "tf_answer",
          description: t("courseCreator.csvGuide.sections.trueFalse.fields.tfAnswer.description"),
          required: true,
        },
        {
          key: "explanation",
          description: t("courseCreator.csvGuide.sections.trueFalse.fields.explanation.description"),
          required: false,
        },
      ],
    },
    {
      key: "mixed",
      title: t("courseCreator.csvGuide.sections.mixed.title"),
      summary: t("courseCreator.csvGuide.sections.mixed.summary"),
      fields: [
        {
          key: "type",
          description: t("courseCreator.csvGuide.sections.mixed.fields.type.description"),
          required: true,
          note: t("courseCreator.csvGuide.sections.mixed.fields.type.note"),
        },
      ],
      tips: [t("courseCreator.csvGuide.sections.mixed.tip")],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("courseCreator.csvGuide.importTitle")}</Text>
        <Text style={styles.listItem}>{t("courseCreator.csvGuide.step1")}</Text>
        <Text style={styles.listItem}>{t("courseCreator.csvGuide.step2")}</Text>
      </View>

      <View style={styles.actionsRow}>
        <MyButton
          text={t("courseCreator.csvGuide.pickCsv")}
          onPress={isAnalyzing ? undefined : onPickCsvFile}
          disabled={isAnalyzing}
          width={140}
        />
        <MyButton
          text={
            isAnalyzing
              ? t("courseCreator.csvGuide.analyzing")
              : t("courseCreator.csvGuide.pickTxt")
          }
          onPress={isAnalyzing ? undefined : onPickTxtFile}
          disabled={isAnalyzing}
          width={140}
        />
      </View>

      {selectedFileName ? (
        <View style={styles.fileInfo}>
          <Ionicons
            name="document-text"
            size={18}
            color={styles.fileText.color}
          />
          <Text style={styles.fileText}>{selectedFileName}</Text>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t("courseCreator.csvGuide.cardTypes")}</Text>
      {guideSections.map((section, index) => (
        <GuideAccordionSection
          key={section.key}
          section={section}
          index={index}
          expanded={expandedKey === section.key}
          locale={locale}
          onDownloadTemplate={onDownloadTemplate}
          downloadingTemplateKey={downloadingTemplateKey}
          onPress={() => setExpandedKey(section.key)}
          styles={styles}
        />
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("courseCreator.csvGuide.imagesTitle")}</Text>
        <Text style={styles.paragraph}>{t("courseCreator.csvGuide.imagesDescription")}</Text>
      </View>
    </View>
  );
}
