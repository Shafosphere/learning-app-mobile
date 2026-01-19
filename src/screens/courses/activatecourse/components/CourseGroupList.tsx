import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Image, Text, View } from "react-native";
import { useStyles } from "../CourseActivateScreen-styles";
import { CourseGroup, OfficialCourseListItem, SelectedCourse } from "../types";
import { OfficialCourseSection } from "./OfficialCourseSection";

interface CourseGroupListProps {
    groups: CourseGroup[];
    committedCourse: SelectedCourse | null;
    colors: { headline: string };
    onPress: (id: number) => void;
    onEdit: (course: OfficialCourseListItem) => void;
}

export const CourseGroupList = ({
    groups,
    committedCourse,
    colors,
    onPress,
    onEdit,
}: CourseGroupListProps) => {
    const styles = useStyles();

    return (
        <View style={styles.builtinSection}>
            {groups.map((group) => {
                const regularOfficial = group.official.filter(
                    (course) => course.isMini === false
                );
                const miniOfficial = group.official.filter(
                    (course) => course.isMini !== false
                );
                const showRegular = regularOfficial.length > 0;
                const showMini = miniOfficial.length > 0;
                const hasOfficial = showRegular || showMini;

                if (!hasOfficial) {
                    return null;
                }

                const targetCode = group.targetLang
                    ? group.targetLang.toUpperCase()
                    : "?";
                const sourceCode = group.sourceLang
                    ? group.sourceLang.toUpperCase()
                    : "?";

                return (
                    <View
                        key={`builtin-group-${group.key}`}
                        style={styles.groupSection}
                    >
                        <View style={styles.groupHeader}>
                            <View style={styles.groupHeaderLine} />
                            <View style={styles.groupHeaderBadge}>
                                {group.category ? (
                                    <View style={styles.groupHeaderLanguage}>
                                        {group.category?.icon ? (
                                            <FontAwesome6
                                                name={group.category.icon}
                                                size={16}
                                                color={colors.headline}
                                                style={{ marginRight: 6 }}
                                            />
                                        ) : null}
                                        <Text
                                            style={[styles.groupHeaderCode, { fontSize: 24 }]}
                                        >
                                            {group.category.label.toUpperCase()}
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
                        </View>

                        {hasOfficial ? (
                            <>
                                <OfficialCourseSection
                                    title="Kursy"
                                    list={regularOfficial}
                                    showTitle={showRegular}
                                    committedCourse={committedCourse}
                                    colors={colors}
                                    onPress={onPress}
                                    onEdit={onEdit}
                                />
                                <OfficialCourseSection
                                    title="Mini kursy"
                                    list={miniOfficial}
                                    showTitle={showRegular && showMini}
                                    committedCourse={committedCourse}
                                    colors={colors}
                                    onPress={onPress}
                                    onEdit={onEdit}
                                />
                            </>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
};
