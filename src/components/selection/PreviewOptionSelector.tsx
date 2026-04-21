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
      ]}
    >
      <View
        style={[
          styles.tabsRow,
          variant === "card" ? styles.tabsRowCard : styles.tabsRowModal,
        ]}
      >
        {options.map((option) => {
          const isActive = option.key === value;

          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.7}
              onPress={() => onChange(option.key)}
              style={[styles.tab, variant === "card" && styles.tabCard]}
              testID={testIDPrefix ? `${testIDPrefix}-tab-${option.key}` : undefined}
            >
              <Text
                style={[
                  styles.tabLabel,
                  variant === "card" ? styles.tabLabelCard : styles.tabLabelModal,
                  isActive && styles.tabLabelActive,
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
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedOption ? (
        <View
          style={[
            styles.previewHero,
            variant === "card" ? styles.previewHeroCard : styles.previewHeroModal,
            { aspectRatio: previewAspectRatio },
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
              style={styles.previewImage}
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
          ]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
