import MyButton from "@/src/components/button/button";
import type { CsvTemplateKey } from "@/src/screens/courses/makenewcourse/csvImport/templates";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

const GUIDE_SECTIONS: GuideSection[] = [
  {
    key: "self_assess",
    title: "3) Samoocena",
    summary: "Uzytkownik ocenia: umiem albo nie umiem.",
    fields: [
      {
        key: "front_text",
        description: "Pytanie lub temat do samooceny.",
        required: true,
      },
      {
        key: "explanation",
        description: "Tresc, ktora pokazuje sie po samoocenie.",
        required: false,
      },
    ],
  },
  {
    key: "traditional",
    title: "1) Odpowiedz otwarta",
    summary: "Klasyczna fiszka: pytanie z przodu, odpowiedz z tylu.",
    fields: [
      {
        key: "front_text",
        description: "Przod fiszki: pytanie, haslo albo stwierdzenie.",
        required: true,
      },
      {
        key: "back_text",
        description: "Tyl fiszki: poprawna odpowiedz tekstowa.",
        required: true,
        note: "Mozesz wpisac wiele odpowiedzi, oddzielajac je przecinkiem lub srednikiem.",
      },
      {
        key: "explanation",
        description: "Dodatkowe wyjasnienie pokazywane po odpowiedzi.",
        required: false,
      },
      {
        key: "flip",
        description: "Jesli true, karta bedzie odwracana przy nauce.",
        required: false,
      },
    ],
  },
  {
    key: "true_false",
    title: "2) Prawda/Falsz",
    summary: "Uzytkownik zaznacza, czy zdanie jest prawdziwe.",
    fields: [
      {
        key: "front_text",
        description: "Tresc pytania albo zdania do oceny.",
        required: true,
      },
      {
        key: "tf_answer",
        description: "Poprawna odpowiedz: true/false albo 1/0.",
        required: true,
      },
      {
        key: "explanation",
        description: "Wyjasnienie po odpowiedzi.",
        required: false,
      },
    ],
  },
  {
    key: "mixed",
    title: "4) Mieszane",
    summary: "W jednym pliku laczysz rozne typy fiszek.",
    fields: [
      {
        key: "type",
        description: "Typ fiszki dla kazdego wiersza.",
        required: true,
        note: "wartosci: traditional, true_false, self_assess.",
      },
    ],
    tips: [
      "Uklad kolumn pozostaje taki sam jak w sekcjach powyzej.",
    ],
  },
];

type GuideAccordionSectionProps = {
  section: GuideSection;
  index: number;
  expanded: boolean;
  downloadingTemplateKey?: CsvTemplateKey | null;
  onDownloadTemplate: (templateKey: CsvTemplateKey) => void;
  onPress: () => void;
  styles: ReturnType<typeof useStyles>;
};

function GuideAccordionSection({
  section,
  index,
  expanded,
  onDownloadTemplate,
  downloadingTemplateKey,
  onPress,
  styles,
}: GuideAccordionSectionProps) {
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
                  <Text style={styles.fieldNameText}>{field.key}</Text>
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
                    {field.required ? "Wymagane" : "Opcjonalne"}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldDescription}>{field.description}</Text>
              {field.note ? <Text style={styles.fieldNote}>{field.note}</Text> : null}
            </View>
          ))}

          {section.tips?.length ? (
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>Wazne</Text>
              {section.tips.map((tip) => (
                <Text key={tip} style={styles.tipsLine}>
                  • {tip}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.templateButtonRow}>
            <MyButton
              text={isDownloadingTemplate ? "Przygotowuje..." : "Pobierz wzor"}
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
  const styles = useStyles();
  const [expandedKey, setExpandedKey] = useState<GuideSectionKey>("self_assess");

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Import</Text>
        <Text style={styles.listItem}>
          1. Przygotuj plik CSV albo TXT z naglowkami kolumn.
        </Text>
        <Text style={styles.listItem}>2. Wybierz ponizej format pliku i importuj.</Text>
      </View>

      <View style={styles.actionsRow}>
        <MyButton
          text="Wybierz CSV"
          onPress={isAnalyzing ? undefined : onPickCsvFile}
          disabled={isAnalyzing}
          width={140}
        />
        <MyButton
          text={isAnalyzing ? "Analizuje..." : "Wybierz TXT"}
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

      <Text style={styles.sectionTitle}>Typy fiszek</Text>
      {GUIDE_SECTIONS.map((section, index) => (
        <GuideAccordionSection
          key={section.key}
          section={section}
          index={index}
          expanded={expandedKey === section.key}
          onDownloadTemplate={onDownloadTemplate}
          downloadingTemplateKey={downloadingTemplateKey}
          onPress={() => setExpandedKey(section.key)}
          styles={styles}
        />
      ))}

      <View style={styles.card}>

        <Text style={styles.cardTitle}>Jak dodawac obrazy</Text>
        <Text style={styles.paragraph}>
          Obok pliku CSV lub TXT z fiszkami utworz folder images. Dodaj do
          niego obrazy, a w wierszach pliku wpisuj nazwy plikow, np. dog.png.
          Obslugiwane formaty: .png, .jpg, .jpeg, .svg.
        </Text>
      </View>
    </View>
  );
}
