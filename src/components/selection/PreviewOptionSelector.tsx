import { Image } from "expo-image";
import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useStyles } from "@/src/components/selection/PreviewOptionSelector-styles";

export type PreviewOptionSelectorOption<TKey extends string = string> = {
  key: TKey;
  label: string;
  preview: ImageSourcePropType;
};

type PreviewOptionSelectorProps<TKey extends string = string> = {
  options: PreviewOptionSelectorOption<TKey>[];
  value: TKey;
  onChange: (key: TKey) => void;
  description?: string;
  variant?: "card" | "modal";
  imageFit?: "contain" | "cover";
  previewAspectRatio?: number;
  previewImageScale?: number;
  previewMaxWidth?: number;
  compact?: boolean;
  title?: string;
  testIDPrefix?: string;
};

export function PreviewOptionSelector<TKey extends string = string>({
  options,
  value,
  onChange,
  description,
  variant = "card",
  imageFit = "contain",
  previewAspectRatio = 1.02,
  previewImageScale = 1,
  previewMaxWidth,
  compact = false,
  title,
  testIDPrefix,
}: PreviewOptionSelectorProps<TKey>) {
  const styles = useStyles();
  const selectedOption =
    options.find((option) => option.key === value) ?? options[0] ?? null;

  return (
    <View
      style={[
        styles.root,
        variant === "card" ? styles.rootCard : styles.rootModal,
        compact && styles.rootCompact,
      ]}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View>
        <View
          style={[
            styles.tabsRow,
            variant === "card" ? styles.tabsRowCard : styles.tabsRowModal,
            compact && styles.tabsRowCompact,
          ]}
        >
          {options.map((option) => {
            const isActive = option.key === value;

            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.7}
                onPress={() => onChange(option.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={[styles.tab, variant === "card" && styles.tabCard, compact && styles.tabCompact, compact && isActive && styles.tabCompactActive]}
                testID={testIDPrefix ? `${testIDPrefix}-tab-${option.key}` : undefined}
              >
                <Text
                  numberOfLines={compact ? 1 : undefined}
                  style={[
                    styles.tabLabel,
                    variant === "card" ? styles.tabLabelCard : styles.tabLabelModal,
                    isActive && styles.tabLabelActive,
                    compact && styles.tabLabelCompact,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.tabIndicator,
                    variant === "card"
                      ? styles.tabIndicatorCard
                      : styles.tabIndicatorModal,
                    isActive && styles.tabIndicatorActive,
                    compact && styles.tabIndicatorCompact,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

      </View>

      {selectedOption ? (
        <View
          testID={testIDPrefix ? `${testIDPrefix}-preview` : undefined}
          style={[
            styles.previewHero,
            variant === "card" ? styles.previewHeroCard : styles.previewHeroModal,
            { aspectRatio: previewAspectRatio },
            previewMaxWidth ? { width: previewMaxWidth, maxWidth: "100%" } : null,
            compact && styles.previewHeroCompact,
          ]}
        >
          <View
            style={[
              styles.previewInner,
              variant === "card" ? styles.previewInnerCard : styles.previewInnerModal,
            ]}
          >
            <Image
              source={selectedOption.preview}
              style={[
                styles.previewImage,
                previewImageScale !== 1
                  ? { transform: [{ scale: previewImageScale }] }
                  : null,
              ]}
              contentFit={imageFit}
              cachePolicy="memory-disk"
              transition={180}
            />
          </View>
        </View>
      ) : null}

      {description ? (
        <Text
          style={[
            styles.description,
            variant === "card" ? styles.descriptionCard : styles.descriptionModal,
            compact && styles.descriptionCompact,
          ]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
