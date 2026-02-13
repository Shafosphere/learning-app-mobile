import MyButton from "@/src/components/button/button";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";

interface CsvImportGuideProps {
  onPickFile: () => void;
  selectedFileName: string | null;
  isAnalyzing?: boolean;
}

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    gap: 14,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase" as const,
    color: colors.headline,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.paragraph,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.paragraph,
  },
  columnsGrid: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden" as const,
    marginTop: 2,
  },
  columnsRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.secondBackground,
  },
  columnsCell: {
    flex: 1,
    minWidth: 74,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    fontSize: 11,
    color: colors.paragraph,
  },
  columnsCellHeader: {
    color: colors.headline,
    fontWeight: "800",
    fontSize: 11,
  },
  columnsCellLast: {
    borderRightWidth: 0,
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  legendCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  legendCardBlue: {
    backgroundColor: colors.my_green + "12",
    borderColor: colors.my_green,
  },
  legendCardYellow: {
    backgroundColor: colors.my_yellow + "20",
    borderColor: colors.my_yellow,
  },
  legendCardPlain: {
    backgroundColor: colors.secondBackground,
    borderColor: colors.border,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.headline,
  },
  legendLine: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.paragraph,
  },
  actionsRow: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
    gap: 10,
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
    fontSize: 13,
    color: colors.headline,
    fontWeight: "700",
  },
  warningBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.my_yellow + "1A",
    borderWidth: 1,
    borderColor: colors.my_yellow,
    gap: 6,
  },
  legendLabel: {
    color: colors.headline,
    fontWeight: "800",
  },
}));

const exampleMixedRows = [
  "type,front_text,back_text,tf_answer,explanation,flip,front_image",
  "traditional,Austria,Wieden,,,,",
  "true_false,Ziemia jest plaska,,false,Ziemia nie jest plaska,,",
  "self_assess,Wzor na pole kola,,,Pi razy r do kwadratu,,",
  ",,Pies na obrazku,,, ,dog.png",
];

const traditionalRows = [
  ["front_text", "Przod fiszki: pytanie / haslo / stwierdzenie", "Tak"],
  ["back_text", "Tyl fiszki: poprawna odpowiedz tekstowa", "Tak"],
  ["front_image", "Obrazek na fiszce", "Nie"],
  ["flip", "Czy odwracac karte", "Nie"],
];

const trueFalseRows = [
  ["front_text", "Tresc pytania lub zdania", "Tak (lub obrazek)"],
  ["tf_answer", "Poprawna odpowiedz: true lub false", "Tak"],
  ["explanation", "Wyjasnienie po odpowiedzi", "Nie"],
  ["front_image", "Obrazek na fiszce", "Nie"],
  ["flip", "Czy odwracac karte", "Nie"],
];

const selfAssessRows = [
  ["front_text", "Pytanie / temat do samooceny", "Tak (lub obrazek)"],
  ["explanation", "Tresc, ktora pokazuje sie po ocenie", "Nie"],
  ["back_text", "Fallback, gdy explanation jest puste", "Nie"],
  ["front_image", "Obrazek na fiszce", "Nie"],
];

const mixedRows = [
  ["type", "Podajesz typ dla kazdego wiersza osobno", "Tak (gdy mix typow)"],
  ["front_text", "Tekst z przodu karty", "Tak (lub obrazek)"],
  ["back_text", "Odpowiedz tekstowa dla traditional", "Zalezy od typu"],
  ["tf_answer", "Odpowiedz dla true_false", "Tylko dla true_false"],
  ["explanation", "Opis dla true_false/self_assess", "Nie"],
];

export function CsvImportGuide({
  onPickFile,
  selectedFileName,
  isAnalyzing = false,
}: CsvImportGuideProps) {
  const styles = useStyles();

  const renderColumnsTable = (rows: string[][]) => (
    <View style={styles.columnsGrid}>
      <View style={styles.columnsRow}>
        <Text style={[styles.columnsCell, styles.columnsCellHeader]}>Kolumna</Text>
        <Text style={[styles.columnsCell, styles.columnsCellHeader]}>Co to jest</Text>
        <Text style={[styles.columnsCell, styles.columnsCellHeader, styles.columnsCellLast]}>
          Czy potrzebne
        </Text>
      </View>
      {rows.map((row, index) => (
        <View key={`${row[0]}-${index}`} style={styles.columnsRow}>
          <Text style={[styles.columnsCell, styles.code]}>{row[0]}</Text>
          <Text style={styles.columnsCell}>{row[1]}</Text>
          <Text style={[styles.columnsCell, styles.columnsCellLast]}>{row[2]}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Szybki start</Text>
        <Text style={styles.listItem}>1. Przygotuj CSV (albo ZIP z CSV i folderem images/).</Text>
        <Text style={styles.listItem}>2. Wybierz plik i zobacz raport.</Text>
        <Text style={styles.listItem}>3. Kliknij import poprawnych wierszy.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1) Traditional</Text>
        {renderColumnsTable(traditionalRows)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2) True_False</Text>
        {renderColumnsTable(trueFalseRows)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>3) Self_Assess</Text>
        {renderColumnsTable(selfAssessRows)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>4) Mieszane</Text>
        {renderColumnsTable(mixedRows)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Legenda (prosto)</Text>

        <View style={[styles.legendCard, styles.legendCardBlue]}>
          <Text style={styles.legendTitle}>type</Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Co to jest: </Text>rodzaj karty.
          </Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Wazne: </Text>
            `type` jest opcjonalne i najczesciej przydaje sie, gdy w jednym pliku masz wiecej niz jeden rodzaj fiszek.
          </Text>
          <Text style={styles.legendLine}>- traditional = zwykla karta: pytanie + odpowiedz</Text>
          <Text style={styles.legendLine}>- true_false = karta Prawda/Falsz</Text>
          <Text style={styles.legendLine}>- self_assess = karta umiem / nie umiem</Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Jak puste: </Text>aplikacja sama zgadnie typ po danych.
          </Text>
        </View>

        <View style={[styles.legendCard, styles.legendCardPlain]}>
          <Text style={styles.legendTitle}>front_text i obrazek</Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Co to jest: </Text>przod karty (tekst lub obraz).
          </Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Wazne: </Text>karta przejdzie, gdy ma tekst LUB obrazek.
          </Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Jak oba puste: </Text>wiersz bedzie pominiety.
          </Text>
        </View>

        <View style={[styles.legendCard, styles.legendCardPlain]}>
          <Text style={styles.legendTitle}>tf_answer</Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Co to jest: </Text>poprawna odpowiedz dla true_false.
          </Text>
          <Text style={styles.legendLine}>Wpisz np. true/false lub 1/0.</Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Jak puste przy true_false: </Text>wiersz bedzie bledem.
          </Text>
        </View>

        <View style={[styles.legendCard, styles.legendCardPlain]}>
          <Text style={styles.legendTitle}>flip</Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Co to jest: </Text>czy karta ma byc odwracana.
          </Text>
          <Text style={styles.legendLine}>Wpisz true, jesli chcesz odwrotny kierunek.</Text>
          <Text style={styles.legendLine}>
            <Text style={styles.legendLabel}>Jak puste: </Text>domyslnie nie odwraca.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Przyklad mixed CSV</Text>
        {exampleMixedRows.map((line) => (
          <Text key={line} style={[styles.paragraph, styles.code]}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.cardTitle}>Jesli sie pomylisz, aplikacja zrobi...</Text>
        <Text style={styles.listItem}>- Pokaze blad i numer wiersza.</Text>
        <Text style={styles.listItem}>- Pominie tylko zle wiersze, dobre zaimportuje.</Text>
        <Text style={styles.listItem}>- Przy brakujacym obrazku da ostrzezenie.</Text>
      </View>

      <View style={styles.actionsRow}>
        <MyButton
          text={isAnalyzing ? "Analizuje..." : "Wybierz plik"}
          onPress={isAnalyzing ? undefined : onPickFile}
          disabled={isAnalyzing}
          width={150}
        />
      </View>

      {selectedFileName ? (
        <View style={styles.fileInfo}>
          <Ionicons name="document-text" size={18} color={styles.fileText.color} />
          <Text style={styles.fileText}>{selectedFileName}</Text>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        </View>
      ) : null}
    </View>
  );
}
