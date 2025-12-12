import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { createStyles } from "./WikiScreen-styles";
import TutorialCarousel from "./components/TutorialCarousel";
import TutorialSlide from "./components/TutorialSlide";

type Tab = "general" | "flashcards";

export default function WikiScreen() {
    const router = useRouter();
    const { colors } = useSettings();
    const styles = createStyles(colors);
    const [activeTab, setActiveTab] = useState<Tab>("general");

    const goBack = () => {
        router.back();
    };

    const renderGeneral = () => (
        <TutorialCarousel>
            <TutorialSlide
                title="Witaj w aplikacji!"
                description="To Twoje centrum nauki języków. Twórz własne kursy, dodawaj fiszki i śledź swoje postępy w jednym miejscu."
            >
                <Ionicons name="school" size={100} color={colors.my_green} />
            </TutorialSlide>

            <TutorialSlide
                title="Gdzie co jest?"
                description="Nawigacja w pigułce:"
            >
                <View style={{ flexDirection: "row", gap: 20, justifyContent: "center", width: "100%", flexWrap: "wrap" }}>
                    <View style={{ alignItems: "center", gap: 8, width: 80 }}>
                        <Ionicons name="person-circle-outline" size={32} color={colors.headline} />
                        <Text style={[styles.legendText, { flex: 0, textAlign: "center", fontSize: 11 }]}>Góra-Lewo: Kursy</Text>
                    </View>
                    <View style={{ alignItems: "center", gap: 8, width: 80 }}>
                        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.headline }}>123</Text>
                        <Text style={[styles.legendText, { flex: 0, textAlign: "center", fontSize: 11 }]}>Góra-Prawo: Statystyki</Text>
                    </View>
                    <View style={{ alignItems: "center", gap: 8, width: 80 }}>
                        <FontAwesome5 name="gamepad" size={28} color={colors.headline} />
                        <Text style={[styles.legendText, { flex: 0, textAlign: "center", fontSize: 11 }]}>Dół-Środek: Nauka</Text>
                    </View>
                </View>
            </TutorialSlide>

            <TutorialSlide
                title="Jak zacząć?"
                description="Proste kroki do sukcesu:"
            >
                <View style={{ width: "100%", paddingHorizontal: 20, gap: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ backgroundColor: colors.my_green, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontWeight: "bold", color: "white" }}>1</Text>
                        </View>
                        <Text style={[styles.text, { marginBottom: 0, flex: 1 }]}>Wybierz gotowy kurs lub stwórz swój.</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ backgroundColor: colors.my_green, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontWeight: "bold", color: "white" }}>2</Text>
                        </View>
                        <Text style={[styles.text, { marginBottom: 0, flex: 1 }]}>Dodaj nowe słówka do nauki.</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ backgroundColor: colors.my_green, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontWeight: "bold", color: "white" }}>3</Text>
                        </View>
                        <Text style={[styles.text, { marginBottom: 0, flex: 1 }]}>Powtarzaj codziennie i sprawdzaj staty!</Text>
                    </View>
                </View>
            </TutorialSlide>
        </TutorialCarousel>
    );

    const renderFlashcards = () => (
        <TutorialCarousel>
            <TutorialSlide
                title="System 5 pudełek"
                description="Każde nowe słowo zaczyna w Box 1. System Leitnera optymalizuje powtórki."
            >
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", height: 80 }}>
                    <BoxSkin wordCount={5} face="smile" isActive />
                    <BoxSkin wordCount={0} face="smile" />
                    <BoxSkin wordCount={0} face="smile" />
                </View>
            </TutorialSlide>

            <TutorialSlide
                title="Progres (Sukces)"
                description="Każda dobra odpowiedź przesuwa kartę do wyższego pudełka (np. z Box 1 do Box 2)."
            >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <BoxSkin wordCount={1} face="smile" />
                    <Ionicons name="arrow-forward" size={32} color={colors.my_green} />
                    <BoxSkin wordCount={2} face="happy" isActive />
                </View>
            </TutorialSlide>

            <TutorialSlide
                title="Mistrzostwo (Box 5)"
                description="Dotarcie do Box 5 oznacza pełne opanowanie słowa. Fiszka znika z cyklu powtórek."
            >
                <BoxSkin wordCount={0} face="happy" isActive />
            </TutorialSlide>

            <TutorialSlide
                title="Regres (Błąd)"
                description="Każdy błąd jest bolesny! Cofa kartę z powrotem do Box 1, niezależnie od obecnego poziomu."
            >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <BoxSkin wordCount={4} face="surprised" />
                    <Ionicons name="arrow-forward" size={32} color={colors.my_red} />
                    <BoxSkin wordCount={1} face="smile" isActive />
                </View>
            </TutorialSlide>
        </TutorialCarousel>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.header}>Pomoc & Wiki</Text>

                {activeTab === "general" ? renderGeneral() : renderFlashcards()}
            </ScrollView>

            <View style={styles.bottomBar}>
                <View style={styles.tabsContainer}>
                    <Pressable
                        style={[styles.tabButton, activeTab === "general" && styles.activeTabButton]}
                        onPress={() => setActiveTab("general")}
                    >
                        <Ionicons name="home" size={24} color={colors.headline} />
                    </Pressable>
                    <Pressable
                        style={[styles.tabButton, activeTab === "flashcards" && styles.activeTabButton]}
                        onPress={() => setActiveTab("flashcards")}
                    >
                        <Ionicons name="albums" size={24} color={colors.headline} />
                    </Pressable>
                </View>

                <MyButton
                    onPress={goBack}
                    width={50}
                    color="my_yellow"
                >
                    <Ionicons name="arrow-back" size={28} color={colors.headline} />
                </MyButton>
            </View>
        </View>
    );
}
