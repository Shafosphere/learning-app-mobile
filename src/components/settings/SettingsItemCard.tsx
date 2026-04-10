import React, { type ReactNode } from "react";
import { Text, View } from "react-native";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";

type SettingsItemCardProps = {
  title: string;
  description?: string;
  meta?: string;
  status?: string;
  control?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  active?: boolean;
};

export default function SettingsItemCard({
  title,
  description,
  meta,
  status,
  control,
  children,
  compact = false,
  active = false,
}: SettingsItemCardProps) {
  const styles = useStyles();

  return (
    <View
      style={[
        styles.settingItemCard,
        compact && styles.settingItemCardCompact,
        active && styles.settingItemCardActive,
      ]}
    >
      <View style={styles.settingItemInline}>
        <View style={styles.settingHeaderBlock}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description ? (
            <Text style={styles.settingDescription}>{description}</Text>
          ) : null}
          {meta ? <Text style={styles.settingMeta}>{meta}</Text> : null}
          {status ? <Text style={styles.settingStatus}>{status}</Text> : null}
        </View>
        {control ? <View style={styles.settingControlInline}>{control}</View> : null}
      </View>

      {children}
    </View>
  );
}
