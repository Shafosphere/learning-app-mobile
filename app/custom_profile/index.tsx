import { useMemo, useState } from "react";
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
import { usePopup } from "@/src/contexts/PopupContext";
import { useStyles } from "@/src/screens/custom_profile/styles_custom_profile";
import { useSettings } from "@/src/contexts/SettingsContext";

interface ManualCard {
  id: string;
  front: string;
  back: string;
}

type AddMode = "csv" | "manual";

type IconOption = {
  id: string;
  label: string;
  color: string;
  borderColor: string;
};

export default function CustomProfileScreen() {
  const styles = useStyles();
  const { colors } = useSettings();
  const setPopup = usePopup();

  const [deckName, setDeckName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>("csv");
  const [manualCards, setManualCards] = useState<ManualCard[]>([
    { id: "card-0", front: "", back: "" },
  ]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const sampleFileName = "custom_profile_przyklad.csv";

  const iconOptions: IconOption[] = useMemo(
    () => [
      {
        id: "mint",
        label: "Miętowy",
        color: colors.my_green,
        borderColor: colors.my_green,
      },
      {
        id: "sunny",
        label: "Słoneczny",
        color: colors.my_yellow,
        borderColor: colors.my_yellow,
      },
      {
        id: "coral",
        label: "Koralowy",
        color: colors.my_red,
        borderColor: colors.my_red,
      },
      {
        id: "ocean",
        label: "Oceaniczny",
        color: colors.darkbg,
        borderColor: colors.darkbg,
      },
      {
        id: "cloud",
        label: "Chmura",
        color: colors.lightbg,
        borderColor: colors.border,
      },
    ],
    [colors]
  );

  const segmentOptions: { key: AddMode; label: string }[] = [
    { key: "csv", label: "Import z CSV" },
    { key: "manual", label: "Dodaj ręcznie" },
  ];

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
  };

  const handleSaveDraft = () => {
    setPopup({
      message: "Szkic zapisany (placeholder)",
      color: "my_green",
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
          const targetFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Nazwa talii</Text>
          <TextInput
            style={styles.input}
            placeholder="Wpisz nazwę"
            placeholderTextColor={colors.paragraph}
            value={deckName}
            onChangeText={setDeckName}
            accessibilityLabel="Nazwa talii"
          />

          <Text style={styles.sectionHeader}>Ikona</Text>
          <View style={styles.iconGrid}>
            {iconOptions.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedIcon === option.id }}
                accessibilityLabel={`Ikona ${option.label}`}
                onPress={() => setSelectedIcon(option.id)}
                style={({ pressed }) => [
                  styles.iconTile,
                  selectedIcon === option.id && styles.iconTileSelected,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View
                  style={[
                    styles.iconSquare,
                    {
                      backgroundColor: option.color,
                      borderColor: option.borderColor,
                    },
                  ]}
                />
                <Text style={styles.iconLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Tryb dodawania kart</Text>
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
        </View>

        {addMode === "csv" ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Import z pliku CSV</Text>
            <Text style={styles.csvInstruction}>
              Przygotuj plik CSV z kolumnami "front" i "back" oraz nagłówkiem.
              Upewnij się, że kodowanie to UTF-8, a separator to przecinek lub
              średnik.
            </Text>
            {csvFileName && (
              <Text style={styles.csvFileName}>
                Wybrany plik: {csvFileName}
              </Text>
            )}
            <View style={styles.csvButtons}>
              <MyButton
                text="Wybierz plik"
                color="my_yellow"
                onPress={handleSelectCsv}
                accessibilityLabel="Wybierz plik CSV"
              />
              <MyButton
                text="Pobierz przykład"
                color="my_green"
                onPress={handleDownloadSample}
                accessibilityLabel="Pobierz przykładowy plik CSV"
              />
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Dodaj ręcznie</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Awers</Text>
                <Text style={styles.headerCell}>Rewers</Text>
                <Text style={styles.headerCellSmall}>Usuń</Text>
              </View>
              <View style={styles.tableBody}>
                {manualCards.map((item, index) => (
                  <View key={item.id} style={styles.tableRow}>
                    <View style={styles.tableCell}>
                      <TextInput
                        style={styles.cellInput}
                        placeholder="Awers"
                        placeholderTextColor={colors.paragraph}
                        value={item.front}
                        onChangeText={(value) =>
                          handleManualCardChange(item.id, "front", value)
                        }
                        multiline
                        accessibilityLabel={`Awers karty ${index + 1}`}
                      />
                    </View>
                    <View style={styles.tableCell}>
                      <TextInput
                        style={styles.cellInput}
                        placeholder="Rewers"
                        placeholderTextColor={colors.paragraph}
                        value={item.back}
                        onChangeText={(value) =>
                          handleManualCardChange(item.id, "back", value)
                        }
                        multiline
                        accessibilityLabel={`Rewers karty ${index + 1}`}
                      />
                    </View>
                    <Pressable
                      onPress={() => handleRemoveCard(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Usuń kartę"
                      disabled={manualCards.length === 1}
                      style={({ pressed }) => [
                        styles.removeButton,
                        manualCards.length === 1 && styles.removeButtonDisabled,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addCardButton}>
                <MyButton
                  text="Dodaj kartę"
                  color="my_yellow"
                  onPress={handleAddCard}
                  accessibilityLabel="Dodaj nową kartę"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <MyButton
          text="Zapisz szkic"
          color="my_green"
          onPress={handleSaveDraft}
          accessibilityLabel="Zapisz szkic talii"
        />
      </View>
    </View>
  );
}
