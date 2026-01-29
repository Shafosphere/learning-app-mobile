import MyButton from "@/src/components/button/button";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";

export type CsvImportType = "text" | "image" | "true_false";

interface CsvImportGuideProps {
  onPickFile: () => void;
  selectedFileName: string | null;
  activeType: CsvImportType;
}

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    gap: 16,
  },
  contentContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  description: {
    fontSize: 14,
    color: colors.paragraph,
    marginBottom: 16,
    lineHeight: 20,
  },
  columnTable: {
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  columnRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.secondBackground,
  },
  columnHeader: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    fontWeight: "700",
    color: colors.headline,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  columnCell: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    color: colors.paragraph,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  lastCell: {
    borderRightWidth: 0,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  fileInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.my_green + "20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.my_green,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: colors.headline,
    fontWeight: "600",
  },
  tipBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.my_yellow + "20",
    borderRadius: 8,
    gap: 4,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    textTransform: "uppercase",
  },
  tipText: {
    fontSize: 12,
    color: colors.paragraph,
    lineHeight: 18,
  },
  optionalBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.secondBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  optionalTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    color: colors.headline,
    letterSpacing: 0.2,
  },
  optionalList: {
    gap: 8,
  },
  optionalItem: {
    gap: 2,
  },
  optionalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.headline,
  },
  optionalDescription: {
    fontSize: 12,
    color: colors.paragraph,
    lineHeight: 18,
  },
}));

type TemplateData = {
  label: string;
  description: string;
  requiredColumns: { id: string; label: string }[];
  sampleRow: string[];
  optionalFields?: { id: string; label: string; description: string }[];
  tip?: string;
};

const OPTIONAL_FIELDS_TEXT = [
  {
    id: "blokada / block",
    label: "blokada",
    description:
      'Wartość "tak" nie odwraca fiszki w pudełkach i w trybie poprawki wpisujesz tylko tekst z kolumny "tył".',
  },
  {
    id: "podpowiedz1 / podpowiedz2",
    label: "podpowiedz1 / podpowiedz2",
    description:
      "Tekst z tych kolumn pojawi sie nad kratą z fiszką, jeżeli to trudne słówo możesz napisać tam skojrzenie albo pierwszą litere.",
  },
];

const OPTIONAL_FIELDS_HINT_ONLY = [
  {
    id: "podpowiedz1 / podpowiedz2",
    label: "podpowiedz1 / podpowiedz2",
    description:
      "Tekst z tych kolumn pojawi sie nad kratą z fiszką, jeżeli to trudne słówo możesz napisać tam skojrzenie albo pierwszą litere.",
  },
];

const TEMPLATES: Record<CsvImportType, TemplateData> = {
  text: {
    label: "Tradycyjne",
    description: "Standardowe fiszki tekstowe z pytaniem i odpowiedzią. Multi odpowiedzi oddzielaj ; ",
    requiredColumns: [
      { id: "przod", label: "przód" },
      { id: "tyl", label: "tył" },
    ],
    sampleRow: ["Pies", "Dog; Puppy"],
    optionalFields: OPTIONAL_FIELDS_TEXT,
  },
  true_false: {
    label: "Prawda / Fałsz",
    description: "Fiszki, gdzie odpowiedzią jest Prawda lub Fałsz.",
    requiredColumns: [
      { id: "przod", label: "przód" },
      { id: "czy_prawda", label: "czy_prawda" },
    ],
    sampleRow: ["Ziemia jest płaska", "false"],
    optionalFields: OPTIONAL_FIELDS_HINT_ONLY,
  },
  image: {
    label: "Z obrazkami (ZIP)",
    description:
      "Tylko format ZIP. Musi zawierać plik 'data.csv' oraz folder 'images'.",
    requiredColumns: [
      { id: "obraz_przod", label: "obraz_przod (plik pytanie)" },
      { id: "tyl", label: "tył (tekst odpowiedzi)" },
    ],
    sampleRow: ["kot.jpg", "Cat"],
    tip: "Pliki obrazków umieść w folderze 'images' w archiwum ZIP. W CSV podaj tylko nazwę pliku, np. 'obrazek.jpg'. Pole 'tył' zawiera tekst odpowiedzi.",
    optionalFields: OPTIONAL_FIELDS_HINT_ONLY,
  },
};

export function CsvImportGuide({
  onPickFile,
  selectedFileName,
  activeType,
}: CsvImportGuideProps) {
  const styles = useStyles();
  const template = TEMPLATES[activeType];

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.description}>{template.description}</Text>

        {/* Visual Table Preview */}
        <View style={styles.columnTable}>
          <View style={styles.columnRow}>
            {template.requiredColumns.map((col, idx, arr) => (
              <Text
                key={col.id}
                style={[
                  styles.columnHeader,
                  idx === arr.length - 1 && styles.lastCell,
                ]}
              >
                {col.label}
              </Text>
            ))}
          </View>
          <View style={styles.columnRow}>
            {template.sampleRow.map((val, idx, arr) => (
              <Text
                key={idx}
                style={[
                  styles.columnCell,
                  idx === arr.length - 1 && styles.lastCell,
                ]}
              >
                {val}
              </Text>
            ))}
          </View>
        </View>

        {template.tip && (
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Wskazówka</Text>
            <Text style={styles.tipText}>{template.tip}</Text>
          </View>
        )}

        {template.optionalFields && template.optionalFields.length > 0 && (
          <View style={styles.optionalBox}>
            <Text style={styles.optionalTitle}>Kolumny opcjonalne</Text>
            <View style={styles.optionalList}>
              {template.optionalFields.map((field) => (
                <View key={field.id} style={styles.optionalItem}>
                  <Text style={styles.optionalLabel}>{field.label}</Text>
                  <Text style={styles.optionalDescription}>
                    {field.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <MyButton text="Wybierz plik" onPress={onPickFile} width={140} />
      </View>

      {selectedFileName && (
        <View style={styles.fileInfo}>
          <Ionicons
            name="document-text"
            size={20}
            color={styles.fileName?.color}
          />
          <Text style={styles.fileName}>{selectedFileName}</Text>
          <Ionicons name="checkmark-circle" size={20} color="green" />
        </View>
      )}
    </View>
  );
}
