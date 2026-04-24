import MyButton from "@/src/components/button/button";
import {
  CourseSettingsSection,
  type CourseSettingsSectionProps,
} from "@/src/components/courseEditor/SettingsCourse";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import type { ThemeColorKey } from "@/src/theme/theme";
import { Text, View } from "react-native";

type CourseSettingsResetAction = {
  key: string;
  title: string;
  subtitle: string;
  ctaText: string;
  loadingText?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  buttonWidth?: number;
  buttonColor?: ThemeColorKey;
};

type Props = {
  styles: Record<string, unknown>;
  settingsProps: CourseSettingsSectionProps;
  resetActions?: CourseSettingsResetAction[];
};

type SharedStyles = {
  sectionGroup: object;
  settingsGroupLabel: object;
  settingsActionCard: object;
  settingsActionCardStandalone: object;
  settingsActionCardSections: object;
  settingsActionCardSection: object;
  settingsGroupDivider: object;
  settingsActionCardHeader: object;
  settingsActionCardTitle: object;
  settingsActionCardDescription: object;
  settingsActionCardButtonRow: object;
};

export function CourseSettingsPanel({
  styles,
  settingsProps,
  resetActions = [],
}: Props) {
  const sharedStyles = styles as SharedStyles;

  return (
    <View style={sharedStyles.sectionGroup}>
      <CourseSettingsSection {...settingsProps} />

      {resetActions.length > 0 ? (
        <>
          <Text style={sharedStyles.settingsGroupLabel}>RESET</Text>
          <View
            style={[
              sharedStyles.settingsActionCard,
              sharedStyles.settingsActionCardStandalone,
            ]}
          >
            <View style={sharedStyles.settingsActionCardSections}>
              {resetActions.map((action, index) => (
                <View key={action.key}>
                  {index > 0 ? (
                    <View style={sharedStyles.settingsGroupDivider} />
                  ) : null}
                  <View style={sharedStyles.settingsActionCardSection}>
                    <View style={sharedStyles.settingsActionCardHeader}>
                      <Text style={sharedStyles.settingsActionCardTitle}>
                        {action.title}
                      </Text>
                      <Text style={sharedStyles.settingsActionCardDescription}>
                        {preventWidowsPl(action.subtitle)}
                      </Text>
                    </View>
                    <View style={sharedStyles.settingsActionCardButtonRow}>
                      <MyButton
                        text={
                          action.loading
                            ? (action.loadingText ?? "Trwa operacja...")
                            : action.ctaText
                        }
                        color={action.buttonColor ?? "my_red"}
                        onPress={action.onPress}
                        disabled={action.disabled ?? false}
                        width={action.buttonWidth ?? 130}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
