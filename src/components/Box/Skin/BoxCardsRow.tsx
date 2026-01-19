import Card1 from "@/assets/illustrations/box/miniflashcard1.png";
import Card2 from "@/assets/illustrations/box/miniflashcard2.png";
import Card3 from "@/assets/illustrations/box/miniflashcard3.png";
import React from "react";
import { Image, ImageStyle, View, ViewStyle } from "react-native";

const CARDS = [Card1, Card2, Card3];

interface BoxCardsRowProps {
    wordCount: number;
    styles: {
        cardsRow: ViewStyle;
        card1: ImageStyle;
        card2: ImageStyle;
        card3: ImageStyle;
    };
}

export const BoxCardsRow = ({ wordCount, styles }: BoxCardsRowProps) => {
    const count =
        wordCount > 30 ? 3 : wordCount > 20 ? 2 : wordCount > 10 ? 1 : 0;

    return count > 0 ? (
        <View style={styles.cardsRow}>
            {CARDS.slice(0, count).map((src, i) => (
                <Image
                    key={i}
                    source={src}
                    style={(styles as any)[`card${i + 1}`]}
                />
            ))}
        </View>
    ) : null;
};
