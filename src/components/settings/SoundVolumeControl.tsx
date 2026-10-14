import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { TrackSlider } from "@/src/components/slider/TrackSlider";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen/SettingsScreen-styles";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";

type Props = {
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => Promise<void>;
  testID: string;
  disabled?: boolean;
};

export function SoundVolumeControl({ title, description, value, onChange, testID, disabled = false }: Props) {
  const styles = useStyles();
  const { colors } = useSettings();
  const [preview, setPreview] = useState(value);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPendingChange = useCallback(() => {
    if (debounce.current !== null) clearTimeout(debounce.current);
    debounce.current = null;
  }, []);

  useEffect(() => { setPreview(value); }, [value]);
  useEffect(() => cancelPendingChange, [cancelPendingChange]);

  const handlePreview = useCallback((next: number) => {
    setPreview(next);
    cancelPendingChange();
    debounce.current = setTimeout(() => {
      debounce.current = null;
      void onChange(next);
    }, 180);
  }, [cancelPendingChange, onChange]);
  const handleCommit = useCallback((next: number) => {
    setPreview(next);
    cancelPendingChange();
    void onChange(next);
  }, [cancelPendingChange, onChange]);

  const percentage = `${Math.round(preview * 100)}%`;
  return (
    <View style={styles.appearancePlainBlock}>
      <View style={styles.appearanceBlockHeader}>
        <Text style={styles.appearanceBlockTitle}>{title}</Text>
        <Text style={styles.appearanceBlockDescription}>{preventWidowsPl(description)}</Text>
      </View>
      <View style={styles.sliderSection}>
        <View style={styles.sliderRow}>
          <TrackSlider
            testID={testID}
            accessibilityLabel={title}
            accessibilityValueText={percentage}
            value={preview}
            disabled={disabled}
            onValueChange={handlePreview}
            onSlidingComplete={handleCommit}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            mode="solid"
            trackHeight={12}
            thumbSize={28}
            thumbBorderWidth={2}
            trackColor={colors.border}
            fillColor={colors.my_green}
            thumbColor={colors.background}
            thumbBorderColor={colors.my_green}
            style={styles.sliderWrapper}
          />
          <Text style={styles.sliderValue}>{percentage}</Text>
        </View>
      </View>
    </View>
  );
}
