import { CourseListCard } from "@/src/components/course/CourseListCard";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useStyles } from "@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen-styles";
import { profileCourseActivation } from "./CourseActivationProfiler";
import { recordCourseActivationEvent } from "@/src/services/courseActivationDiagnostics";
import { OfficialCourseListItem } from "@/src/features/customCourse/courseActivationTypes";

interface OfficialCourseSectionProps {
    title: string;
    cardWidth?: number;
    list: OfficialCourseListItem[];
    showTitle?: boolean;
    isContinuation?: boolean;
    activeCourseId: number | null;
    headlineColor: string;
    onPress: (id: number, isAlreadyActive: boolean) => void;
    onEdit: (course: OfficialCourseListItem) => void;
    firstCoachmarkCourseId: number | null;
    scrollRef: React.RefObject<any>;
    renderCourseFooter?: (course: OfficialCourseListItem, isHighlighted: boolean) => React.ReactNode;
}

type OfficialCourseRowProps = Pick<
    OfficialCourseSectionProps,
    "onPress" | "onEdit" | "scrollRef" | "renderCourseFooter"
> & {
    course: OfficialCourseListItem;
    cardWidth?: number;
    isHighlighted: boolean;
    headlineColor: string;
    isCoachmarkTarget: boolean;
};

// Build callbacks and JSX inside the boundary so unrelated selections can bail out.
const OfficialCourseRow = memo(function OfficialCourseRow({
    course,
    isHighlighted,
    headlineColor,
    isCoachmarkTarget,
    onPress,
    onEdit,
    scrollRef,
    renderCourseFooter,
    cardWidth,
}: OfficialCourseRowProps) {
    const { t } = useTranslation();
    const styles = useStyles();
    const card = (
        <CourseListCard
            title={course.name}
            subtitle={t("courses.official.cardsCount", { count: course.cardsCount })}
            iconId={course.iconId}
            iconColor={course.iconColor}
            flagCode={course.smallFlag ?? course.sourceLang}
            isHighlighted={isHighlighted}
            spacious={cardWidth != null}
            onPress={() => onPress(course.id, isHighlighted)}
            rightAccessory={
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("courses.official.editCourse", { name: course.name })}
                    style={styles.customEditButton}
                    onPress={(event) => {
                        event.stopPropagation();
                        onEdit(course);
                    }}
                    hitSlop={8}
                >
                    <FontAwesome6 name="edit" size={24} color={headlineColor} />
                </Pressable>
            }
        />
    );

    return profileCourseActivation(`row:${course.id}`, (
        <View testID={`official-course-row-${course.id}`} style={cardWidth != null ? { width: cardWidth } : undefined}>
            <View style={{ zIndex: 1 }}>
                {isCoachmarkTarget ? (
                    <CoachmarkAnchor
                        id="course-activate-first-card"
                        shape="rect"
                        radius={20}
                        padding={2}
                        scrollRef={scrollRef}
                        style={{ alignSelf: "stretch" }}
                    >
                        {card}
                    </CoachmarkAnchor>
                ) : card}
            </View>
            {renderCourseFooter?.(course, isHighlighted)}
        </View>
    ));
});

export const OfficialCourseSection = memo(function OfficialCourseSection({
    title,
    list,
    showTitle = true,
    isContinuation = false,
    activeCourseId,
    headlineColor,
    onPress,
    onEdit,
    firstCoachmarkCourseId,
    scrollRef,
    renderCourseFooter,
    cardWidth,
}: OfficialCourseSectionProps) {
    const styles = useStyles();

    recordCourseActivationEvent("section.render", { title, firstCourseId: list[0]?.id, activeCourseId });
    if (!list.length) return null;

    return (
        <View style={[styles.groupCourses, cardWidth != null && { marginTop: 8 }, isContinuation && styles.groupCoursesContinuation]}>
            {showTitle ? <Text style={styles.groupSubtitle}>{title}</Text> : null}
            <View style={cardWidth != null ? styles.courseGrid : styles.courseList}>
                {list.map((course) => (
                    <OfficialCourseRow
                        key={`official-row-${course.id}`}
                        course={course}
                        isHighlighted={activeCourseId === course.id}
                        headlineColor={headlineColor}
                        isCoachmarkTarget={course.id === firstCoachmarkCourseId}
                        onPress={onPress}
                        onEdit={onEdit}
                        scrollRef={scrollRef}
                        renderCourseFooter={renderCourseFooter}
                        cardWidth={cardWidth}
                    />
                ))}
            </View>
        </View>
    );
});
