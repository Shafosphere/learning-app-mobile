import { LanguageAudioDownloadPanel } from "@/Audio/runtime/LanguageAudioDownloadPanel";
import { getCourseAudioPacks } from "@/Audio/runtime/catalog";
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
    showAudioDownloads?: boolean;
    cardWidth?: number;
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
    audioPacks: string[];
    topics: { key: string; titleKey?: string; courses: OfficialCourseListItem[] }[];
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
    cardWidth,
    showAudioDownloads = false,
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
            {!continuesLanguageSeries ? <View style={[styles.groupHeader, cardWidth != null && styles.groupHeaderLandscape]}>
                <View style={[styles.groupHeaderLine, cardWidth != null && { borderBottomWidth: 2 }]} />
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

            {showAudioDownloads && prepared.audioPacks.map(packName => <LanguageAudioDownloadPanel key={packName} packName={packName} />)}

            {prepared.topics.length > 0 ? prepared.topics.map((topic) => (
                <View key={topic.key} testID={`course-topic-${topic.key}`}>
                    <OfficialCourseSection
                        title={topic.titleKey ? t(topic.titleKey) : topic.courses[0].name}
                        list={topic.courses}
                        activeCourseId={activeCourseId}
                        headlineColor={headlineColor}
                        onPress={onPress}
                        onEdit={onEdit}
                        firstCoachmarkCourseId={firstCoachmarkCourseId}
                        scrollRef={scrollRef}
                        renderCourseFooter={renderCourseFooter}
                        cardWidth={cardWidth}
                    />
                </View>
            )) : <>
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
                cardWidth={cardWidth}
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
                cardWidth={cardWidth}
            />
            </>}
        </View>
    ));
});

export const CourseGroupList = ({ groups, activeCourseId, colors, firstCoachmarkCourseId, ...rowProps }: CourseGroupListProps) => {
    const styles = useStyles();
    const preparedGroups = useMemo(() => {
        const seriesPairs = new Set(groups.filter((group) => group.languageGroupId)
            .map((group) => JSON.stringify([group.sourceLang, group.targetLang])));
        const seenPacks = new Set<string>();
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
            const audioPacks = [...new Set(group.official.flatMap(course => getCourseAudioPacks(course.slug)))].filter(name => !seenPacks.has(name));
            audioPacks.forEach(name => seenPacks.add(name));
            // Positions describe stages within a topic, not across all science courses.
            const topicMap = new Map<string, PreparedGroup["topics"][number]>();
            if (group.category?.id === "science") {
                for (const course of group.official) {
                    const key = course.knowledgeGroupId ?? course.slug ?? `course:${course.id}`;
                    let topic = topicMap.get(key);
                    if (!topic) {
                        topic = {
                            key,
                            titleKey: course.knowledgeGroupId
                                ? `constants.knowledgeCourseGroups.label.${course.knowledgeGroupId}` : undefined,
                            courses: [],
                        };
                        topicMap.set(key, topic);
                    }
                    topic.courses.push(course);
                }
            }
            return {
                audioPacks,
                topics: [...topicMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
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
