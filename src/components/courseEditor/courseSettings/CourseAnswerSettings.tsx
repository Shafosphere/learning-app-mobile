import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CourseSettingsSectionProps } from "./types";
import {
  SettingsToggleRow,
  SettingsChoiceBlock,
  type SharedStyles,
} from "./SettingsControls";
import { DEFAULT_LETTER_HINT_SETTINGS } from "@/src/utils/letterHints";
import { LetterHintControls } from "../LetterHintControls";
import type { TFunction } from "i18next";
import type { TrueFalseButtonsVariant } from "@/src/contexts/SettingsContext";

type ChoiceOption<T extends string> = {
  key: T;
  title: string;
  subtitle: string;
};

const buildTrueFalseOptions = (
  t: TFunction,
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

type Props = Pick<
  CourseSettingsSectionProps,
  | "styles"
  | "colors"
  | "letterHintSettings"
  | "onChangeLetterHintSettings"
  | "letterHintSettingsDisabled"
  | "hideSkipCorrectionOption"
  | "skipCorrectionLocked"
  | "skipCorrectionEnabled"
  | "onToggleSkipCorrection"
  | "showExplanationEnabled"
  | "onToggleShowExplanation"
  | "explanationOnlyOnWrong"
  | "onToggleExplanationOnlyOnWrong"
  | "showTrueFalseButtonsVariant"
  | "trueFalseButtonsVariant"
  | "onSelectTrueFalseButtonsVariant"
>;

export function CourseAnswerSettings({
  styles,
  colors,
  letterHintSettings = DEFAULT_LETTER_HINT_SETTINGS,
  onChangeLetterHintSettings,
  letterHintSettingsDisabled = false,
  hideSkipCorrectionOption = false,
  skipCorrectionLocked = false,
  skipCorrectionEnabled,
  onToggleSkipCorrection,
  showExplanationEnabled,
  onToggleShowExplanation,
  explanationOnlyOnWrong,
  onToggleExplanationOnlyOnWrong,
  showTrueFalseButtonsVariant = false,
  trueFalseButtonsVariant,
  onSelectTrueFalseButtonsVariant,
}: Props) {
  const { t } = useTranslation();
  const sharedStyles = styles as SharedStyles;
  const trueFalseOptions = buildTrueFalseOptions(t);
  const showLetterHintControls = Boolean(
    onChangeLetterHintSettings && letterHintSettings.enabled,
  );
  return (
    <View
      testID="course-answer-settings"
      style={sharedStyles.settingsGroupCard}
    >
      {onChangeLetterHintSettings ? (
        <>
          <SettingsToggleRow
            styles={sharedStyles}
            title={t("courseLetterHints.title")}
            description={t("courseLetterHints.description")}
            value={letterHintSettings.enabled}
            onPress={() =>
              onChangeLetterHintSettings({
                ...letterHintSettings,
                enabled: !letterHintSettings.enabled,
              })
            }
            accessibilityLabel={t("courseLetterHints.toggleLabel")}
            disabled={letterHintSettingsDisabled}
          />
          <LetterHintControls
            expanded={showLetterHintControls}
            settings={letterHintSettings}
            onChange={onChangeLetterHintSettings}
            colors={colors}
            disabled={letterHintSettingsDisabled}
          />
        </>
      ) : null}
      {!hideSkipCorrectionOption ? (
        <>
          {onChangeLetterHintSettings ? (
            <View style={sharedStyles.settingsGroupDivider} />
          ) : null}
          <SettingsToggleRow
            styles={sharedStyles}
            title={t(
              "components.courseEditor.settingsCourse.title.pominPoprawkePoBledzie",
            )}
            description={t(
              "components.courseEditor.settingsCourse.description.poZlejOdpowiedzi",
            )}
            value={skipCorrectionLocked ? true : skipCorrectionEnabled}
            onPress={() => {
              if (!skipCorrectionLocked) {
                onToggleSkipCorrection(!skipCorrectionEnabled);
              }
            }}
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczPomijaniePoprawkiPoBledzie",
            )}
            disabled={skipCorrectionLocked}
            dimmed={skipCorrectionLocked}
          />
        </>
      ) : null}
      {onChangeLetterHintSettings || !hideSkipCorrectionOption ? (
        <View style={sharedStyles.settingsGroupDivider} />
      ) : null}
      <SettingsToggleRow
        styles={sharedStyles}
        title={t(
          "components.courseEditor.settingsCourse.title.wyswietlajWyjasnienie",
        )}
        description={t(
          "components.courseEditor.settingsCourse.description.pokazujWyjasnienie",
        )}
        value={showExplanationEnabled}
        onPress={() => onToggleShowExplanation(!showExplanationEnabled)}
        accessibilityLabel={t(
          "components.courseEditor.settingsCourse.accessibilityLabel.przelaczWyswietlanieWyjasnien",
        )}
      />
      {showExplanationEnabled ? (
        <SettingsToggleRow
          styles={sharedStyles}
          title={t(
            "components.courseEditor.settingsCourse.title.tylkoPoBlednejOdpowiedzi",
          )}
          description={t(
            "components.courseEditor.settingsCourse.description.gdyWylaczone",
          )}
          value={explanationOnlyOnWrong}
          onPress={() =>
            onToggleExplanationOnlyOnWrong(!explanationOnlyOnWrong)
          }
          accessibilityLabel={t(
            "components.courseEditor.settingsCourse.accessibilityLabel.przelaczWyjasnienieTylkoPoBlednej",
          )}
          dependent
        />
      ) : null}
      {showTrueFalseButtonsVariant ? (
        <>
          <View style={sharedStyles.settingsGroupDivider} />
          <SettingsChoiceBlock
            styles={sharedStyles}
            title={t(
              "components.courseEditor.settingsCourse.title.rodzajPrzyciskowWPrawdaFalsz",
            )}
            description={t(
              "components.courseEditor.settingsCourse.description.wybierzNapisyPrzyciskow",
            )}
            options={trueFalseOptions}
            value={trueFalseButtonsVariant}
            onSelect={onSelectTrueFalseButtonsVariant}
          />
        </>
      ) : null}
    </View>
  );
}
