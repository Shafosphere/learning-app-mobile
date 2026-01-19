import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import {
    getCourseIconById,
    resolveCourseIconProps,
} from "@/src/constants/customCourse";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useStyles } from "../CoursesScreen-styles";
import { OfficialCourseReviewItem } from "../types";
import { DueCountBadge } from "./DueCountBadge";

interface ReviewCourseSectionProps {
    title: string;
    list: OfficialCourseReviewItem[];
    counts: Record<number, number>;
    onSelect: (id: number) => void;
}

export const ReviewCourseSection = ({
    title,
    list,
    counts,
    onSelect,
}: ReviewCourseSectionProps) => {
    const styles = useStyles();

    if (!list.length) return null;

    return (
        <>
            <Text style={styles.miniSectionTitle}>{title}</Text>
            <View style={styles.courseGrid}>
                {list.map((course) => {
                    const iconProps = resolveCourseIconProps(
                        course.iconId,
                        course.iconColor
                    );
                    const iconMeta = getCourseIconById(course.iconId);
                    const IconComponent =
                        iconProps.icon?.Component ?? iconMeta?.Component ?? Ionicons;
                    const iconName = (iconProps.icon?.name ??
                        iconMeta?.name ??
                        "grid-outline") as never;
                    const dueCount = counts[course.id] ?? 0;
                    const mainFlag = iconProps.mainImageSource;

                    return (
                        <Pressable
                            key={`official-${course.id}`}
                            style={[
                                styles.courseCard,
                                dueCount === 0 && styles.courseCardDisabled,
                            ]}
                            disabled={dueCount === 0}
                            accessibilityState={{ disabled: dueCount === 0 }}
                            onPress={() => onSelect(course.id)}
                        >
                            {mainFlag ? (
                                <Image
                                    style={styles.courseCardIconFlag}
                                    source={mainFlag}
                                />
                            ) : (
                                <IconComponent
                                    name={iconName}
                                    size={48}
                                    color={course.iconColor}
                                />
                            )}
                            <CourseTitleMarquee
                                text={course.name}
                                containerStyle={styles.courseCardTitleContainer}
                                textStyle={styles.courseCardText}
                            />
                            <View style={styles.courseCount}>
                                <DueCountBadge count={dueCount} />
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </>
    );
};
