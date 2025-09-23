import { useState, type ComponentType } from "react";
import {
  InputAccessoryView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputComponent,
  View,
} from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import MyButton from "@/src/components/button/button";
import { usePopup } from "@/src/contexts/PopupContext";
import { useStyles } from "@/src/screens/custom_profile/styles_custom_profile";
import { useSettings } from "@/src/contexts/SettingsContext";

import Entypo from "@expo/vector-icons/Entypo";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Ionicons from "@expo/vector-icons/Ionicons";

const PROFILE_COLORS = [
  { id: "red", label: "Czerwony", value: "#FF0000" },
  { id: "orange", label: "Pomarańczowy", value: "#FFA500" },
  { id: "yellow", label: "Żółty", value: "#FFFF00" },
  { id: "green", label: "Zielony", value: "#008000" },
  { id: "turquoise", label: "Turkusowy", value: "#40E0D0" },
  { id: "blue", label: "Niebieski", value: "#0000FF" },
  { id: "purple", label: "Fioletowy", value: "#800080" },
  { id: "pink", label: "Różowy", value: "#FFC0CB" },
  { id: "brown", label: "Brązowy", value: "#A52A2A" },
  { id: "gray", label: "Szary", value: "#808080" },
];

type IconComponent = ComponentType<{
  name: string;
  size?: number;
  color?: string;
}>;

const PROFILE_ICONS: { id: string; Component: IconComponent; name: string }[] =
  [
    { id: "heart", Component: AntDesign, name: "heart" },
    { id: "coffee", Component: MaterialCommunityIcons, name: "coffee" },
    { id: "suitcase", Component: Entypo, name: "suitcase" },
    { id: "star", Component: AntDesign, name: "star" },
    { id: "house", Component: FontAwesome6, name: "house-chimney" },
    { id: "cloud", Component: AntDesign, name: "cloud" },
    { id: "eye", Component: AntDesign, name: "eye" },
    { id: "leaf", Component: Ionicons, name: "leaf" },
  ];
interface ManualCard {
  id: string;
  front: string;
  back: string;
}

type AddMode = "csv" | "manual";

export default function CustomProfileScreen() {
  const styles = useStyles();
  const { colors } = useSettings();
  const setPopup = usePopup();

  const [addMode, setAddMode] = useState<AddMode>("csv");
  const [manualCards, setManualCards] = useState<ManualCard[]>([
    { id: "card-0", front: "", back: "" },
  ]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const sampleFileName = "custom_profile_przyklad.csv";

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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Profil</Text>

          <View>
            <Text style={styles.miniSectionHeader}>nazwa</Text>
            <TextInput style={styles.profileInput}></TextInput>
          </View>

          <View style={styles.iconContainer}>
            <Text style={styles.miniSectionHeader}>ikona</Text>
            <View style={styles.imageContainer}>
              {PROFILE_ICONS.map(({ id, Component, name }) => (
                <Component
                  key={id}
                  name={name as never}
                  size={30}
                  color={colors.headline}
                />
              ))}
            </View>

            <View style={styles.colorsContainer}>
              {PROFILE_COLORS.map((color) => (
                <Pressable
                  key={color.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Kolor ${color.label}`}
                  style={[
                    styles.profileColor,
                    { backgroundColor: color.value },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
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
        </View>

        {addMode === "csv" ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>import z pliku CSV</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Dodaj ręcznie</Text>
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
