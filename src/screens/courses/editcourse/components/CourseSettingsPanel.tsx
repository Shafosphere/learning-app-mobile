import MyButton from "@/src/components/button/button";
import { CourseSettingsSection, type CourseSettingsSectionProps } from "@/src/screens/courses/editcourse/components/SettingsCourse";
import type { ThemeColorKey } from "@/src/theme/theme";
import { Text, View } from "react-native";

type CourseSettingsResetAction = {
  key: string;
  title: string;
  subtitle: string;
  ctaText: string;
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

export function CourseSettingsPanel({
  styles,
  settingsProps,
  resetActions = [],
}: Props) {
  const { toggleRow, toggleTextWrapper, toggleTitle, toggleSubtitle } =
    styles as {
      toggleRow: object;
      toggleTextWrapper: object;
      toggleTitle: object;
      toggleSubtitle: object;
    };

  return (
    <>
      <CourseSettingsSection {...settingsProps} />
      {resetActions.map((action) => (
        <View key={action.key} style={toggleRow}>
          <View style={toggleTextWrapper}>
            <Text style={toggleTitle}>{action.title}</Text>
            <Text style={toggleSubtitle}>{action.subtitle}</Text>
          </View>
          <MyButton
            text={action.loading ? "Resetuję..." : action.ctaText}
            color={action.buttonColor ?? "my_red"}
            onPress={action.onPress}
            disabled={action.disabled ?? false}
            width={action.buttonWidth ?? 150}
          />
        </View>
      ))}
    </>
  );
}
