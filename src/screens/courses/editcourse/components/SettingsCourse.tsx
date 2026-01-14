import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { FlashcardsCardSize } from "@/src/contexts/SettingsContext";

type SwitchColors = {
  thumb: string;
  trackFalse: string;
  trackTrue: string;
};

type Props = {
  styles: Record<string, unknown>;
  switchColors: SwitchColors;
  boxZeroEnabled: boolean;
  onToggleBoxZero: (value: boolean) => void;
  autoflowEnabled: boolean;
  onToggleAutoflow: (value: boolean) => void;
  reviewsEnabled: boolean;
  onToggleReviews: (value: boolean) => void;
  skipCorrectionEnabled: boolean;
  onToggleSkipCorrection: (value: boolean) => void;
  skipCorrectionLocked?: boolean;
  cardSize: FlashcardsCardSize;
  onSelectCardSize: (value: FlashcardsCardSize) => void;
};

export function CourseSettingsSection({
  styles,
  switchColors,
  boxZeroEnabled,
  onToggleBoxZero,
  autoflowEnabled,
  onToggleAutoflow,
  reviewsEnabled,
  onToggleReviews,
  skipCorrectionEnabled,
  onToggleSkipCorrection,
  skipCorrectionLocked = false,
  cardSize,
  onSelectCardSize,
}: Props) {
  const cardSizeStyles = localStyles(switchColors);
  const {
    sectionGroup,
    sectionLabel,
    toggleRow,
    toggleTextWrapper,
    toggleTitle,
    toggleSubtitle,
  } = styles as {
    sectionGroup: object;
    sectionLabel: object;
    toggleRow: object;
    toggleTextWrapper: object;
    toggleTitle: object;
    toggleSubtitle: object;
  };

  return (
    <View style={sectionGroup}>
      <Text style={sectionLabel}>ustawienia</Text>

      <View style={toggleRow}>
        <View style={toggleTextWrapper}>
          <Text style={toggleTitle}>Faza zapoznania (Box 0)</Text>
          <Text style={toggleSubtitle}>Steruj tylko dla tego kursu.</Text>
        </View>
        <Switch
          value={boxZeroEnabled}
          onValueChange={onToggleBoxZero}
          trackColor={{ false: switchColors.trackFalse, true: switchColors.trackTrue }}
          thumbColor={switchColors.thumb}
        />
      </View>

      <View style={toggleRow}>
        <View style={toggleTextWrapper}>
          <Text style={toggleTitle}>Autoflow fiszek</Text>
          <Text style={toggleSubtitle}>
            Automatycznie przełączaj pudełka i pobieraj nowe słowa.
          </Text>
        </View>
        <Switch
          value={autoflowEnabled}
          onValueChange={onToggleAutoflow}
          trackColor={{ false: switchColors.trackFalse, true: switchColors.trackTrue }}
          thumbColor={switchColors.thumb}
        />
      </View>

      <View style={toggleRow}>
        <View style={toggleTextWrapper}>
          <Text style={toggleTitle}>Włącz powtórki</Text>
          <Text style={toggleSubtitle}>
            Dodaj fiszki z tego kursu do codziennych powtórek.
          </Text>
        </View>
        <Switch
          value={reviewsEnabled}
          onValueChange={onToggleReviews}
          trackColor={{ false: switchColors.trackFalse, true: switchColors.trackTrue }}
          thumbColor={switchColors.thumb}
        />
      </View>

      <View style={toggleRow}>
        <View style={toggleTextWrapper}>
          <Text style={toggleTitle}>Pomiń poprawkę po błędzie</Text>
          <Text style={toggleSubtitle}>
            Po złej odpowiedzi od razu pokaż następną fiszkę.
          </Text>
        </View>
        <Switch
          value={skipCorrectionLocked ? true : skipCorrectionEnabled}
          onValueChange={skipCorrectionLocked ? undefined : onToggleSkipCorrection}
          trackColor={{ false: switchColors.trackFalse, true: switchColors.trackTrue }}
          thumbColor={switchColors.thumb}
          disabled={skipCorrectionLocked}
        />
      </View>

      <View style={toggleRow}>
        <View style={toggleTextWrapper}>
          <Text style={toggleTitle}>Rozmiar fiszki</Text>
          <Text style={toggleSubtitle}>
            Zmień wielkość karty tylko dla tego kursu.
          </Text>
        </View>
      </View>
      <View style={cardSizeStyles.cardSizeRow}>
        {[
          {
            key: "large" as FlashcardsCardSize,
            title: "Duża",
            subtitle: "Więcej miejsca na treść pytania.",
          },
          {
            key: "small" as FlashcardsCardSize,
            title: "Mała",
            subtitle: "Kompaktowy widok z mniejszą kartą.",
          },
        ].map((option, idx) => {
          const isActive = cardSize === option.key;
          return (
            <Pressable
              key={option.key}
              style={[
                cardSizeStyles.cardSizeOption,
                idx === 0 && cardSizeStyles.cardSizeOptionFirst,
                idx === 1 && cardSizeStyles.cardSizeOptionLast,
                isActive
                  ? cardSizeStyles.cardSizeOptionActive
                  : cardSizeStyles.cardSizeOptionInactive,
              ]}
              onPress={() => onSelectCardSize(option.key)}
            >
              <Text
                style={[
                  toggleTitle,
                  cardSizeStyles.cardSizeTitle,
                  isActive && cardSizeStyles.cardSizeTitleActive,
                ]}
              >
                {option.title}
              </Text>
              <Text style={[toggleSubtitle, cardSizeStyles.cardSizeSubtitle]}>
                {option.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const localStyles = (switchColors: SwitchColors) =>
  StyleSheet.create({
    cardSizeRow: {
      flexDirection: "row",
      paddingHorizontal: 4,
    },
    cardSizeOption: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    cardSizeOptionFirst: {
      marginRight: 6,
    },
    cardSizeOptionLast: {
      marginLeft: 6,
    },
    cardSizeOptionActive: {
      backgroundColor: switchColors.trackTrue,
      borderColor: switchColors.trackTrue,
    },
    cardSizeOptionInactive: {
      backgroundColor: "transparent",
      borderColor: switchColors.trackFalse,
    },
    cardSizeTitle: {
      color: "#0F172A",
      fontWeight: "600",
    },
    cardSizeTitleActive: {
      color: "#0F172A",
    },
    cardSizeSubtitle: {
      color: "#475569",
      marginTop: 4,
    },
  });
