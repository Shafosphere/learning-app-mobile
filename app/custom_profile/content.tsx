import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";
import { useStyles } from "@/src/screens/custom_profile/styles_custom_profile";
import { usePopup } from "@/src/contexts/PopupContext";

type AddMode = "csv" | "manual";

interface ManualCard {
  id: string;
  front: string;
  back: string;
}

const sampleFileName = "custom_profile_przyklad.csv";

const segmentOptions: { key: AddMode; label: string }[] = [
  { key: "csv", label: "Import z CSV" },
  { key: "manual", label: "Dodaj ręcznie" },
];

export default function CustomProfileContentScreen() {
  const styles = useStyles();
  const setPopup = usePopup();
  const router = useRouter();

  const [addMode, setAddMode] = useState<AddMode>("csv");
  const [manualCards, setManualCards] = useState<ManualCard[]>([
    { id: "card-0", front: "", back: "" },
  ]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const handleManualCardChange = (
    cardId: string,
    field: keyof Omit<ManualCard, "id">,
    value: string
  ) => {
    setManualCards((cards) =>
      cards.map((card) =>
        card.id === cardId ? { ...card, [field]: value } : card
      )
    );
  };

  const handleAddCard = () => {
    setManualCards((cards) => [
      ...cards,
      { id: `card-${Date.now()}`, front: "", back: "" },
    ]);
  };

  const handleRemoveCard = (cardId: string) => {
    setManualCards((cards) =>
      cards.length > 1 ? cards.filter((card) => card.id !== cardId) : cards
    );
  };

  const handleSelectCsv = () => {
    setCsvFileName("twoj_plik.csv");
    setPopup({
      message: "Wybieranie pliku dostępne w przyszłej wersji",
      color: "my_yellow",
      duration: 3000,
    });
  };

  const readSampleCsv = async () => {
    const asset = Asset.fromModule(require("@/assets/data/import.csv"));
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  };

  const handleDownloadSample = async () => {
    try {
      const sampleContent = await readSampleCsv();

      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted && permissions.directoryUri) {
          const targetFileUri =
            await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              sampleFileName,
              "text/csv"
            );

          await FileSystem.writeAsStringAsync(targetFileUri, sampleContent, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          setPopup({
            message: "Plik zapisany w wybranym katalogu",
            color: "my_green",
            duration: 3000,
          });
          return;
        }
      }

      const destination = `${FileSystem.documentDirectory}${sampleFileName}`;
      await FileSystem.writeAsStringAsync(destination, sampleContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      setPopup({
        message: "Plik zapisany w pamięci aplikacji",
        color: "my_green",
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to export sample CSV", error);
      setPopup({
        message: "Nie udało się zapisać pliku",
        color: "my_red",
        duration: 4000,
      });
    }
  };

  const handleCreateManually = () => {
    setAddMode("manual");
  };

  const handleSaveDraft = () => {
    setPopup({
      message: "Szkic zapisany (placeholder)",
      color: "my_green",
      duration: 3000,
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ZAWARTOSC</Text>
          <View style={styles.segmentedControl}>
            {segmentOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setAddMode(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: addMode === option.key }}
                style={({ pressed }) => [
                  styles.segmentOption,
                  addMode === option.key && styles.segmentOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.segmentOptionLabel,
                    addMode === option.key && styles.segmentOptionLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {addMode === "csv" ? (
            <View style={styles.modeContainer}>
              <Text style={styles.modeTitle}>Import z pliku CSV</Text>
              <Text style={styles.modeDescription}>
                Przygotuj plik CSV z kolumnami "przód" i "tył" oraz wypełnionymi
                danymi. Możesz również pobrać gotowy plik do wypełnienia (zalecam
                zrobić to na laptopie lub komputerze).
              </Text>
              <View style={styles.modeActions}>
                <MyButton
                  text="Importuj"
                  onPress={handleSelectCsv}
                  accessibilityLabel="Wybierz plik CSV z dysku"
                  width={125}
                />
                <MyButton
                  text="Pobierz"
                  color="my_yellow"
                  onPress={handleDownloadSample}
                  accessibilityLabel="Pobierz przykładowy plik CSV"
                  width={125}
                />
              </View>
              {csvFileName && (
                <Text style={styles.csvSelectedFile}>
                  Wybrany plik: {csvFileName}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.modeContainer}>
              <Text style={styles.modeTitle}>Stwórz tutaj</Text>
              <View style={styles.manualHeader}>
                <Text style={styles.manualHeaderCell}>przód</Text>
                <Text style={styles.manualHeaderCell}>tył</Text>
                <View style={styles.manualHeaderSpacer} />
              </View>
              <View style={styles.manualTable}>
                {manualCards.map((card, index) => {
                  const isSingleCard = manualCards.length === 1;
                  const isLast = index === manualCards.length - 1;
                  return (
                    <View
                      key={card.id}
                      style={[styles.manualRow, isLast && styles.manualRowLast]}
                    >
                      <View style={styles.manualCell}>
                        <TextInput
                          style={styles.manualInput}
                          multiline
                          value={card.front}
                          onChangeText={(value) =>
                            handleManualCardChange(card.id, "front", value)
                          }
                        />
                      </View>
                      <View style={styles.manualDivider} />
                      <View style={styles.manualCell}>
                        <TextInput
                          style={styles.manualInput}
                          multiline
                          value={card.back}
                          onChangeText={(value) =>
                            handleManualCardChange(card.id, "back", value)
                          }
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Usuń fiszkę"
                        accessibilityState={{ disabled: isSingleCard }}
                        style={[
                          styles.manualRemoveButton,
                          isSingleCard && styles.manualRemoveButtonDisabled,
                        ]}
                        disabled={isSingleCard}
                        onPress={() => handleRemoveCard(card.id)}
                      >
                        <Text style={styles.manualRemoveIcon}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dodaj nową fiszkę"
                style={styles.manualAddButton}
                onPress={handleAddCard}
              >
                <Text style={styles.manualAddIcon}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <MyButton
          text="←"
          color="my_yellow"
          onPress={handleGoBack}
          accessibilityLabel="Wróć do tworzenia profilu"
        />
        <MyButton
          text="Stwórz"
          color="my_green"
          onPress={handleSaveDraft}
          accessibilityLabel="Stwórz talię"
        />
      </View>
    </View>
  );
}
