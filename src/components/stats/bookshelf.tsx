import React, { useMemo } from "react";
import { Text, View, type ViewStyle } from "react-native";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type BookColor = "blue" | "brown" | "violet";
type BookSize = "short" | "medium" | "tall";

type BookSpec = {
  color: BookColor;
  size: BookSize;
  flex?: number;
  letter?: string;
};

const useStyles = createThemeStylesHook((colors) => {
  const isDark = colors.background === colors.darkbg || colors.headline === "#fffffe";
  const frame = isDark ? "#5a3c24" : "#c78d5c";
  const innerFrame = isDark ? "#3b2616" : "#b97845";
  const shelfBoard = isDark ? "#7d5833" : "#e2b078";
  const shelfEdge = isDark ? "#4c311c" : "#c18a58";
  const backPanel = isDark ? "#1d120b" : "#f2e2cf";
  const stripe = isDark ? "rgba(255,255,255,0.65)" : "#f7f7f7";

  return {
    cabinet: {
      backgroundColor: frame,
      borderRadius: 22,
      padding: 10,
      paddingBottom: 32,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    cabinetInner: {
      position: "relative",
      backgroundColor: innerFrame,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)",
      overflow: "hidden",
    },
    backPanel: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: backPanel,
      opacity: isDark ? 0.28 : 0.45,
      borderRadius: 16,
    },
    shelfRow: {
      position: "relative",
      marginBottom: 14,
      paddingHorizontal: 4,
      paddingTop: 6,
      paddingBottom: 16,
    },
    lastShelfRow: {
      marginBottom: 0,
    },
    shelfBoard: {
      position: "absolute",
      left: 2,
      right: 2,
      bottom: 6,
      height: 16,
      borderRadius: 10,
      backgroundColor: shelfBoard,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    shelfBoardEdge: {
      position: "absolute",
      left: 2,
      right: 2,
      bottom: 6,
      height: 5,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      backgroundColor: shelfEdge,
      opacity: 0.6,
    },
    booksRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 0,
      justifyContent: "flex-start",
    },
    book: {
      flexShrink: 0,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      paddingVertical: 6,
      paddingHorizontal: 8,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    bookSpacing: {
      marginRight: 5,
    },
    bookShort: {
      height: 46,
    },
    bookMedium: {
      height: 60,
    },
    bookTall: {
      height: 74,
    },
    bookBlue: {
      backgroundColor: isDark ? "#9ea8ff" : "#7a7af3",
    },
    bookBrown: {
      backgroundColor: isDark ? "#d7a068" : "#8d4f22",
    },
    bookViolet: {
      backgroundColor: isDark ? "#c7b4ff" : "#4f3b55",
    },
    bookLetter: {
      color: stripe,
      fontWeight: "700",
      fontSize: 14,
      lineHeight: 16,
      textAlign: "center",
    },
    cabinetLip: {
      marginTop: 10,
      height: 10,
      borderRadius: 12,
      backgroundColor: frame,
      borderTopWidth: 1,
      borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.4)",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  };
});

export default function MedalsShowcase() {
  const styles = useStyles();
  const words = ["NARAZIE", "NIC  TU", "NIE", "MA"];
  const rows = useMemo(() => {
    const palette: BookColor[] = ["brown", "violet", "blue"];
    const sizes: BookSize[] = ["short", "medium", "tall"];
    const targetSlots = 9;

    return words.map((rawWord, rowIdx) => {
      const cleanWord = rawWord.replace(/\s+/g, "");

      const letterBooks: BookSpec[] = cleanWord.split("").map((ch, i) => ({
        color: palette[(i + rowIdx) % palette.length],
        size: sizes[i % sizes.length],
        flex: 1.25, // litery są trochę szersze
        letter: ch,
      }));

      const fillerCount = Math.max(0, targetSlots - letterBooks.length);
      const fillerBooks: BookSpec[] = Array.from({ length: fillerCount }, (_, i) => ({
        color: palette[(i + letterBooks.length + rowIdx) % palette.length],
        size: sizes[(i + rowIdx) % sizes.length],
        flex: 1,
      }));

      const combined = [...letterBooks, ...fillerBooks];
      return combined.slice(0, targetSlots);
    });
  }, [words]);

  const colorStyles: Record<BookColor, ViewStyle> = {
    blue: styles.bookBlue,
    brown: styles.bookBrown,
    violet: styles.bookViolet,
  };

  const sizeStyles: Record<BookSize, ViewStyle> = {
    short: styles.bookShort,
    medium: styles.bookMedium,
    tall: styles.bookTall,
  };

  return (
    <StatsCard title="Półki postępów">
      <View style={styles.cabinet}>
        <View style={styles.cabinetInner}>
          <View pointerEvents="none" style={styles.backPanel} />

          {rows.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={[styles.shelfRow, rowIndex === rows.length - 1 && styles.lastShelfRow]}
            >
              <View style={styles.shelfBoard} />
              <View style={styles.shelfBoardEdge} />

              <View style={styles.booksRow}>
                {row.map((book, bookIndex) => {
                  const letter = book.letter ?? "";

                  return (
                    <View
                      key={`book-${rowIndex}-${bookIndex}`}
                      style={[
                        styles.book,
                        colorStyles[book.color],
                        sizeStyles[book.size],
                        { flex: book.flex ?? 1 },
                        bookIndex === row.length - 1 ? null : styles.bookSpacing,
                      ]}
                    >
                      <Text style={styles.bookLetter}>{letter}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* <View style={styles.cabinetLip} /> */}
      </View>
    </StatsCard>
  );
}
