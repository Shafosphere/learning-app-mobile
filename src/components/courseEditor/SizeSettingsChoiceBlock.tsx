import {
  SettingsChoiceGrid,
  SettingsChoiceHeader,
  useSettingsChoiceLayout,
} from "./SettingsChoiceLayout";
import { View } from "react-native";
import { useStyles } from "./SettingsChoiceCard-styles";
import { SettingsChoiceCard } from "./SettingsChoiceCard";

const IMAGE_ICON_SIZES: Record<string, number> = {
  small: 20,
  medium: 24,
  very_large: 32,
};

type SizeSettingsChoiceBlockProps<T extends string> = {
  title: string;
  description: string;
  hint?: string;
  kind: "flashcard" | "image";
  options: {
    key: T;
    title: string;
    subtitle: string;
  }[];
  value: T;
  onSelect?: (value: T) => void;
  disabled?: boolean;
  fullWidthOption?: T;
  separated?: boolean;
};

export function SizeSettingsChoiceBlock<T extends string>({
  title,
  description,
  hint,
  kind,
  options,
  value,
  onSelect,
  disabled = false,
  fullWidthOption,
  separated = false,
}: SizeSettingsChoiceBlockProps<T>) {
  const styles = useStyles();
  const isImage = kind === "image";
  const isDisabled = disabled || !onSelect;
  const { stacked, onLayout } = useSettingsChoiceLayout();
  return (
    <View
      style={[styles.section, separated && styles.separatedSection]}
      onLayout={onLayout}
      testID={`course-${kind}-size-settings`}
    >
      <SettingsChoiceHeader
        title={title}
        description={description}
        hint={hint}
        icon={isImage ? "image-outline" : "document-outline"}
        accent={isImage ? "teal" : "blue"}
      />
      <SettingsChoiceGrid
        options={options.map((option) => option.key)}
        stacked={stacked}
        firstRowTestID={`course-${kind}-size-first-row`}
        fullWidthOption={fullWidthOption}
        renderOption={(key) => {
          const option = options.find((item) => item.key === key)!;
          return (
            <SettingsChoiceCard
              key={option.key}
              title={option.title}
              description={option.subtitle}
              accessibilityLabel={`${title}, ${option.title}, ${option.subtitle}`}
              icon={
                isImage
                  ? "image"
                  : option.key === "small"
                    ? "reader-outline"
                    : "document-text-outline"
              }
              iconSize={isImage ? (IMAGE_ICON_SIZES[option.key] ?? 28) : 26}
              accent={isImage ? "teal" : "blue"}
              selected={value === option.key}
              disabled={isDisabled}
              onPress={onSelect ? () => onSelect(option.key) : undefined}
              wide={option.key === fullWidthOption}
            />
          );
        }}
      />
    </View>
  );
}
