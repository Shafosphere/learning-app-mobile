import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { BoxZeroAnswerSide } from "@/src/contexts/settings/types";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { useStyles } from "./SettingsChoiceCard-styles";
import { SettingsChoiceCard } from "./SettingsChoiceCard";

type BoxZeroSettingsSectionProps = {
  boxZeroEnabled: boolean;
  boxZeroAnswerSide?: BoxZeroAnswerSide;
  onSelectBoxZeroAnswerSide?: (side: BoxZeroAnswerSide) => void;
};

const COPY = "components.courseEditor.settingsCourse";

export function BoxZeroSettingsSection({
  boxZeroEnabled,
  boxZeroAnswerSide = "back",
  onSelectBoxZeroAnswerSide,
}: BoxZeroSettingsSectionProps) {
  const { t } = useTranslation();
  const shared = useStyles();

  if (!boxZeroEnabled) return null;

  return (
    <View style={shared.section}>
      <View style={shared.optionText}>
        <Text accessibilityRole="header" style={shared.optionTitle}>
          {t(`${COPY}.boxZeroAnswerSide.title`)}
        </Text>
        <Text style={shared.description}>
          {preventWidowsPl(t(`${COPY}.boxZeroAnswerSide.description`))}
        </Text>
      </View>
      <View style={shared.row}>
        {(["front", "back"] as const).map((side) => {
          const selected = boxZeroAnswerSide === side;
          const title = t(`${COPY}.boxZeroAnswerSide.${side}`);
          const description = t(`${COPY}.boxZeroAnswerSide.${side}Description`);
          return (
            <SettingsChoiceCard
              key={side}
              title={title}
              description={description}
              accessibilityLabel={`${t(`${COPY}.boxZeroAnswerSide.title`)}, ${title}, ${description}`}
              icon={side === "front" ? "document-text-outline" : "reader-outline"}
              accent="teal"
              selected={selected}
              onPress={onSelectBoxZeroAnswerSide ? () => onSelectBoxZeroAnswerSide(side) : undefined}
              emphasizeSelectedBorder
            />
          );
        })}
      </View>
    </View>
  );
}
