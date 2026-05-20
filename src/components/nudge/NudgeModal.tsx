import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
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
  onConfirm: () => void;
  onClose: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
};

export function NudgeModal({
  visible,
  title,
  description,
  children,
  confirmLabel,
  confirmDisabled = false,
  onConfirm,
  onClose,
  secondaryLabel,
  onSecondaryPress,
}: NudgeModalProps) {
  const styles = useStyles();
  const { colors } = useSettings();
  const hasSecondaryAction = secondaryLabel != null && onSecondaryPress != null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={colors.lightbg} />
          </Pressable>

          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {children ? <View style={styles.content}>{children}</View> : null}

          <View
            style={[
              styles.actions,
              hasSecondaryAction && styles.actionsWithSecondary,
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
              color="my_green"
              onPress={onConfirm}
              disabled={confirmDisabled}
              width={164}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
