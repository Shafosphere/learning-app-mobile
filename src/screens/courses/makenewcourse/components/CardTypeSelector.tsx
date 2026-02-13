import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type CardTypeOption<T extends string> = {
  key: T;
  label: string;
};

type CardTypeSelectorProps<T extends string> = {
  options: CardTypeOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label?: string;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelHidden?: boolean;
  size?: "default" | "compact";
  dropdownDirection?: "down" | "up";
};

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    marginTop: 2,
    marginBottom: 18,
    gap: 8,
    position: "relative" as const,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase" as const,
    color: colors.headline,
  },
  selector: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    gap: 8,
  },
  selectorOpen: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  selectorText: {
    flex: 1,
    gap: 4,
  },
  valueText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.headline,
  },
  chevron: {
    color: colors.headline,
  },
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    overflow: "hidden" as const,
    zIndex: 10,
    elevation: 5,
  },
  dropdownUp: {
    top: undefined,
    bottom: "100%",
    marginTop: 0,
    marginBottom: 6,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 0,
    backgroundColor: colors.secondBackground,
  },
  dropdownItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dropdownItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  dropdownItemActive: {
    backgroundColor: colors.my_green,
    borderColor: colors.my_green,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.headline,
  },
  optionLabelActive: {
    color: colors.darkbg,
  },
  compactContainer: {
    marginTop: 0,
    marginBottom: 0,
    gap: 0,
  },
  compactSelector: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  compactValueText: {
    fontSize: 14,
  },
  compactDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  compactOptionLabel: {
    fontSize: 14,
  },
}));

export function CardTypeSelector<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = "—",
  containerStyle,
  labelHidden = false,
  size = "default",
  dropdownDirection = "down",
}: CardTypeSelectorProps<T>) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const activeOption = options.find((option) => option.key === value);
  const isCompact = size === "compact";

  const handleSelect = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View
      style={[
        styles.container,
        isCompact && styles.compactContainer,
        containerStyle,
      ]}
    >
      {!labelHidden && label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={[
          styles.selector,
          isCompact && styles.compactSelector,
          open && styles.selectorOpen,
        ]}
      >
        <View style={styles.selectorText}>
          <Text style={[styles.valueText, isCompact && styles.compactValueText]}>
            {activeOption?.label ?? placeholder}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={styles.chevron?.color ?? "#0F172A"}
        />
      </Pressable>

      {open ? (
        <View
          style={[
            styles.dropdown,
            dropdownDirection === "up" && styles.dropdownUp,
          ]}
        >
          {options.map((option, idx) => {
            const isActive = option.key === value;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.dropdownItem,
                  isCompact && styles.compactDropdownItem,
                  idx === 0 && styles.dropdownItemFirst,
                  idx === options.length - 1 && styles.dropdownItemLast,
                  isActive && styles.dropdownItemActive,
                ]}
                onPress={() => handleSelect(option.key)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    isCompact && styles.compactOptionLabel,
                    isActive && styles.optionLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
