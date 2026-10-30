import type { ThemeColorKey } from "@/src/theme/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "./NudgeModal-styles";

type NudgeModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel: string;
  confirmDisabled?: boolean;
  confirmColor?: ThemeColorKey;
  onConfirm: () => void;
  onClose: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  scrollableContent?: boolean;
  closeLabel?: string;
};

export function NudgeModal({
  visible,
  title,
  description,
  children,
  confirmLabel,
  confirmDisabled = false,
  confirmColor = "my_green",
  onConfirm,
  onClose,
  secondaryLabel,
  onSecondaryPress,
  scrollableContent = true,
  closeLabel,
}: NudgeModalProps) {
  const styles = useStyles();
  const { colors } = useSettings();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const shouldScroll = scrollableContent || height < 480;
  const hasSecondaryAction = secondaryLabel != null && onSecondaryPress != null;
  const content = (
    <>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </>
  );

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, isLandscape && styles.cardLandscape, styles.scrollableCard]}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          >
            <Ionicons name="close" size={18} color={colors.lightbg} />
          </Pressable>

          {shouldScroll ? (
            <ScrollView style={styles.scrollableBody} keyboardShouldPersistTaps="handled">
              {content}
            </ScrollView>
          ) : content}

          <View
            style={[
              styles.actions,
              hasSecondaryAction && styles.actionsWithSecondary,
              shouldScroll && styles.scrollableActions,
            ]}
          >
            {hasSecondaryAction ? (
              <Pressable
                onPress={onSecondaryPress}
                style={styles.secondaryButton}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
              </Pressable>
            ) : null}
            <MyButton
              text={confirmLabel}
              color={confirmColor}
              onPress={onConfirm}
              disabled={confirmDisabled}
              width={hasSecondaryAction ? 164 : "100%"}
              textStyle={shouldScroll ? { color: colors.font } : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
