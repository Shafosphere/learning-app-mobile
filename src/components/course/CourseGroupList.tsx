import { LANGUAGE_COURSE_GROUPS } from "@/src/constants/languageCourseGroups";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { memo, useMemo } from "react";
import { Image, Text, View } from "react-native";
import { useStyles } from "@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen-styles";
import { CourseGroup, OfficialCourseListItem } from "@/src/features/customCourse/courseActivationTypes";
import { OfficialCourseSection } from "./OfficialCourseSection";
import { profileCourseActivation } from "./CourseActivationProfiler";
import { recordCourseActivationEvent } from "@/src/services/courseActivationDiagnostics";
import { useTranslation } from "react-i18next";

interface CourseGroupListProps {
    groups: CourseGroup[];
    activeCourseId: number | null;
    colors: { headline: string };
    onPress: (id: number, isAlreadyActive: boolean) => void;
    onEdit: (course: OfficialCourseListItem) => void;
    firstCoachmarkCourseId: number | null;
    scrollRef: React.RefObject<any>;
    renderCourseFooter?: (course: OfficialCourseListItem, isHighlighted: boolean) => React.ReactNode;
}

type PreparedGroup = {
    group: CourseGroup;
    regular: OfficialCourseListItem[];
    mini: OfficialCourseListItem[];
    regularIds: Set<number>;
    miniIds: Set<number>;
    continuesLanguageSeries: boolean;
};

type GroupProps = Omit<CourseGroupListProps, "groups" | "colors"> & {
    prepared: PreparedGroup;
    headlineColor: string;
};

const CourseGroupView = memo(function CourseGroupView({
    prepared,
    activeCourseId,
    headlineColor,
    onPress,
    onEdit,
    firstCoachmarkCourseId,
    scrollRef,
    renderCourseFooter,
}: GroupProps) {
    const { t } = useTranslation();
    const styles = useStyles();
    const { group, regular, mini, regularIds, miniIds, continuesLanguageSeries } = prepared;
    const showRegular = regular.length > 0;
    const showMini = mini.length > 0;
    const targetCode = group.targetLang ? group.targetLang.toUpperCase() : "?";
    const sourceCode = group.sourceLang ? group.sourceLang.toUpperCase() : "?";
    recordCourseActivationEvent("group.render", { key: group.key, activeCourseId });

    return profileCourseActivation(`group:${group.key}`, (
        <View style={styles.groupSection}>
            {!continuesLanguageSeries ? <View style={styles.groupHeader}>
                <View style={styles.groupHeaderLine} />
                <View style={styles.groupHeaderBadge}>
                    {group.languageGroupId ? (
                        <Text style={styles.groupHeaderCode}>
                            {t(LANGUAGE_COURSE_GROUPS[group.languageGroupId].labelKey)}
                        </Text>
                    ) : group.category ? (
                        <View style={styles.groupHeaderLanguage}>
                            {group.category?.icon ? (
                                <FontAwesome6
                                    name={group.category.icon}
                                    size={16}
                                    color={headlineColor}
                                    style={{ marginRight: 6 }}
                                />
                            ) : null}
                            <Text
                                style={[styles.groupHeaderCode, { fontSize: 24 }]}
                            >
                                {t(group.category.labelKey).toUpperCase()}
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.groupHeaderLanguage}>
                                <Text style={styles.groupHeaderCode}>
                                    {targetCode}
                                </Text>
                                {group.targetFlag ? (
                                    <Image
                                        style={styles.groupHeaderFlag}
                                        source={group.targetFlag}
                                    />
                                ) : null}
                            </View>
                            {group.sourceLang ? (
                                <>
                                    <Text style={styles.groupHeaderSeparator}>/</Text>
                                    <View style={styles.groupHeaderLanguage}>
                                        <Text style={styles.groupHeaderCode}>
                                            {sourceCode}
                                        </Text>
                                        {group.sourceFlag ? (
                                            <Image
                                                style={styles.groupHeaderFlag}
                                                source={group.sourceFlag}
                                            />
                                        ) : null}
                                    </View>
                                </>
                            ) : null}
                        </>
                    )}
                </View>
            </View> : null}

            <OfficialCourseSection
                title={t("repeats.labels.courses")}
                list={regular}
                showTitle={showRegular && !continuesLanguageSeries}
                isContinuation={continuesLanguageSeries}
                activeCourseId={activeCourseId != null && regularIds.has(activeCourseId) ? activeCourseId : null}
                headlineColor={headlineColor}
                onPress={onPress}
                onEdit={onEdit}
                firstCoachmarkCourseId={firstCoachmarkCourseId != null && regularIds.has(firstCoachmarkCourseId) ? firstCoachmarkCourseId : null}
                scrollRef={scrollRef}
                renderCourseFooter={renderCourseFooter}
            />
            <OfficialCourseSection
                title={t("courses.groups.mini")}
                list={mini}
                showTitle={showRegular && showMini && !continuesLanguageSeries}
                isContinuation={continuesLanguageSeries && !showRegular}
                activeCourseId={activeCourseId != null && miniIds.has(activeCourseId) ? activeCourseId : null}
                headlineColor={headlineColor}
                onPress={onPress}
                onEdit={onEdit}
                firstCoachmarkCourseId={firstCoachmarkCourseId != null && miniIds.has(firstCoachmarkCourseId) ? firstCoachmarkCourseId : null}
                scrollRef={scrollRef}
                renderCourseFooter={renderCourseFooter}
            />
        </View>
    ));
});

export const CourseGroupList = ({ groups, activeCourseId, colors, firstCoachmarkCourseId, ...rowProps }: CourseGroupListProps) => {
    const styles = useStyles();
    const preparedGroups = useMemo(() => {
        const seriesPairs = new Set(groups.filter((group) => group.languageGroupId)
            .map((group) => JSON.stringify([group.sourceLang, group.targetLang])));
        const prepared = groups.filter((group) => group.official.length > 0).map((group): PreparedGroup => {
            const regular: OfficialCourseListItem[] = [];
            const mini: OfficialCourseListItem[] = [];
            const regularIds = new Set<number>();
            const miniIds = new Set<number>();
            for (const course of group.official) {
                if (course.isMini === false) {
                    regular.push(course);
                    regularIds.add(course.id);
                } else {
                    mini.push(course);
                    miniIds.add(course.id);
                }
            }
            return {
                group, regular, mini, regularIds, miniIds,
                continuesLanguageSeries: !group.languageGroupId && !group.category &&
                    seriesPairs.has(JSON.stringify([group.sourceLang, group.targetLang])),
            };
        });
        recordCourseActivationEvent("groups.prepare", { groups: prepared.length });
        return prepared;
    }, [groups]);

    return (
        <View style={styles.builtinSection}>
            {preparedGroups.map((prepared) => {
                const contains = (id: number | null) => id != null &&
                    (prepared.regularIds.has(id) || prepared.miniIds.has(id));
                return <CourseGroupView
                    key={`builtin-group-${prepared.group.key}`}
                    prepared={prepared}
                    activeCourseId={contains(activeCourseId) ? activeCourseId : null}
                    headlineColor={colors.headline}
                    firstCoachmarkCourseId={contains(firstCoachmarkCourseId) ? firstCoachmarkCourseId : null}
                    {...rowProps}
                />;
            })}
        </View>
    );
};
