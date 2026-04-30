import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { Pressable, Text, View } from "react-native";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
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
  titleStyle?: object;
};

const buildTrueFalseOptions = (
  t: TFunction
): ChoiceOption<TrueFalseButtonsVariant>[] => [
  {
    key: "true_false",
    title: t("components.courseEditor.settingsCourse.title.stwierdzenie"),
    subtitle: t("repeats.cardTypes.trueFalse"),
  },
  {
    key: "know_dont_know",
    title: t("components.courseEditor.settingsCourse.title.opanowanie"),
    subtitle: t("repeats.cardTypes.knowDontKnow"),
  },
];

const buildCardSizeOptions = (
  t: TFunction
): ChoiceOption<FlashcardsCardSize>[] => [
  {
    key: "large",
    title: t("components.courseEditor.settingsCourse.title.duza"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.kartaRozszerzaSie"
    ),
  },
  {
    key: "small",
    title: t("components.courseEditor.settingsCourse.title.mala"),
    subtitle: t("components.courseEditor.settingsCourse.subtitle.tekstZostaje"),
  },
];

const buildImageSizeLabels = (
  t: TFunction
): Record<FlashcardsImageSize, { title: string; subtitle: string }> => ({
  dynamic: {
    title: t("components.courseEditor.settingsCourse.title.dynamiczny"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.naturalneProporcje"
    ),
  },
  small: {
    title: t("components.courseEditor.settingsCourse.title.maly"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.czterdziesciProcent"
    ),
  },
  medium: {
    title: t("components.courseEditor.settingsCourse.title.sredni"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.szescdziesiatProcent"
    ),
  },
  large: {
    title: t("components.courseEditor.settingsCourse.title.duzy"),
    subtitle: t("components.courseEditor.settingsCourse.subtitle.stoProcent"),
  },
  very_large: {
    title: t("components.courseEditor.settingsCourse.title.bardzoDuzy"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.stoSiedemdziesiatProcent"
    ),
  },
});

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
  titleStyle,
}: ChoiceBlockProps<T>) {
  return (
    <View style={styles.settingsChoiceBlock}>
      <View style={styles.settingsChoiceHeader}>
        <Text style={titleStyle ?? styles.settingsChoiceTitle}>{title}</Text>
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
  const { t } = useTranslation();
  const sharedStyles = styles as SharedStyles;
  const trueFalseOptions = buildTrueFalseOptions(t);
  const cardSizeOptions = buildCardSizeOptions(t);
  const imageSizeLabels = buildImageSizeLabels(t);

  const imageOptions = (imageSizeOptions ?? [
    "dynamic",
    "small",
    "medium",
    "large",
  ]).map((key) => ({
    key,
    ...imageSizeLabels[key],
  }));
  const shouldShowAnswersSection =
    !hideSkipCorrectionOption || showTrueFalseButtonsVariant;

  return (
    <View style={sharedStyles.sectionGroup}>
      <Text style={sharedStyles.settingsGroupLabel}>
        {t("components.courseEditor.settingsCourse.textChild.przeplyw")}
      </Text>
      <View style={sharedStyles.settingsGroupCard}>
        <View style={sharedStyles.settingsGroupRows}>
          <SettingsToggleRow
            styles={sharedStyles}
            title={t(
              "components.courseEditor.settingsCourse.title.fazaZapoznaniaPudelko0"
            )}
            description={t(
              "components.courseEditor.settingsCourse.description.dodatkowePudelko"
            )}
            value={boxZeroEnabled}
            onPress={() => onToggleBoxZero(!boxZeroEnabled)}
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczFazeZapoznania"
            )}
          />
          <View style={sharedStyles.settingsGroupDivider} />
          <SettingsToggleRow
            styles={sharedStyles}
            title={t("components.courseEditor.settingsCourse.title.automatFiszek")}
            description={t(
              "components.courseEditor.settingsCourse.description.automatyczniePrzelaczaj"
            )}
            value={autoflowEnabled}
            onPress={() => onToggleAutoflow(!autoflowEnabled)}
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczAutomatFiszek"
            )}
          />
          <View style={sharedStyles.settingsGroupDivider} />
          <SettingsToggleRow
            styles={sharedStyles}
            title={t("components.courseEditor.settingsCourse.title.wlaczPowtorki")}
            description={t(
              "components.courseEditor.settingsCourse.description.dodajFiszkiDoPowtorek"
            )}
            value={reviewsEnabled}
            onPress={() => onToggleReviews(!reviewsEnabled)}
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczPowtorki"
            )}
          />
        </View>
      </View>

      <Text style={sharedStyles.settingsGroupLabel}>
        {t("components.courseEditor.settingsCourse.textChild.wyjasnienia")}
      </Text>
      <View style={sharedStyles.settingsGroupCard}>
        <View style={sharedStyles.settingsGroupRows}>
          <SettingsToggleRow
            styles={sharedStyles}
            title={t(
              "components.courseEditor.settingsCourse.title.wyswietlajWyjasnienie"
            )}
            description={t(
              "components.courseEditor.settingsCourse.description.pokazujWyjasnienie"
            )}
            value={showExplanationEnabled}
            onPress={() => onToggleShowExplanation(!showExplanationEnabled)}
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczWyswietlanieWyjasnien"
            )}
          />
          <View style={sharedStyles.settingsGroupDivider} />
          <SettingsToggleRow
            styles={sharedStyles}
            title={t(
              "components.courseEditor.settingsCourse.title.tylkoPoBlednejOdpowiedzi"
            )}
            description={t(
              "components.courseEditor.settingsCourse.description.gdyWylaczone"
            )}
            value={showExplanationEnabled ? explanationOnlyOnWrong : false}
            onPress={() =>
              onToggleExplanationOnlyOnWrong(
                !(showExplanationEnabled ? explanationOnlyOnWrong : false)
              )
            }
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczWyjasnienieTylkoPoBlednej"
            )}
            disabled={!showExplanationEnabled}
            dependent
            dimmed={!showExplanationEnabled}
          />
        </View>
      </View>

      {shouldShowAnswersSection ? (
        <>
          <Text style={sharedStyles.settingsGroupLabel}>
            {t("components.courseEditor.settingsCourse.textChild.odpowiedzi")}
          </Text>
          {!hideSkipCorrectionOption ? (
            <View style={sharedStyles.settingsGroupCard}>
              <SettingsToggleRow
                styles={sharedStyles}
                title={t(
                  "components.courseEditor.settingsCourse.title.pominPoprawkePoBledzie"
                )}
                description={t(
                  "components.courseEditor.settingsCourse.description.poZlejOdpowiedzi"
                )}
                value={skipCorrectionLocked ? true : skipCorrectionEnabled}
                onPress={() =>
                  skipCorrectionLocked
                    ? undefined
                    : onToggleSkipCorrection(
                        !(skipCorrectionLocked ? true : skipCorrectionEnabled)
                      )
                }
                accessibilityLabel={t(
                  "components.courseEditor.settingsCourse.accessibilityLabel.przelaczPomijaniePoprawkiPoBledzie"
                )}
                disabled={skipCorrectionLocked}
                dimmed={skipCorrectionLocked}
              />
            </View>
          ) : null}

          {showTrueFalseButtonsVariant ? (
            <SettingsChoiceBlock
              styles={sharedStyles}
              title={t(
                "components.courseEditor.settingsCourse.title.rodzajPrzyciskowWPrawdaFalsz"
              )}
              description={t(
                "components.courseEditor.settingsCourse.description.wybierzNapisyPrzyciskow"
              )}
              options={trueFalseOptions}
              value={trueFalseButtonsVariant}
              onSelect={onSelectTrueFalseButtonsVariant}
            />
          ) : null}
        </>
      ) : null}

      <SettingsChoiceBlock
        styles={sharedStyles}
        title={t("components.courseEditor.settingsCourse.title.rozmiarFiszki")}
        titleStyle={sharedStyles.settingsGroupLabel}
        description={t(
          "components.courseEditor.settingsCourse.description.zmienWielkoscKarty"
        )}
        options={cardSizeOptions}
        value={cardSize}
        onSelect={onSelectCardSize}
      />

      {showImageSizeOptions ? (
        <SettingsChoiceBlock
          styles={sharedStyles}
          title={t("components.courseEditor.settingsCourse.title.rozmiarObrazu")}
          titleStyle={sharedStyles.settingsGroupLabel}
          description={t(
            "components.courseEditor.settingsCourse.description.dopasujWysokosc"
          )}
          hint={
            imageSizeEnabled
              ? undefined
              : t(
                  "components.courseEditor.settingsCourse.hint.dostepneTylkoDlaDuzych"
                )
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
            title={t("components.courseEditor.settingsCourse.title.ramkaObrazu")}
            description={t(
              "components.courseEditor.settingsCourse.description.pokazujObramowanie"
            )}
            value={imageFrameEnabled}
            onPress={() => onToggleImageFrame?.(!imageFrameEnabled)}
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczRamkeObrazu"
            )}
          />
        </View>
      ) : null}
    </View>
  );
}
