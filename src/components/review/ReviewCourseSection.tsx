import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import {
    getCourseIconById,
    resolveCourseIconProps,
} from "@/src/constants/customCourse";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useStyles } from "@/src/screens/review/courses/CoursesReviewScreen/CoursesScreen-styles";
import { OfficialCourseReviewItem } from "@/src/features/review/courseReviewTypes";
import { DueCountBadge } from "./DueCountBadge";

interface ReviewCourseSectionProps {
    title: string;
    list: OfficialCourseReviewItem[];
    counts: Record<number, number>;
    onSelect: (id: number) => void;
    getCourseCoachmarkTargetId?: (id: number) => string | undefined;
    getCourseBadgeCoachmarkTargetId?: (id: number) => string | undefined;
    getCourseRef?: (id: number) => React.Ref<View> | undefined;
}

export const ReviewCourseSection = ({
    title,
    list,
    counts,
    onSelect,
    getCourseCoachmarkTargetId,
    getCourseBadgeCoachmarkTargetId,
    getCourseRef,
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
                    const courseCoachmarkId = getCourseCoachmarkTargetId?.(course.id);
                    const badgeCoachmarkId = getCourseBadgeCoachmarkTargetId?.(course.id);

                    const cardFace = (
                        <View
                            ref={getCourseRef?.(course.id)}
                            collapsable={false}
                            style={[
                                styles.courseCard,
                                dueCount === 0 && styles.courseCardDisabled,
                            ]}
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
                                {badgeCoachmarkId ? (
                                    <CoachmarkAnchor id={badgeCoachmarkId} shape="rect" radius={16}>
                                        <DueCountBadge count={dueCount} />
                                    </CoachmarkAnchor>
                                ) : (
                                    <DueCountBadge count={dueCount} />
                                )}
                            </View>
                        </View>
                    );

                    const measuredCard = courseCoachmarkId ? (
                        <CoachmarkAnchor
                            id={courseCoachmarkId}
                            shape="rect"
                            radius={15}
                        >
                            {cardFace}
                        </CoachmarkAnchor>
                    ) : (
                        cardFace
                    );

                    return (
                        <Pressable
                            key={`official-${course.id}`}
                            style={styles.courseCardSlot}
                            disabled={dueCount === 0}
                            accessibilityState={{ disabled: dueCount === 0 }}
                            onPress={() => onSelect(course.id)}
                        >
                            {measuredCard}
                        </Pressable>
                    );
                })}
            </View>
        </>
    );
};
