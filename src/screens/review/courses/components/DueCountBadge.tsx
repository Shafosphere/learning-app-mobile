import { useSettings } from "@/src/contexts/SettingsContext";
import React from "react";
import { Text } from "react-native";
import { useStyles } from "../CoursesScreen-styles";

interface DueCountBadgeProps {
    count: number;
}

export const DueCountBadge = ({ count }: DueCountBadgeProps) => {
    const styles = useStyles();
    const { colors } = useSettings();

    return (
        <Text
            style={[
                styles.countNumber,
                { color: count > 0 ? colors.my_red : colors.my_green },
            ]}
        >
            {count}
        </Text>
    );
};
