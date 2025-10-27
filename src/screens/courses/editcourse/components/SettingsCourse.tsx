import { Switch, Text, View } from "react-native";

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
}: Props) {
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
    </View>
  );
}
