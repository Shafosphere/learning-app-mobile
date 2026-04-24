import MyButton from "@/src/components/button/button";
import Octicons from "@expo/vector-icons/Octicons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useWikiPeekStyles } from "./WikiPeek-styles";

type WikiPeekProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onConfirm: () => void;
  okEnabled?: boolean;
  content?: React.ReactNode;
};

export function WikiPeek({
  visible,
  title,
  subtitle,
  onClose,
  onConfirm,
  okEnabled = true,
  content,
}: WikiPeekProps) {
  const styles = useWikiPeekStyles();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();

  const sheetWidth = Math.min(width - 32, 480);
  const sheetHeight = Math.min(height - 32, Math.max(360, height * 0.75));

  useEffect(() => {
    if (!visible) return;

    scaleAnim.setValue(0.9);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim, visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.dialog,
            {
              width: sheetWidth,
              height: sheetHeight,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Zamknij"
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Octicons name="x" size={18} color={styles.closeIcon.color} />
              </Pressable>
            </View>
          </View>

          <View style={styles.metaBar} />
          <View style={styles.body}>
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
            <View style={styles.footer}>
              <MyButton
                text="OK"
                onPress={okEnabled ? onConfirm : undefined}
                color="my_green"
                disabled={!okEnabled}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
