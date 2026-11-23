import { useId, useMemo, useState } from "react";
import { Modal, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureViewer, useGestureViewerController } from "react-native-gesture-image-viewer";

import type { CardPreviewImage } from "./imagePreviewContext";
import { fitPreviewImage, isOutsidePreviewImage } from "./imagePreviewGeometry";
import { PromptImageContent } from "./subcomponents/PromptImageContent";

function PreviewContent({ image, onClose }: { image: CardPreviewImage; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const id = useId();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [revision, setRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  const viewerId = `${id}:${viewport.width}:${viewport.height}:${revision}`;
  const controller = useGestureViewerController(viewerId);
  const size = fitPreviewImage(image.ratio, viewport.width, viewport.height);
  const data = useMemo(() => [image], [image]);

  return (
    <View style={styles.overlay} accessibilityViewIsModal testID="card-image-preview">
      <StatusBar barStyle="light-content" />
      <View style={[styles.toolbar, { paddingTop: insets.top + 8, paddingRight: insets.right + 12, paddingLeft: insets.left + 12 }]}>
        <Text style={styles.title}>{t("cardImagePreview.title")}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("cardImagePreview.close")} onPress={onClose} style={styles.button}>
          <Text style={styles.label}>✕</Text>
        </Pressable>
      </View>
      <View
        style={styles.viewport}
        onLayout={({ nativeEvent: { layout } }) => {
          setViewport((current) => current.width === layout.width && current.height === layout.height
            ? current : { width: layout.width, height: layout.height });
        }}
      >
        {viewport.width > 0 && viewport.height > 0 && !failed ? (
          <GestureViewer
            key={viewerId}
            id={viewerId}
            data={data}
            width={viewport.width}
            height={viewport.height}
            maxZoomScale={6}
            horizontalSwipe={{ enabled: false }}
            dismiss={{ enabled: false }}
            backdropStyle={{ backgroundColor: "transparent" }}
            getItemDimensions={() => size}
            renderItem={(item) => (
              <View style={size}>
                <PromptImageContent image={item} onError={() => setFailed(true)} />
              </View>
            )}
            onSingleTap={(event) => {
              if (event.contentX != null && event.contentY != null &&
                  isOutsidePreviewImage(event.contentX, event.contentY, size, viewport)) onClose();
            }}
          />
        ) : failed ? <Text style={styles.error}>{t("cardImagePreview.unavailable")}</Text> : null}
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}>
        <Text style={styles.hint}>{t("cardImagePreview.hint")}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("cardImagePreview.rotate")} onPress={() => controller.rotate(90)} style={styles.button} disabled={failed}>
            <Text style={styles.label}>↻ 90°</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("cardImagePreview.reset")} onPress={() => setRevision((value) => value + 1)} style={styles.button} disabled={failed}>
            <Text style={styles.label}>{t("cardImagePreview.reset")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function CardImagePreview({ image, onClose }: { image: CardPreviewImage; onClose: () => void }) {
  return (
    <Modal transparent visible animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <PreviewContent image={image} onClose={onClose} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)" },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  viewport: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  footer: { alignItems: "center", paddingTop: 12, gap: 12 },
  hint: { color: "#FFFFFF", fontSize: 13, textAlign: "center" },
  actions: { flexDirection: "row", gap: 12 },
  button: { minWidth: 48, minHeight: 48, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "#FFFFFF26" },
  label: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  error: { color: "#FFFFFF", textAlign: "center", padding: 24 },
});
