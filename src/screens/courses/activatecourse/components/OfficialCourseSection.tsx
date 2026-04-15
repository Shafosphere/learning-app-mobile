import { CourseListCard } from "@/src/components/course/CourseListCard";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useStyles } from "../CourseActivateScreen-styles";
import { OfficialCourseListItem } from "../types";

interface OfficialCourseSectionProps {
    title: string;
    list: OfficialCourseListItem[];
    showTitle?: boolean;
    activeCourseId: number | null;
    colors: { headline: string };
    onPress: (id: number) => void;
    onEdit: (course: OfficialCourseListItem) => void;
    firstCoachmarkCourseId: number | null;
    scrollRef: React.RefObject<any>;
}

export const OfficialCourseSection = ({
    title,
    list,
    showTitle = true,
    activeCourseId,
    colors,
    onPress,
    onEdit,
    firstCoachmarkCourseId,
    scrollRef,
}: OfficialCourseSectionProps) => {
    const styles = useStyles();

    if (!list.length) return null;

    return (
        <View style={styles.groupCourses}>
            {showTitle ? <Text style={styles.groupSubtitle}>{title}</Text> : null}
            {list.map((course) => {
                const isHighlighted = activeCourseId === course.id;
                const flagLang = course.smallFlag ?? course.sourceLang;
                const isCoachmarkTarget = course.id === firstCoachmarkCourseId;

                const card = (
                    <CourseListCard
                        key={`official-${course.id}`}
                        title={course.name}
                        subtitle={`fiszki: ${course.cardsCount}`}
                        iconId={course.iconId}
                        iconColor={course.iconColor}
                        flagCode={flagLang}
                        isHighlighted={isHighlighted}
                        onPress={() => onPress(course.id)}
                        rightAccessory={
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Edytuj kurs ${course.name}`}
                                style={styles.customEditButton}
                                onPress={(event) => {
                                    event.stopPropagation();
                                    onEdit(course);
                                }}
                                hitSlop={8}
                            >
                                <FontAwesome6
                                    name="edit"
                                    size={24}
                                    color={colors.headline}
                                />
                            </Pressable>
                        }
                    />
                );

                if (isCoachmarkTarget) {
                    return (
                        <CoachmarkAnchor
                            key={`coachmark-official-${course.id}`}
                            id="course-activate-first-card"
                            shape="rect"
                            radius={20}
                            padding={2}
                            scrollRef={scrollRef}
                            style={{ alignSelf: "stretch" }}
                        >
                            {card}
                        </CoachmarkAnchor>
                    );
                }

                return card;
            })}
        </View>
    );
};
