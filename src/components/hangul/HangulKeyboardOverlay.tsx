import React from "react";
import { Modal, Pressable, View, type ModalProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HangulKeyboard, {
  type HangulKeyboardProps,
} from "@/src/components/hangul/HangulKeyboard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

const useStyles = createThemeStylesHook((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#D1D5DB",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 5,
  },
}));

export type HangulKeyboardOverlayProps = HangulKeyboardProps & {
  visible: boolean;
  onRequestClose?: ModalProps["onRequestClose"];
};

export function HangulKeyboardOverlay({
  visible,
  onRequestClose,
  ...keyboardProps
}: HangulKeyboardOverlayProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const NAVBAR_HEIGHT = 72;
  const bottomOffset = NAVBAR_HEIGHT + insets.bottom - 40;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View
        style={[styles.overlay, { paddingBottom: bottomOffset }]}
        pointerEvents="box-none"
      >
        <Pressable style={styles.dismissArea} onPress={onRequestClose} />

        <View style={[styles.sheet, { marginBottom: 8 }]}>
          <HangulKeyboard {...keyboardProps} />
        </View>
      </View>
    </Modal>
  );
}
