import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { createStyles } from "./WikiScreen-styles";

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
        <>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>O aplikacji</Text>
                <Text style={styles.text}>
                    Witaj w aplikacji do nauki języków! Tutaj możesz tworzyć własne kursy,
                    dodawać fiszki i śledzić swoje postępy. Aplikacja została stworzona,
                    aby pomóc Ci w systematycznej nauce.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Legenda</Text>

                <View style={styles.legendItem}>
                    <View style={styles.legendIconContainer}>
                        <Ionicons name="book" size={24} color={colors.headline} />
                    </View>
                    <Text style={styles.legendText}>Kursy - tutaj znajdziesz dostępne lekcje.</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={styles.legendIconContainer}>
                        <Ionicons name="stats-chart" size={24} color={colors.headline} />
                    </View>
                    <Text style={styles.legendText}>Statystyki - sprawdź swoje postępy i osiągnięcia.</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={styles.legendIconContainer}>
                        <Ionicons name="create" size={24} color={colors.headline} />
                    </View>
                    <Text style={styles.legendText}>Własne fiszki - twórz i edytuj swoje zestawy słówek.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Jak zacząć?</Text>
                <Text style={styles.text}>
                    1. Przejdź do sekcji "Kursy", aby wybrać gotowy zestaw.
                </Text>
                <Text style={styles.text}>
                    2. Użyj "Własne fiszki", aby dodać słówka, których chcesz się nauczyć.
                </Text>
                <Text style={styles.text}>
                    3. Regularnie zaglądaj do "Statystyk", aby utrzymać motywację!
                </Text>
            </View>
        </>
    );

    const renderFlashcards = () => (
        <>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Opis gry Flashcards</Text>
                <Text style={styles.text}>
                    Fiszki działają jak system Leitnera – poprawne odpowiedzi przesuwają kartę do
                    kolejnego pudełka, a błędne cofają do startu. Algorytm pilnuje, by częściej
                    wracać do trudnych słówek i losowo wybiera kolejną paczkę z aktywnego kursu.
                </Text>
                <Text style={styles.text}>
                    Domyślnie nowa paczka to 10 słów. Trafiają do Box 0 (jeśli włączony) lub Box 1
                    i czekają na pierwsze podejście.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sterowanie kartą</Text>
                <Text style={styles.text}>- Wpisz tłumaczenie pod pytaniem i kliknij "zatwiedź".</Text>
                <Text style={styles.text}>
                    - "dodaj słówka" dobiera nową paczkę z kursu, gdy obecne pudełka są puste lub
                    chcesz dorzucić więcej kart.
                </Text>
                <Text style={styles.text}>
                    - Ikona dwóch dymków zmienia wersję tłumaczenia, gdy fiszka ma kilka poprawnych
                    odpowiedzi.
                </Text>
                <Text style={styles.text}>
                    - Dotknij pola z trzema kropkami pod kartą, aby dodać lub edytować podpowiedź
                    zapisywaną w kursie.
                </Text>
                <Text style={styles.text}>
                    - Przy błędnej odpowiedzi pojawiają się dwa pola korekty; wpisz poprawne
                    słówko i tłumaczenie, by wrócić do nauki.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pudełka</Text>
                <Text style={styles.text}>
                    - Box 0: opcjonalna faza zapoznania. Nowe karty trafiają tutaj, a przejście
                    dalej wymaga szybkiej korekty.
                </Text>
                <Text style={styles.text}>
                    - Box 1: startowy poziom, gdy Box 0 jest wyłączony lub fiszka wyszła z fazy
                    wstępnej.
                </Text>
                <Text style={styles.text}>
                    - Box 2 i Box 4: pytanie bywa odwrócone (tłumaczenie → oryginał), żeby ćwiczyć
                    kierunek w drugą stronę.
                </Text>
                <Text style={styles.text}>
                    - Box 5: ostatni poziom. Poprawna odpowiedź oznacza fiszkę jako opanowaną
                    (konfetti!) i może zaplanować ją do późniejszych powtórek.
                </Text>
                <Text style={styles.text}>
                    - Zła odpowiedź cofa kartę do Box 0 lub Box 1, dobra przesuwa o jedno pudełko
                    do przodu.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aktywacja i podgląd</Text>
                <Text style={styles.text}>
                    - Stuknij pudełko, aby z niego losować karty; liczba pod spodem to liczba fiszek.
                </Text>
                <Text style={styles.text}>
                    - Przytrzymaj pudełko, by otworzyć podgląd listy fiszek w środku (bez zmiany
                    kolejki).
                </Text>
                <Text style={styles.text}>
                    - W edycji kursu możesz włączyć/wyłączyć Box 0, przełącznik "Autoflow" oraz
                    powtórki – przydatne, gdy chcesz, żeby pudełka same się przełączały i dociągały
                    nowe słowa.
                </Text>
                <Text style={styles.text}>
                    - W ustawieniach wyglądu wybierzesz układ pudełek (lista lub karuzela) oraz
                    miny pudełek.
                </Text>
            </View>
        </>
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
