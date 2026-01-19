import { CourseListCard } from "@/src/components/course/CourseListCard";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useStyles } from "../CourseActivateScreen-styles";
import { OfficialCourseListItem, SelectedCourse } from "../types";

interface OfficialCourseSectionProps {
    title: string;
    list: OfficialCourseListItem[];
    showTitle?: boolean;
    committedCourse: SelectedCourse | null;
    colors: { headline: string };
    onPress: (id: number) => void;
    onEdit: (course: OfficialCourseListItem) => void;
}

export const OfficialCourseSection = ({
    title,
    list,
    showTitle = true,
    committedCourse,
    colors,
    onPress,
    onEdit,
}: OfficialCourseSectionProps) => {
    const styles = useStyles();

    if (!list.length) return null;

    return (
        <View style={styles.groupCourses}>
            {showTitle ? <Text style={styles.groupSubtitle}>{title}</Text> : null}
            {list.map((course) => {
                const isHighlighted =
                    committedCourse?.type === "custom" &&
                    committedCourse.id === course.id;
                const flagLang = course.smallFlag ?? course.sourceLang;

                return (
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
            })}
        </View>
    );
};
