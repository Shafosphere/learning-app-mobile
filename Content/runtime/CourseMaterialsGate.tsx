import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import { getCustomCourseById } from "@/src/db/sqlite/db";
import { usesImagePAD } from "./images";
import { getCourseImagePacks } from "./catalog";
import { getCourseDownload, refreshCourse } from "./courseDownloads";
import {
  previewMissingImagePacks,
  subscribePackDownloads,
} from "./packDownloads";
import { CourseImageDownloadRow } from "./CourseImageDownloadRow";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import { Image } from "expo-image";
import Animated from "react-native-reanimated";
import { useCourseMaterialsEntrance } from "./useCourseMaterialsEntrance";

const AnimatedImage = Animated.createAnimatedComponent(Image);
const Beard = require("../../assets/mascot/box/props/broda.webp");
const Hair = require("../../assets/mascot/box/props/wlosy.webp");
const Easel = require("../../assets/mascot/box/props/sztaluga.webp");

export function CourseMaterialsGate({
  courseId,
  children,
  previewMissingImages = false,
}: {
  courseId: number | null;
  children: ReactNode;
  previewMissingImages?: boolean;
}) {
  const preview = __DEV__ && previewMissingImages;
  return (usesImagePAD || preview) && courseId != null ? (
    <NativeGate
      key={`${courseId}:${preview}`}
      courseId={courseId}
      previewMissingImages={preview}
    >
      {children}
    </NativeGate>
  ) : (
    <>{children}</>
  );
}
function NativeGate({
  courseId,
  children,
  previewMissingImages,
}: {
  courseId: number;
  children: ReactNode;
  previewMissingImages: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useThemeSettings();
  const window = useWindowDimensions();
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const [copyHeight, setCopyHeight] = useState<number | null>(null);
  const [actionsHeight, setActionsHeight] = useState<number | null>(null);
  const availableWidth = viewport?.width ?? window.width;
  const availableHeight = viewport?.height ?? window.height;
  const tablet = Math.min(window.width, window.height) >= 600;
  const contentWidth = Math.min(tablet ? 360 : 288, Math.max(0, availableWidth - 48));
  const compact = availableHeight < 480;
  const verticalPadding = compact ? 16 : tablet ? 40 : 32;
  const artworkGap = compact ? 12 : tablet ? 32 : 24;
  // Reserve space for the actual text and download state before sizing the art.
  // The gate's viewport already excludes navigation; large text can still scroll.
  const artworkHeight = availableHeight - verticalPadding * 2 - artworkGap
    - (copyHeight ?? (tablet ? 124 : 113)) - (actionsHeight ?? 54);
  const artworkScale = Math.min(
    contentWidth / 288,
    Math.max(0.28, artworkHeight / 252),
  );
  const [course, setCourse] = useState<{
    slug: string | null;
    name: string;
  } | null>(null);
  const [loadedArtwork, setLoadedArtwork] = useState(0);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [needsDownload, setNeedsDownload] = useState(false);
  const restorePreview = useRef<(() => void) | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      restorePreview.current?.();
      restorePreview.current = null;
    };
  }, []);
  const slug = course?.slug ?? "";
  const snapshot = useSyncExternalStore(
    subscribePackDownloads,
    useCallback(() => getCourseDownload(slug), [slug]),
  );
  const check = useCallback(async () => {
    setError(false);
    try {
      const record = await getCustomCourseById(courseId);
      if (!mounted.current) return;
      if (!record) throw new Error("Course not found");
      const current = {
        slug: record.isOfficial ? (record.slug ?? null) : null,
        name: record.name,
      };
      setCourse(current);
      const required = getCourseImagePacks(current.slug);
      if (previewMissingImages && !restorePreview.current) {
        restorePreview.current = previewMissingImagePacks(required);
      }
      if (required.length) {
        await refreshCourse(current.slug!);
        if (getCourseDownload(current.slug!).phase !== "ready") {
          setNeedsDownload(true);
          setAdmitted(false);
        }
      }
      setChecked(true);
    } catch {
      setError(true);
    }
  }, [courseId, previewMissingImages]);
  useEffect(() => {
    void check();
  }, [check]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void check();
      }
    });
    return () => sub.remove();
  }, [check]);
  const noRequirements = course && !getCourseImagePacks(course.slug).length;
  const ready = snapshot.phase === "ready";
  useEffect(() => {
    if (checked && course && !noRequirements && !ready) {
      setNeedsDownload(true);
      setAdmitted(false);
    }
  }, [checked, course, noRequirements, ready]);
  const entrance = useCourseMaterialsEntrance(checked && !error && loadedArtwork === 7);
  if (
    checked &&
    !error &&
    (noRequirements || (ready && (!needsDownload || admitted)))
  )
    return <>{children}</>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.screen, { paddingVertical: verticalPadding }]}
      onLayout={({ nativeEvent: { layout } }) => {
        setViewport(previous => previous?.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height });
      }}
    >
      {error ? (
        <>
          <Text style={{ color: colors.paragraph }}>
            {t("contentDownload.lookupError")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void check();
            }}
            style={{ padding: 16 }}
          >
            <Text style={{ color: colors.headline }}>
              {t("audioDownload.retry")}
            </Text>
          </Pressable>
        </>
      ) : !checked ? (
        <ActivityIndicator color={colors.headline} />
      ) : (
        <>
          <View style={[styles.content, { maxWidth: tablet ? 480 : 380 }]}>
            <View style={{ width: 288 * artworkScale, height: 252 * artworkScale, marginBottom: artworkGap }}>
            <View
              style={[styles.illustration, { transform: [{ scale: artworkScale }] }]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <AnimatedImage
                source={Easel}
                style={[styles.easel, entrance.easelAnimatedStyle]}
                contentFit="contain"
                onLoad={() => setLoadedArtwork(previous => previous | 1)}
              />
              <View style={styles.artist}>
                <Animated.View style={entrance.artistAnimatedStyle}>
                  <BoxSkin
                    wordCount={0}
                    face="nice"
                    faceParts={{ mouth: "happy" }}
                    // Local adjustment for the beard; increase to lower the mouth.
                    mouthOffsetY={3}
                    showFace
                    accessible={false}
                    content={<></>}
                  />
                  <AnimatedImage
                    source={Hair}
                    style={[styles.hair, entrance.hairAnimatedStyle]}
                    contentFit="contain"
                    onLoad={() => setLoadedArtwork(previous => previous | 2)}
                  />
                  <AnimatedImage
                    source={Beard}
                    style={[styles.beard, entrance.beardAnimatedStyle]}
                    contentFit="contain"
                    onLoad={() => setLoadedArtwork(previous => previous | 4)}
                  />
                </Animated.View>
              </View>
            </View>
            </View>
            <View
              style={styles.copy}
              onLayout={({ nativeEvent: { layout } }) => setCopyHeight(layout.height)}
            >
              <Text
                accessibilityRole="header"
                style={[styles.heading, { color: colors.headline, fontSize: tablet ? 30 : availableWidth < 340 ? 24 : 26, lineHeight: tablet ? 38 : 33 }]}
              >
                {t(
                  ready
                    ? "contentDownload.readyTitle"
                    : "contentDownload.missingTitle",
                )}
              </Text>
              <Text style={[styles.description, { color: colors.paragraph, maxWidth: tablet ? 360 : 300, fontSize: tablet ? 17 : 15, lineHeight: tablet ? 26 : 23 }]}>
                {t(
                  ready
                    ? "contentDownload.readyDescription"
                    : "contentDownload.required",
                )}
              </Text>
            </View>
            <View
              style={[styles.downloadActions, { maxWidth: contentWidth }]}
              onLayout={({ nativeEvent: { layout } }) => setActionsHeight(layout.height)}
            >
              <CourseImageDownloadRow
                slug={course?.slug}
                courseName={course?.name ?? ""}
                variant="standalone"
              />
              {ready ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAdmitted(true)}
                  style={({ pressed }) => [
                    styles.startButton,
                    {
                      backgroundColor: colors.my_green,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.startLabel, { color: colors.font }]}>
                    {t("contentDownload.start")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: { width: "100%", maxWidth: 380, alignItems: "center" },
  copy: { width: "100%", alignItems: "center" },
  illustration: { width: 288, height: 252, transformOrigin: "top left" },
  easel: {
    position: "absolute",
    width: 160,
    height: 218,
    right: 0,
    bottom: 16,
  },
  artist: {
    position: "absolute",
    left: 27,
    bottom: 25,
    width: 115,
    height: 122,
    transform: [{ scale: 1.35 }],
  },
  hair: { position: "absolute", width: 78*1.7, height: 71.3*1.7, left: -1, top: -10 },
  beard: { position: "absolute", width: 78*1.5, height: 71.3*1.5, left: 15, top: 10, zIndex: 1001 },
  heading: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 24,
  },
  downloadActions: {
    width: "100%",
    maxWidth: 288,
    alignSelf: "center",
    gap: 16,
  },
  startButton: {
    minHeight: 54,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  startLabel: { fontSize: 16, fontWeight: "700" },
});
