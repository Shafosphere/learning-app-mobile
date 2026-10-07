import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useStyles } from "@/src/screens/courses/pincourse/CoursePinScreen/CoursePinScreen-styles";
import type { LanguageCourseGroupId } from "@/src/constants/languageCourseGroups";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";

type OfficialCourseListItem = {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  slug: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  cardsCount: number;
  smallFlag: string | null;
  isMini: boolean;
  categoryId?: string;
};

type AccordionIcon =
  | {
      kind: "fa6";
      name: string;
    }
  | {
      kind: "flagPair";
      target?: ImageSourcePropType;
      source?: ImageSourcePropType;
      targetCode: string;
      sourceCode?: string;
    };

export type AccordionGroupItem = {
  key: string;
  title: string;
  subtitle: string;
  languageGroupId?: LanguageCourseGroupId;
  icon?: AccordionIcon;
  count: number;
  regularItems: OfficialCourseListItem[];
  miniItems: OfficialCourseListItem[];
};

type CoursePinAccordionProps = {
  groups: AccordionGroupItem[];
  revealCourseId?: number | null;
  renderCourseCard: (pack: OfficialCourseListItem) => ReactNode;
};

function GroupHeaderIcon({ icon }: { icon?: AccordionIcon }) {
  const styles = useStyles();

  if (!icon) {
    return null;
  }

  if (icon.kind === "fa6") {
    return (
      <View style={styles.headerIconBox}>
        <FontAwesome6 name={icon.name} size={40} style={styles.headerIconFa} />
      </View>
    );
  }

  return (
    <View style={styles.headerIconBox}>
      <View style={styles.headerFlagRow}>
        <Text style={styles.headerIconCode}>{icon.targetCode}</Text>
        {icon.target ? (
          <Image source={icon.target} style={styles.headerIconFlag} />
        ) : null}
      </View>
      {icon.sourceCode ? (
        <View style={styles.headerFlagRow}>
          <Text style={styles.headerIconCode}>{icon.sourceCode}</Text>
          {icon.source ? (
            <Image source={icon.source} style={styles.headerIconFlag} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function CoursePinAccordion({
  groups,
  renderCourseCard,
  revealCourseId,
}: CoursePinAccordionProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const closeInfo = () => setInfoVisible(false);

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.count > 0),
    [groups]
  );

  return (
    <View style={styles.accordionList}>
      {visibleGroups.map((group) => {
        const expanded = expandedGroupKey === group.key ||
          (revealCourseId != null &&
            [...group.regularItems, ...group.miniItems].some((course) => course.id === revealCourseId));
        const hasRegular = group.regularItems.length > 0;
        const hasMini = group.miniItems.length > 0;

        return (
          <View key={group.key} style={group.languageGroupId ? styles.progressiveGroupWrapper : undefined}>
            <View style={styles.accordionItem}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={t("courses.groups.categoryA11y", {
                  title: group.title,
                  count: group.count,
                })}
                onPress={() => {
                  setExpandedGroupKey((current) =>
                    current === group.key ? null : group.key
                  );
                }}
                style={({ pressed }) => [
                  styles.accordionHeader,
                  pressed ? styles.accordionHeaderPressed : null,
                ]}
              >
                <View style={styles.headerLeft}>
                  <GroupHeaderIcon icon={group.icon} />
                  <View style={styles.headerTextWrap}>
                    <Text numberOfLines={1} style={styles.headerTitle}>
                      {group.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.headerSubtitle}>
                      {group.subtitle}
                    </Text>
                  </View>
                </View>

                <View style={styles.headerRight}>
                  <Text style={styles.countPillText}>{group.count}</Text>
                  <View style={styles.chevronBox}>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      style={styles.chevronIcon}
                    />
                  </View>
                </View>
              </Pressable>

              {expanded ? (
                <View style={styles.accordionBody}>
                  <View pointerEvents="none" style={styles.accordionBodySideMaskLeft} />
                  <View pointerEvents="none" style={styles.accordionBodySideMaskRight} />
                  {hasRegular ? (
                    <>
                      <View style={styles.accordionCardsList}>
                        {group.regularItems.map(renderCourseCard)}
                      </View>
                    </>
                  ) : null}

                  {hasMini ? (
                    <>
                      <View style={styles.accordionCardsList}>
                        {group.miniItems.map(renderCourseCard)}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
            {group.languageGroupId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("courses.progressive.infoLabel")}
                onPress={() => setInfoVisible(true)}
                style={styles.progressiveInfoButton}
              >
                <View style={styles.progressiveInfoBadge}>
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    style={styles.progressiveInfoIcon}
                  />
                </View>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      <NudgeModal
        visible={infoVisible}
        title={t("courses.progressive.title")}
        description={t("courses.progressive.description")}
        confirmLabel={t("courses.progressive.confirm")}
        closeLabel={t("courses.progressive.close")}
        onConfirm={closeInfo}
        onClose={closeInfo}
        scrollableContent
      />
    </View>
  );
}
