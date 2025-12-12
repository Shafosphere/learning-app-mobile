import { useSettings } from "@/src/contexts/SettingsContext";
import { ThemeColors } from "@/src/theme/theme";
import React, { ReactNode, useState } from "react";
import {
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

interface TutorialCarouselProps {
    children: ReactNode[];
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function TutorialCarousel({ children }: TutorialCarouselProps) {
    const { colors } = useSettings();
    const styles = createStyles(colors);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        if (roundIndex !== activeIndex) {
            setActiveIndex(roundIndex);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
            >
                {children.map((child, index) => (
                    <View key={index} style={styles.slideContainer}>
                        {child}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.pagination}>
                {children.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            activeIndex === index && styles.activeDot,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },
        scrollContent: {
            alignItems: "center",
        },
        slideContainer: {
            width: SCREEN_WIDTH - 32, // Accommodate generic screen padding
            marginHorizontal: 0,
            alignItems: "center",
        },
        pagination: {
            flexDirection: "row",
            marginTop: 16,
            justifyContent: "center",
            alignItems: "center",
        },
        dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.border,
            marginHorizontal: 4,
        },
        activeDot: {
            width: 10,
            height: 10,
            backgroundColor: colors.my_green,
            borderRadius: 5,
        },
    });
