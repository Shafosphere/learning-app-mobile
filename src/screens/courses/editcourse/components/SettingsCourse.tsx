import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { Pressable, Text, View } from "react-native";
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

export type CourseSettingsSectionProps = {
  styles: Record<string, unknown>;
  switchColors: SwitchColors;
  colors: ThemeColors;
  boxZeroEnabled: boolean;
  onToggleBoxZero: (value: boolean) => void;
  autoflowEnabled: boolean;
  onToggleAutoflow: (value: boolean) => void;
  reviewsEnabled: boolean;
  onToggleReviews: (value: boolean) => void;
  showExplanationEnabled: boolean;
  onToggleShowExplanation: (value: boolean) => void;
  explanationOnlyOnWrong: boolean;
  onToggleExplanationOnlyOnWrong: (value: boolean) => void;
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
  imageSizeOptions?: FlashcardsImageSize[];
  onSelectImageSize?: (value: FlashcardsImageSize) => void;
  imageSizeEnabled?: boolean;
  showImageFrameOption?: boolean;
  imageFrameEnabled?: boolean;
  onToggleImageFrame?: (value: boolean) => void;
};

type SharedStyles = {
  sectionGroup: object;
  switch: object;
  settingsSectionHeader: object;
  settingsGroupLabel: object;
  settingsGroupCard: object;
  settingsGroupRows: object;
  settingsGroupRow: object;
  settingsGroupDivider: object;
  settingsRowText: object;
  settingsRowTitle: object;
  settingsRowDescription: object;
  settingsDependentRow: object;
  settingsDependentRowDisabled: object;
  settingsChoiceBlock: object;
  settingsChoiceHeader: object;
  settingsChoiceTitle: object;
  settingsChoiceDescription: object;
  settingsChoiceHint: object;
  settingsChoiceGrid: object;
  settingsChoiceOption: object;
  settingsChoiceOptionActive: object;
  settingsChoiceOptionDisabled: object;
  settingsChoiceOptionTitle: object;
  settingsChoiceOptionDescription: object;
};

type ToggleRowProps = {
  styles: SharedStyles;
  title: string;
  description: string;
  value: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  dependent?: boolean;
  dimmed?: boolean;
};

type ChoiceOption<T extends string> = {
  key: T;
  title: string;
  subtitle: string;
};

type ChoiceBlockProps<T extends string> = {
  styles: SharedStyles;
  title: string;
  description: string;
  hint?: string;
  options: ChoiceOption<T>[];
  value: T;
  onSelect?: (value: T) => void;
  disabled?: boolean;
};

const TRUE_FALSE_OPTIONS: ChoiceOption<TrueFalseButtonsVariant>[] = [
  {
    key: "true_false",
    title: "Stwierdzenie",
    subtitle: "Prawda / Fałsz",
  },
  {
    key: "know_dont_know",
    title: "Opanowanie",
    subtitle: "Umiem / Nie umiem",
  },
];

const CARD_SIZE_OPTIONS: ChoiceOption<FlashcardsCardSize>[] = [
  {
    key: "large",
    title: "Duża",
    subtitle: "Karta rozszerza się pionowo i pokazuje cały tekst.",
  },
  {
    key: "small",
    title: "Mała",
    subtitle: "Tekst zostaje w jednej linii i przesuwa się.",
  },
];

const IMAGE_SIZE_LABELS: Record<
  FlashcardsImageSize,
  { title: string; subtitle: string }
> = {
  dynamic: {
    title: "Dynamiczny",
    subtitle: "Naturalne proporcje obrazka.",
  },
  small: {
    title: "Mały",
    subtitle: "40% maksymalnej wysokości.",
  },
  medium: {
    title: "Średni",
    subtitle: "60% maksymalnej wysokości.",
  },
  large: {
    title: "Duży",
    subtitle: "100% maksymalnej wysokości.",
  },
  very_large: {
    title: "Bardzo duży",
    subtitle: "170% maksymalnej wysokości.",
  },
};

function SettingsToggleRow({
  styles,
  title,
  description,
  value,
  onPress,
  accessibilityLabel,
  disabled = false,
  dependent = false,
  dimmed = false,
}: ToggleRowProps) {
  return (
    <View
      style={[
        styles.settingsGroupRow,
        dependent && styles.settingsDependentRow,
        dimmed && styles.settingsDependentRowDisabled,
      ]}
    >
      <View style={styles.settingsRowText}>
        <Text style={styles.settingsRowTitle}>{title}</Text>
        <Text style={styles.settingsRowDescription}>
          {preventWidowsPl(description)}
        </Text>
      </View>
      <View style={styles.switch}>
        <ToggleSwitch
          value={value}
          onPress={onPress}
          accessibilityLabel={accessibilityLabel}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

function SettingsChoiceBlock<T extends string>({
  styles,
  title,
  description,
  hint,
  options,
  value,
  onSelect,
  disabled = false,
}: ChoiceBlockProps<T>) {
  return (
    <View style={styles.settingsChoiceBlock}>
      <View style={styles.settingsChoiceHeader}>
        <Text style={styles.settingsChoiceTitle}>{title}</Text>
        <Text style={styles.settingsChoiceDescription}>
          {preventWidowsPl(description)}
        </Text>
        {hint ? (
          <Text style={styles.settingsChoiceHint}>{preventWidowsPl(hint)}</Text>
        ) : null}
      </View>
      <View style={styles.settingsChoiceGrid}>
        {options.map((option) => {
          const isActive = value === option.key;
          return (
            <Pressable
              key={option.key}
              style={[
                styles.settingsChoiceOption,
                isActive && styles.settingsChoiceOptionActive,
                disabled && styles.settingsChoiceOptionDisabled,
              ]}
              onPress={disabled || !onSelect ? undefined : () => onSelect(option.key)}
              disabled={disabled || !onSelect}
            >
              <Text style={styles.settingsChoiceOptionTitle}>{option.title}</Text>
              <Text style={styles.settingsChoiceOptionDescription}>
                {preventWidowsPl(option.subtitle)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function CourseSettingsSection({
  styles,
  colors,
  boxZeroEnabled,
  onToggleBoxZero,
  autoflowEnabled,
  onToggleAutoflow,
  reviewsEnabled,
  onToggleReviews,
  showExplanationEnabled,
  onToggleShowExplanation,
  explanationOnlyOnWrong,
  onToggleExplanationOnlyOnWrong,
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
  imageSizeOptions,
  onSelectImageSize,
  imageSizeEnabled = false,
  showImageFrameOption = false,
  imageFrameEnabled = true,
  onToggleImageFrame,
}: CourseSettingsSectionProps) {
  const sharedStyles = styles as SharedStyles;

  const imageOptions = (imageSizeOptions ?? [
    "dynamic",
    "small",
    "medium",
    "large",
  ]).map((key) => ({
    key,
    ...IMAGE_SIZE_LABELS[key],
  }));

  return (
    <View style={sharedStyles.sectionGroup}>
      <Text style={sharedStyles.settingsSectionHeader}>USTAWIENIA</Text>

      <Text style={sharedStyles.settingsGroupLabel}>PRZEPŁYW</Text>
      <View style={sharedStyles.settingsGroupCard}>
        <View style={sharedStyles.settingsGroupRows}>
          <SettingsToggleRow
            styles={sharedStyles}
            title="Faza zapoznania (Pudełko 0)"
            description="To dodatkowe pudełko, które ułatwia szybkie zapoznanie się z fiszkami."
            value={boxZeroEnabled}
            onPress={() => onToggleBoxZero(!boxZeroEnabled)}
            accessibilityLabel="Przełącz fazę zapoznania"
          />
          <View style={sharedStyles.settingsGroupDivider} />
          <SettingsToggleRow
            styles={sharedStyles}
            title="Automat fiszek"
            description="Automatycznie przełączaj pudełka i pobieraj nowe słowa."
            value={autoflowEnabled}
            onPress={() => onToggleAutoflow(!autoflowEnabled)}
            accessibilityLabel="Przełącz automat fiszek"
          />
          <View style={sharedStyles.settingsGroupDivider} />
          <SettingsToggleRow
            styles={sharedStyles}
            title="Włącz powtórki"
            description="Dodaj fiszki z tego kursu do codziennych powtórek."
            value={reviewsEnabled}
            onPress={() => onToggleReviews(!reviewsEnabled)}
            accessibilityLabel="Przełącz powtórki"
          />
        </View>
      </View>

      <Text style={sharedStyles.settingsGroupLabel}>WYJAŚNIENIA</Text>
      <View style={sharedStyles.settingsGroupCard}>
        <View style={sharedStyles.settingsGroupRows}>
          <SettingsToggleRow
            styles={sharedStyles}
            title="Wyświetlaj wyjaśnienie"
            description="Pokazuj wyjaśnienie po odpowiedzi, jeśli fiszka je posiada."
            value={showExplanationEnabled}
            onPress={() => onToggleShowExplanation(!showExplanationEnabled)}
            accessibilityLabel="Przełącz wyświetlanie wyjaśnień"
          />
          <View style={sharedStyles.settingsGroupDivider} />
          <SettingsToggleRow
            styles={sharedStyles}
            title="Tylko po błędnej odpowiedzi"
            description="Gdy wyłączone, wyjaśnienie pokaże się po poprawnej i błędnej odpowiedzi."
            value={showExplanationEnabled ? explanationOnlyOnWrong : false}
            onPress={() =>
              onToggleExplanationOnlyOnWrong(
                !(showExplanationEnabled ? explanationOnlyOnWrong : false)
              )
            }
            accessibilityLabel="Przełącz wyjaśnienie tylko po błędnej odpowiedzi"
            disabled={!showExplanationEnabled}
            dependent
            dimmed={!showExplanationEnabled}
          />
        </View>
      </View>

      <Text style={sharedStyles.settingsGroupLabel}>ODPOWIEDZI</Text>
      {!hideSkipCorrectionOption ? (
        <View style={sharedStyles.settingsGroupCard}>
          <SettingsToggleRow
            styles={sharedStyles}
            title="Pomiń poprawkę po błędzie"
            description="Po złej odpowiedzi od razu pokaż następną fiszkę. Dotyczy fiszek z odpowiedzią tekstową."
            value={skipCorrectionLocked ? true : skipCorrectionEnabled}
            onPress={() =>
              skipCorrectionLocked
                ? undefined
                : onToggleSkipCorrection(
                    !(skipCorrectionLocked ? true : skipCorrectionEnabled)
                  )
            }
            accessibilityLabel="Przełącz pomijanie poprawki po błędzie"
            disabled={skipCorrectionLocked}
            dimmed={skipCorrectionLocked}
          />
        </View>
      ) : null}

      {showTrueFalseButtonsVariant ? (
        <SettingsChoiceBlock
          styles={sharedStyles}
          title="Rodzaj przycisków w Prawda / Fałsz"
          description="Wybierz, jakie napisy mają mieć przyciski w tym kursie."
          options={TRUE_FALSE_OPTIONS}
          value={trueFalseButtonsVariant}
          onSelect={onSelectTrueFalseButtonsVariant}
        />
      ) : null}

      <Text style={sharedStyles.settingsGroupLabel}>KARTA</Text>
      <SettingsChoiceBlock
        styles={sharedStyles}
        title="Rozmiar fiszki"
        description="Zmień wielkość karty tylko dla tego kursu."
        options={CARD_SIZE_OPTIONS}
        value={cardSize}
        onSelect={onSelectCardSize}
      />

      {showImageSizeOptions ? (
        <SettingsChoiceBlock
          styles={sharedStyles}
          title="Rozmiar obrazu"
          description="Dopasuj wysokość obrazków w dużych fiszkach."
          hint={
            imageSizeEnabled
              ? undefined
              : "Dostępne tylko dla dużych kart z obrazkami."
          }
          options={imageOptions}
          value={imageSize ?? "dynamic"}
          onSelect={onSelectImageSize}
          disabled={!imageSizeEnabled || !onSelectImageSize}
        />
      ) : null}

      {showImageFrameOption ? (
        <View style={sharedStyles.settingsGroupCard}>
          <SettingsToggleRow
            styles={sharedStyles}
            title="Ramka obrazu"
            description="Pokazuj obramowanie wokół obrazka na fiszce."
            value={imageFrameEnabled}
            onPress={() => onToggleImageFrame?.(!imageFrameEnabled)}
            accessibilityLabel="Przełącz ramkę obrazu"
          />
        </View>
      ) : null}
    </View>
  );
}
