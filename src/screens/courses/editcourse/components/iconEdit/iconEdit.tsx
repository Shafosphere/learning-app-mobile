import {
  COURSE_ICONS,
  CourseColorOption,
  getCourseIconById,
} from "@/src/constants/customCourse";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { TrackSlider } from "@/src/components/slider/TrackSlider";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Octicons from "@expo/vector-icons/Octicons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useStyles } from "./iconEdit-styles";

const MAX_HUE = 360;
const MAX_SATURATION = 100;
const MAX_VALUE = 100;

const ICON_CATEGORY_OPTIONS = [
  { id: "all", label: "Wszystkie" },
  { id: "general", label: "Ogólne" },
  { id: "science", label: "Nauka" },
  { id: "tech", label: "Tech" },
  { id: "travel", label: "Podróże" },
  { id: "lifestyle", label: "Styl życia" },
  { id: "sport", label: "Sport" },
] as const;

type IconCategoryFilter = (typeof ICON_CATEGORY_OPTIONS)[number]["id"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface HsvColor {
  h: number;
  s: number;
  v: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hsvToRgb({ h, s, v }: HsvColor) {
  const saturation = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);
  const hue = ((h % 360) + 360) % 360;

  const c = value * saturation;
  const hh = hue / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh >= 0 && hh < 1) {
    r = c;
    g = x;
  } else if (hh >= 1 && hh < 2) {
    r = x;
    g = c;
  } else if (hh >= 2 && hh < 3) {
    g = c;
    b = x;
  } else if (hh >= 3 && hh < 4) {
    g = x;
    b = c;
  } else if (hh >= 4 && hh < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const m = value - c;
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

function hsvToHex(hsv: HsvColor): string {
  const rgb = hsvToRgb(hsv);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function hexToHsv(hexColor: string): HsvColor {
  const hex = hexColor.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return { h: 0, s: 0, v: 0 };
  }

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }

  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

interface CourseIconColorSelectorStyles {
  container?: StyleProp<ViewStyle>;
}

interface CourseIconColorSelectorProps {
  courseName?: string;
  onCourseNameChange?: (value: string) => void;
  selectedIcon: string | null;
  selectedColor: string;
  selectedColorId?: string | null;
  onIconChange: (iconId: string) => void;
  onColorChange: (color: CourseColorOption) => void;
  onColorHexChange?: (hex: string) => void;
  disabled?: boolean;
  nameEditable?: boolean;
  namePlaceholder?: string;
  styles?: CourseIconColorSelectorStyles;
  iconSize?: number;
  previewName?: string;
  nameSectionDescription?: string;
  iconSectionDescription?: string;
  colorSectionDescription?: string;
  enableIconSearch?: boolean;
  nameValidationState?: "none" | "duplicate" | "similar";
  nameValidationMessage?: string | null;
}

function CourseIconColorSelectorComponent({
  courseName,
  onCourseNameChange,
  selectedIcon,
  selectedColor,
  onIconChange,
  onColorChange,
  onColorHexChange,
  disabled = false,
  nameEditable = true,
  namePlaceholder = "np. Fiszki podróżnicze",
  styles,
  previewName,
  nameSectionDescription = "Krótko i konkretnie, np. „Fiszki podróżnicze”.",
  iconSectionDescription = "Wybierz ikonę z listy",
  colorSectionDescription = "Wybierz swój kolor",
  enableIconSearch = true,
  nameValidationState = "none",
  nameValidationMessage = null,
}: CourseIconColorSelectorProps) {
  const componentStyles = useStyles();
  const { colors } = useSettings();
  const [isIconSheetOpen, setIsIconSheetOpen] = useState(false);
  const [isColorSheetOpen, setIsColorSheetOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [activeIconCategory, setActiveIconCategory] =
    useState<IconCategoryFilter>("all");
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(selectedColor));
  const [svPlaneSize, setSvPlaneSize] = useState({ width: 0, height: 0 });
  const [isSvDragging, setIsSvDragging] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasColorSheetOpenRef = useRef(false);
  const gradientIds = useMemo(() => {
    const suffix = Math.random().toString(36).slice(2, 10);
    return {
      svSaturation: `svSaturation-${suffix}`,
      svValue: `svValue-${suffix}`,
    };
  }, []);

  const selectedIconMeta = useMemo(
    () => getCourseIconById(selectedIcon) ?? COURSE_ICONS[0] ?? null,
    [selectedIcon]
  );

  const normalizedSearch = iconSearch.trim().toLowerCase();
  const filteredIcons = useMemo(() => {
    return COURSE_ICONS.filter((icon) => {
      const categoryMatch =
        activeIconCategory === "all" || icon.category === activeIconCategory;
      if (!categoryMatch) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchValue = `${icon.id} ${icon.name}`.toLowerCase();
      return searchValue.includes(normalizedSearch);
    });
  }, [activeIconCategory, normalizedSearch]);

  const previewTitle = previewName?.trim() || "Nowy kurs";
  const selectedHex = selectedColor?.trim() || "#000000";
  const currentHex = useMemo(() => hsvToHex(hsv), [hsv]);
  const hueColorHex = useMemo(() => hsvToHex({ h: hsv.h, s: 1, v: 1 }), [hsv.h]);
  const isNameEditable = Boolean(onCourseNameChange) && nameEditable && !disabled;

  useEffect(() => {
    const justOpened = isColorSheetOpen && !wasColorSheetOpenRef.current;
    if (justOpened) {
      setHsv(hexToHsv(selectedColor));
    }
    wasColorSheetOpenRef.current = isColorSheetOpen;
  }, [isColorSheetOpen, selectedColor]);

  const pushColorLive = useCallback(
    (nextHex: string) => {
      const normalizedHex = nextHex.toUpperCase();
      const currentSelected = selectedColor.trim().toUpperCase();
      if (normalizedHex === currentSelected) {
        return;
      }

      if (onColorHexChange) {
        onColorHexChange(normalizedHex);
      } else {
        onColorChange({
          id: "custom",
          label: "Niestandardowy",
          hex: normalizedHex,
        });
      }
    },
    [onColorChange, onColorHexChange, selectedColor]
  );

  useEffect(() => {
    if (!isColorSheetOpen) return;
    if (disabled) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const nextHex = currentHex;
    autoSaveTimeoutRef.current = setTimeout(() => {
      pushColorLive(nextHex);
    }, 80);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentHex, disabled, isColorSheetOpen, pushColorLive]);

  const updateSatAndValueByTouch = useCallback(
    (locationX: number, locationY: number) => {
      const width = svPlaneSize.width;
      const height = svPlaneSize.height;
      if (width <= 0 || height <= 0 || disabled) {
        return;
      }

      const saturation = clamp(locationX / width, 0, 1);
      const value = clamp(1 - locationY / height, 0, 1);

      setHsv((prev) => ({
        ...prev,
        s: saturation,
        v: value,
      }));
    },
    [disabled, svPlaneSize.height, svPlaneSize.width]
  );

  if (!selectedIconMeta) {
    return null;
  }

  const SelectedIconComponent = selectedIconMeta.Component;

  return (
    <View style={[componentStyles.root, styles?.container]}>
      <View style={componentStyles.previewCard}>
        <View style={componentStyles.previewRow}>
          <View style={componentStyles.previewBadge}>
            <View
              style={[
                componentStyles.previewColorOverlay,
                { backgroundColor: selectedHex },
              ]}
            />
            <SelectedIconComponent
              name={selectedIconMeta.name as never}
              size={26}
              color={selectedHex}
            />
          </View>
          <View style={componentStyles.previewTextWrap}>
            <Text numberOfLines={1} style={componentStyles.previewTitle}>
              {previewTitle}
            </Text>
            <View style={componentStyles.previewMetaRow}>
              <View style={componentStyles.pill}>
                <View
                  style={[
                    componentStyles.dot,
                    { backgroundColor: selectedHex },
                  ]}
                />
                <Text style={componentStyles.pillStrong}>
                  {selectedHex.toUpperCase()}
                </Text>
              </View>
              <View style={componentStyles.pill}>
                <Text style={componentStyles.pillLabel}>Ikona:</Text>
                <Text style={componentStyles.pillStrong}>{selectedIconMeta.id}</Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={componentStyles.previewHint}>
          Tip: u góry masz „efekt końcowy”, poniżej ustawienia.
        </Text>
      </View>

      <View style={componentStyles.sectionCard}>
        <View style={componentStyles.sectionHeaderBlock}>
          <Text style={componentStyles.sectionLabel}>NAZWA</Text>
          <Text style={componentStyles.sectionDescription}>
            {nameSectionDescription}
          </Text>
        </View>
        <TextInput
          style={[
            componentStyles.nameInput,
            nameValidationState === "duplicate" && componentStyles.nameInputError,
            nameValidationState === "similar" && componentStyles.nameInputWarning,
          ]}
          value={courseName ?? ""}
          onChangeText={onCourseNameChange}
          placeholder={namePlaceholder}
          placeholderTextColor={componentStyles.nameInput.color}
          accessibilityLabel="Nazwa kursu"
          editable={isNameEditable}
          maxLength={38}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          returnKeyType="done"
          keyboardType="default"
          textContentType="none"
          importantForAutofill="no"
        />
        {nameValidationMessage ? (
          <Text
            style={[
              componentStyles.nameFeedback,
              nameValidationState === "duplicate"
                ? componentStyles.nameFeedbackError
                : componentStyles.nameFeedbackWarning,
            ]}
          >
            {nameValidationMessage}
          </Text>
        ) : null}
      </View>

      <View style={componentStyles.sectionCard}>
        <View style={componentStyles.pickerRow}>
          <View style={componentStyles.pickerLeft}>
            <View style={componentStyles.sectionHeaderBlock}>
              <Text style={componentStyles.sectionLabel}>IKONA</Text>
              <Text style={componentStyles.sectionDescription}>
                {iconSectionDescription}
              </Text>
            </View>

            <View style={componentStyles.chipRow}>
              <View style={componentStyles.chip}>
                <SelectedIconComponent
                  name={selectedIconMeta.name as never}
                  size={16}
                  color={selectedHex}
                />
                <Text style={componentStyles.chipStrong}>Wybrana</Text>
                <Text style={componentStyles.chipMono}>{selectedIconMeta.id}</Text>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zmień ikonę kursu"
            onPress={() => setIsIconSheetOpen(true)}
            disabled={disabled}
            hitSlop={8}
            style={({ pressed }) => [
              componentStyles.changeIconButton,
              pressed && componentStyles.changeButtonPressed,
              disabled && componentStyles.changeIconButtonDisabled,
            ]}
          >
            <FontAwesome6
              name="edit"
              size={18}
              color={componentStyles.changeIconButtonIcon.color}
            />
          </Pressable>
        </View>
      </View>

      <View style={componentStyles.sectionCard}>
        <View style={componentStyles.pickerRow}>
          <View style={componentStyles.pickerLeft}>
            <View style={componentStyles.sectionHeaderBlock}>
              <Text style={componentStyles.sectionLabel}>KOLOR</Text>
              <Text style={componentStyles.sectionDescription}>
                {colorSectionDescription}
              </Text>
            </View>

            <View style={componentStyles.chipRow}>
              <View style={componentStyles.chip}>
                <View
                  style={[
                    componentStyles.dot,
                    { backgroundColor: selectedHex },
                  ]}
                />
                <Text style={componentStyles.chipMono}>{selectedHex.toUpperCase()}</Text>
              </View>
              <View style={componentStyles.chip}>
                <Text style={componentStyles.chipStrong}>Tryb:</Text>
                <Text style={componentStyles.chipMono}>picker</Text>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zmień kolor kursu"
            onPress={() => setIsColorSheetOpen(true)}
            disabled={disabled}
            hitSlop={8}
            style={({ pressed }) => [
              componentStyles.changeIconButton,
              pressed && componentStyles.changeButtonPressed,
              disabled && componentStyles.changeIconButtonDisabled,
            ]}
          >
            <FontAwesome6
              name="edit"
              size={18}
              color={componentStyles.changeIconButtonIcon.color}
            />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isIconSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsIconSheetOpen(false)}
      >
        <Pressable
          style={componentStyles.modalBackdrop}
          onPress={() => setIsIconSheetOpen(false)}
        >
          <Pressable style={componentStyles.sheet} onPress={() => undefined}>
            <View style={componentStyles.sheetGrabber} />
            <View style={componentStyles.sheetHeader}>
              <Text style={componentStyles.sheetTitle}>Wybierz ikonę</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zamknij wybór ikony"
                onPress={() => setIsIconSheetOpen(false)}
                style={({ pressed }) => [
                  componentStyles.closeSquareButton,
                  pressed && componentStyles.changeButtonPressed,
                ]}
              >
                <Octicons
                  name="x"
                  size={18}
                  color={componentStyles.closeSquareIcon.color}
                />
              </Pressable>
            </View>

            <View style={componentStyles.sheetBody}>
              {enableIconSearch ? (
                <TextInput
                  value={iconSearch}
                  onChangeText={setIconSearch}
                  placeholder="Szukaj ikony"
                  placeholderTextColor={componentStyles.searchInput.color}
                  style={componentStyles.searchInput}
                  accessibilityLabel="Szukaj ikony"
                />
              ) : null}
              <View style={componentStyles.categoryRow}>
                {ICON_CATEGORY_OPTIONS.map((category) => {
                  const isActive = category.id === activeIconCategory;
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtr kategorii: ${category.label}`}
                      onPress={() => setActiveIconCategory(category.id)}
                      style={({ pressed }) => [
                        componentStyles.categoryButton,
                        isActive && componentStyles.categoryButtonActive,
                        pressed && componentStyles.iconTilePressed,
                      ]}
                    >
                      <Text
                        style={[
                          componentStyles.categoryButtonText,
                          isActive && componentStyles.categoryButtonTextActive,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ScrollView
              style={componentStyles.iconGridScroll}
              contentContainerStyle={componentStyles.iconGridScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={componentStyles.iconGrid}>
                {filteredIcons.map((icon) => {
                  const IconComponent = icon.Component;
                  const isSelected = icon.id === selectedIconMeta.id;
                  return (
                    <View key={icon.id} style={componentStyles.iconTileCell}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Wybierz ikonę ${icon.id}`}
                        onPress={() => {
                          onIconChange(icon.id);
                          setIsIconSheetOpen(false);
                        }}
                        style={({ pressed }) => [
                          componentStyles.iconTile,
                          isSelected && componentStyles.iconTileSelected,
                          pressed && componentStyles.iconTilePressed,
                        ]}
                      >
                        <IconComponent
                          name={icon.name as never}
                          size={32}
                          color={componentStyles.previewIcon.color}
                        />
                      </Pressable>
                    </View>
                  );
                })}
                {filteredIcons.length === 0 ? (
                  <Text style={componentStyles.emptyStateText}>Brak wyników</Text>
                ) : null}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isColorSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsColorSheetOpen(false)}
      >
        <Pressable
          style={componentStyles.modalBackdrop}
          onPress={() => setIsColorSheetOpen(false)}
        >
          <Pressable style={componentStyles.sheet} onPress={() => undefined}>
            <View style={componentStyles.sheetGrabber} />
            <View style={componentStyles.sheetHeader}>
              <Text style={componentStyles.sheetTitle}>Wybierz kolor</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zamknij wybór koloru"
                onPress={() => setIsColorSheetOpen(false)}
                style={({ pressed }) => [
                  componentStyles.closeSquareButton,
                  pressed && componentStyles.changeButtonPressed,
                ]}
              >
                <Octicons
                  name="x"
                  size={18}
                  color={componentStyles.closeSquareIcon.color}
                />
              </Pressable>
            </View>

            <ScrollView
              style={componentStyles.colorScroll}
              contentContainerStyle={componentStyles.colorScrollContent}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!isSvDragging}
            >
              <View
                style={componentStyles.svPlaneWrap}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setSvPlaneSize({ width, height });
                }}
                onStartShouldSetResponder={() => !disabled}
                onStartShouldSetResponderCapture={() => !disabled}
                onMoveShouldSetResponder={() => !disabled}
                onMoveShouldSetResponderCapture={() => !disabled}
                onResponderTerminationRequest={() => false}
                onResponderGrant={(event) => {
                  setIsSvDragging(true);
                  updateSatAndValueByTouch(
                    event.nativeEvent.locationX,
                    event.nativeEvent.locationY
                  );
                }}
                onResponderMove={(event) => {
                  updateSatAndValueByTouch(
                    event.nativeEvent.locationX,
                    event.nativeEvent.locationY
                  );
                }}
                onResponderRelease={() => {
                  setIsSvDragging(false);
                }}
                onResponderTerminate={() => {
                  setIsSvDragging(false);
                }}
              >
                <Svg width="100%" height="100%" style={componentStyles.svSvg}>
                  <Defs>
                    <LinearGradient
                      id={gradientIds.svSaturation}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <Stop offset="0%" stopColor="#FFFFFF" />
                      <Stop offset="100%" stopColor={hueColorHex} />
                    </LinearGradient>
                    <LinearGradient id={gradientIds.svValue} x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#000000" stopOpacity={0} />
                      <Stop offset="100%" stopColor="#000000" stopOpacity={1} />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill={`url(#${gradientIds.svSaturation})`}
                  />
                  <Rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill={`url(#${gradientIds.svValue})`}
                  />
                  <Circle
                    cx={`${hsv.s * 100}%`}
                    cy={`${(1 - hsv.v) * 100}%`}
                    r="9"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  <Circle
                    cx={`${hsv.s * 100}%`}
                    cy={`${(1 - hsv.v) * 100}%`}
                    r="10"
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth="1"
                    fill="transparent"
                  />
                </Svg>
              </View>

              <View style={componentStyles.sliderGroup}>
                <Text style={componentStyles.sliderLabel}>HUE</Text>
                <TrackSlider
                  testID="hue-slider"
                  value={hsv.h}
                  onValueChange={(value) => {
                    setHsv((prev) => ({ ...prev, h: value }));
                  }}
                  minimumValue={0}
                  maximumValue={MAX_HUE}
                  step={1}
                  mode="rainbow"
                  trackHeight={14}
                  thumbSize={20}
                  thumbBorderWidth={2}
                  thumbColor={hueColorHex}
                  thumbBorderColor={colors.background}
                  style={componentStyles.sliderControl}
                  disabled={disabled}
                />
              </View>

              <View style={componentStyles.sliderGroup}>
                <Text style={componentStyles.sliderLabel}>SATURATION</Text>
                <TrackSlider
                  testID="sat-slider"
                  value={hsv.s * 100}
                  onValueChange={(value) => {
                    setHsv((prev) => ({ ...prev, s: clamp(value / 100, 0, 1) }));
                  }}
                  minimumValue={0}
                  maximumValue={MAX_SATURATION}
                  step={1}
                  mode="solid"
                  trackHeight={14}
                  thumbSize={20}
                  thumbBorderWidth={2}
                  trackColor={colors.background}
                  fillColor={colors.my_green}
                  thumbColor={colors.my_green}
                  thumbBorderColor={colors.background}
                  style={componentStyles.sliderControl}
                  disabled={disabled}
                />
              </View>

              <View style={componentStyles.sliderGroup}>
                <Text style={componentStyles.sliderLabel}>VALUE</Text>
                <TrackSlider
                  testID="val-slider"
                  value={hsv.v * 100}
                  onValueChange={(value) => {
                    setHsv((prev) => ({ ...prev, v: clamp(value / 100, 0, 1) }));
                  }}
                  minimumValue={0}
                  maximumValue={MAX_VALUE}
                  step={1}
                  mode="solid"
                  trackHeight={14}
                  thumbSize={20}
                  thumbBorderWidth={2}
                  trackColor={colors.background}
                  fillColor={colors.my_green}
                  thumbColor={colors.my_green}
                  thumbBorderColor={colors.background}
                  style={componentStyles.sliderControl}
                  disabled={disabled}
                />
              </View>

              <View style={componentStyles.colorActionRow}>
                <View style={componentStyles.colorFooterTextWrap}>
                  <Text style={componentStyles.colorPreviewLabel}>PODGLĄD</Text>
                  <Text style={componentStyles.colorPreviewHex}>{currentHex}</Text>
                </View>
                <View style={componentStyles.colorActionRight}>
                  <View style={componentStyles.colorPreviewBadge}>
                    <SelectedIconComponent
                      name={selectedIconMeta.name as never}
                      size={20}
                      color={currentHex}
                    />
                  </View>
                  <MyButton
                    text="zatwierdź"
                    color="my_green"
                    width={126}
                    disabled={disabled}
                    onPress={() => setIsColorSheetOpen(false)}
                    accessibilityLabel="Zatwierdź wybrany kolor"
                    style={componentStyles.applyMyButton}
                    textStyle={componentStyles.applyMyButtonText}
                  />
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export const CourseIconColorSelector = memo(CourseIconColorSelectorComponent);
