import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type {
  FlashcardsCardSize,
  FlashcardsImageSize,
  TrueFalseButtonsVariant,
} from "@/src/contexts/SettingsContext";
import type { ThemeColors } from "@/src/theme/theme";

type SwitchColors = {
  thumb: string;
  trackFalse: string;
  trackTrue: string;
};

type Props = {
  styles: Record<string, unknown>;
  switchColors: SwitchColors;
  colors: ThemeColors;
  boxZeroEnabled: boolean;
  onToggleBoxZero: (value: boolean) => void;
  autoflowEnabled: boolean;
  onToggleAutoflow: (value: boolean) => void;
  reviewsEnabled: boolean;
  onToggleReviews: (value: boolean) => void;
  skipCorrectionEnabled: boolean;
  onToggleSkipCorrection: (value: boolean) => void;
  skipCorrectionLocked?: boolean;
  hideSkipCorrectionOption?: boolean;
  trueFalseButtonsVariant: TrueFalseButtonsVariant;
  onSelectTrueFalseButtonsVariant: (value: TrueFalseButtonsVariant) => void;
  showTrueFalseButtonsVariant?: boolean;
  cardSize: FlashcardsCardSize;
  onSelectCardSize: (value: FlashcardsCardSize) => void;
  showImageSizeOptions?: boolean;
  imageSize?: FlashcardsImageSize;
  onSelectImageSize?: (value: FlashcardsImageSize) => void;
  imageSizeEnabled?: boolean;
};

export function CourseSettingsSection({
  styles,
  switchColors,
  colors,
  boxZeroEnabled,
  onToggleBoxZero,
  autoflowEnabled,
  onToggleAutoflow,
  reviewsEnabled,
  onToggleReviews,
  skipCorrectionEnabled,
  onToggleSkipCorrection,
  skipCorrectionLocked = false,
  hideSkipCorrectionOption = false,
  trueFalseButtonsVariant,
  onSelectTrueFalseButtonsVariant,
  showTrueFalseButtonsVariant = false,
  cardSize,
  onSelectCardSize,
  showImageSizeOptions = false,
  imageSize,
  onSelectImageSize,
  imageSizeEnabled = false,
}: Props) {
  const cardSizeStyles = localStyles(switchColors, colors);
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
          <Text style={toggleTitle}>Faza zapoznania (Pudełko 0)</Text>
          <Text style={toggleSubtitle}>
            To dodatkowe pudełko, które ułatwia szybkie zapoznanie się z fiszkami.
          </Text>
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
          <Text style={toggleTitle}>Automat fiszek</Text>
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

      {hideSkipCorrectionOption ? null : (
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
      )}

      {showTrueFalseButtonsVariant ? (
        <>
          <View style={toggleRow}>
            <View style={toggleTextWrapper}>
              <Text style={toggleTitle}>Rodzaj przycisków w Prawda / Fałsz</Text>
              <Text style={toggleSubtitle}>
                Wybierz, jakie napisy mają mieć przyciski.
              </Text>
            </View>
          </View>
          <View style={cardSizeStyles.cardSizeRow}>
            {[
              {
                key: "true_false" as TrueFalseButtonsVariant,
                title: "Stwierdzenie",
                subtitle: "Prawda / Fałsz",
              },
              {
                key: "know_dont_know" as TrueFalseButtonsVariant,
                title: "Opanowanie",
                subtitle: "Umiem / Nie umiem",
              },
            ].map((option, idx) => {
              const isActive = trueFalseButtonsVariant === option.key;
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
                  onPress={() => onSelectTrueFalseButtonsVariant(option.key)}
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
        </>
      ) : null}

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
            subtitle: "Karta rozszerza się pionowo i widzisz cały tekst.",
          },
          {
            key: "small" as FlashcardsCardSize,
            title: "Mała",
            subtitle: "Tekst jest w jednej linii i przesuwa się.",
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

      {showImageSizeOptions ? (
        <>
          <View style={toggleRow}>
            <View style={toggleTextWrapper}>
              <Text style={toggleTitle}>Rozmiar obrazu</Text>
              <Text style={toggleSubtitle}>
                Dopasuj wysokość obrazków w dużych fiszkach.
              </Text>
              {!imageSizeEnabled ? (
                <Text style={[toggleSubtitle, cardSizeStyles.imageSizeHint]}>
                  Dostępne tylko dla dużych kart z obrazkami.
                </Text>
              ) : null}
            </View>
          </View>
          <View style={cardSizeStyles.imageSizeRow}>
            {[
              {
                key: "dynamic" as FlashcardsImageSize,
                title: "Dynamiczny",
                subtitle: "Użyj naturalnych proporcji",
              },
              {
                key: "small" as FlashcardsImageSize,
                title: "Mały",
                subtitle: "40% maksymalnej wysokości",
              },
              {
                key: "medium" as FlashcardsImageSize,
                title: "Średni",
                subtitle: "60% maksymalnej wysokości",
              },
              {
                key: "large" as FlashcardsImageSize,
                title: "Duży",
                subtitle: "100% maksymalnej wysokości",
              },
            ].map((option) => {
              const isActive = imageSize === option.key;
              const isDisabled = !imageSizeEnabled || !onSelectImageSize;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    cardSizeStyles.cardSizeOption,
                    cardSizeStyles.imageSizeOption,
                    isActive
                      ? cardSizeStyles.cardSizeOptionActive
                      : cardSizeStyles.cardSizeOptionInactive,
                    isDisabled && cardSizeStyles.cardSizeOptionDisabled,
                  ]}
                  onPress={
                    isDisabled ? undefined : () => onSelectImageSize(option.key)
                  }
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      toggleTitle,
                      cardSizeStyles.cardSizeTitle,
                      isActive && cardSizeStyles.cardSizeTitleActive,
                      isDisabled && cardSizeStyles.cardSizeTitleDisabled,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      toggleSubtitle,
                      cardSizeStyles.cardSizeSubtitle,
                      isDisabled && cardSizeStyles.cardSizeSubtitleDisabled,
                    ]}
                  >
                    {option.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const localStyles = (switchColors: SwitchColors, colors: ThemeColors) =>
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
      fontWeight: "600",
      color: colors.headline,
    },
    cardSizeTitleActive: {
      color: colors.font,
    },
    cardSizeSubtitle: {
      color: colors.paragraph,
      marginTop: 4,
    },
    imageSizeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 4,
      marginTop: 6,
    },
    imageSizeOption: {
      minWidth: "48%",
      marginBottom: 8,
      marginRight: 6,
    },
    cardSizeOptionDisabled: {
      opacity: 0.5,
    },
    cardSizeTitleDisabled: {
      color: colors.paragraph,
    },
    cardSizeSubtitleDisabled: {
      color: colors.paragraph,
    },
    imageSizeHint: {
      marginTop: 4,
      color: colors.paragraph,
    },
  });
