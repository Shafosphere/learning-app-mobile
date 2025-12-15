
import type { ReactNode } from "react";

import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { CourseCard } from "./CourseCard";

type CourseListCardProps = {
    title: string;
    subtitle?: string;
    iconId: string;
    iconColor: string;
    flagCode?: string | null;
    onPress?: () => void;
    rightAccessory?: ReactNode;
    isHighlighted?: boolean;
};

const useStyles = createThemeStylesHook((colors) => ({
    card: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 15,
        paddingLeft: "7%",
        paddingRight: "7%",
        backgroundColor: colors.secondBackground,
        height: 92,
        marginBottom: 0, // Reset margin as it might differ between lists, let parent handle gap
    },
    cardContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    iconBadge: {
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    flag: {
        position: "absolute",
        bottom: -3,
        right: -3,
        width: 99 / 3,
        height: 66 / 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    info: {
        flex: 1,
        marginLeft: 12,
        minWidth: 0,
        alignItems: "flex-start",
    },
    titleContainer: {
        width: "100%",
        overflow: "hidden",
    },
    title: {
        fontSize: 25,
        fontWeight: "900",
        color: colors.headline,
    },
    meta: {
        fontSize: 12,
        fontWeight: "900",
        color: colors.headline,
    },
    highlighted: {
        backgroundColor: colors.my_green,
    },
}));

export function CourseListCard({
    title,
    subtitle,
    iconId,
    iconColor,
    flagCode,
    onPress,
    rightAccessory,
    isHighlighted,
}: CourseListCardProps) {
    const styles = useStyles();

    const iconProps = resolveCourseIconProps(iconId, iconColor);
    const flagSource = flagCode ? getFlagSource(flagCode) : undefined;

    return (
        <CourseCard
            onPress={onPress}
            containerStyle={styles.card}
            contentStyle={styles.cardContent}
            {...iconProps}
            iconWrapperStyle={[styles.iconBadge, { borderColor: iconColor }]}
            flagSource={flagSource}
            flagStyle={styles.flag}
            infoStyle={styles.info}
            title={title}
            titleContainerStyle={styles.titleContainer}
            titleTextStyle={styles.title}
            meta={subtitle}
            metaTextStyle={styles.meta}
            rightAccessory={rightAccessory}
            isHighlighted={isHighlighted}
            highlightedStyle={styles.highlighted}
        />
    );
}
