import MyButton from "@/src/components/button/button";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

export type CsvImportType = "text" | "image" | "true_false";

interface CsvImportGuideProps {
    onPickFile: () => void;
    selectedFileName: string | null;
    setPopup: (popup: {
        message: string;
        color: "calm" | "angry";
        duration: number;
    }) => void;
}

const useStyles = createThemeStylesHook((colors) => ({
    container: {
        gap: 16,
    },
    tabsContainer: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 8,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.secondBackground,
    },
    tabActive: {
        backgroundColor: colors.my_green,
        borderColor: colors.my_green,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.paragraph,
    },
    tabTextActive: {
        color: colors.darkbg,
        fontWeight: "700",
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
}));

type TemplateData = {
    label: string;
    description: string;
    columns: string[];
    sampleRow: string[];
    tip?: string;
};

const TEMPLATES: Record<CsvImportType, TemplateData> = {
    text: {
        label: "Tradycyjne",
        description: "Standardowe fiszki tekstowe z pytaniem i odpowiedzią.",
        columns: ["front", "back", "hint1", "hint2", "lock"],
        sampleRow: ["Pies", "Dog", "Szczeka", "Barks", "false"],
        tip: "Możesz dodać wiele odpowiedzi w kolumnie 'back', rozdzielając je średnikiem (;). Np. 'Cat; Kitty'.",
    },
    true_false: {
        label: "Prawda / Fałsz",
        description: "Fiszki, gdzie odpowiedzią jest Prawda lub Fałsz.",
        columns: ["front", "is_true", "hint1", "lock"],
        sampleRow: ["Ziemia jest płaska", "false", "", "false"],
        tip: "W kolumnie 'is_true' wpisz: true/tak/1 dla prawdy, false/nie/0 dla fałszu.",
    },
    image: {
        label: "Z obrazkami (ZIP)",
        description:
            "Tylko format ZIP. Musi zawierać plik 'data.csv' oraz folder 'images'.",
        columns: ["front", "back", "image_front", "image_back"],
        sampleRow: ["Kot", "Cat", "kot.jpg", ""],
        tip: "Pliki obrazków umieść w folderze 'images' w archiwum ZIP. W CSV podaj tylko nazwę pliku, np. 'obrazek.jpg'.",
    },
};

export function CsvImportGuide({
    onPickFile,
    selectedFileName,
    setPopup,
}: CsvImportGuideProps) {
    const styles = useStyles();
    const [activeType, setActiveType] = useState<CsvImportType>("text");

    const template = TEMPLATES[activeType];

    const handleDownloadTemplate = async () => {
        try {
            if (activeType === "image") {
                setPopup({
                    message: "Dla obrazków przygotuj plik ZIP ręcznie wg instrukcji.",
                    color: "calm",
                    duration: 4000,
                });
                return;
            }

            const fileName = `szablon_${activeType}.csv`;
            const header = template.columns.join(";");
            const row = template.sampleRow.join(";");
            const content = `${header}\n${row}`;

            const fileUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, content, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                setPopup({
                    message: "Zapisano wzór w dokumentach aplikacji",
                    color: "calm",
                    duration: 3000,
                });
            }
        } catch (e) {
            console.error(e);
            setPopup({
                message: "Błąd podczas generowania wzoru",
                color: "angry",
                duration: 4000,
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                <View style={styles.tabsContainer}>
                    {(Object.keys(TEMPLATES) as CsvImportType[]).map((type) => (
                        <Pressable
                            key={type}
                            onPress={() => setActiveType(type)}
                            style={[
                                styles.tab,
                                activeType === type && styles.tabActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    activeType === type && styles.tabTextActive,
                                ]}
                            >
                                {TEMPLATES[type].label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            {/* Content */}
            <View style={styles.contentContainer}>
                <Text style={styles.description}>{template.description}</Text>

                {/* Visual Table Preview */}
                <View style={styles.columnTable}>
                    <View style={styles.columnRow}>
                        {template.columns.slice(0, 4).map((col, idx, arr) => (
                            <Text
                                key={col}
                                style={[
                                    styles.columnHeader,
                                    idx === arr.length - 1 && styles.lastCell,
                                ]}
                            >
                                {col}
                            </Text>
                        ))}
                    </View>
                    <View style={styles.columnRow}>
                        {template.sampleRow.slice(0, 4).map((val, idx, arr) => (
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
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
                <MyButton
                    text="Wybierz plik"
                    onPress={onPickFile}
                    width={140}
                />
                <MyButton
                    text="Pobierz wzór"
                    color="my_yellow"
                    onPress={handleDownloadTemplate}
                    width={140}
                // Disable or change action for ZIP if problematic, but users might appreciate a CSV template for the ZIP too.
                // For now I allowed downloading the CSV part even for ZIP mode.
                />
            </View>

            {selectedFileName && (
                <View style={styles.fileInfo}>
                    <Ionicons name="document-text" size={20} color={styles.fileName?.color} />
                    <Text style={styles.fileName}>{selectedFileName}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="green" />
                </View>
            )}
        </View>
    );
}
