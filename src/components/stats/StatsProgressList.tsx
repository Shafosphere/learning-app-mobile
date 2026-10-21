import React, { useCallback, useState } from "react";
import { ScrollView, type ViewProps } from "react-native";

export const STATS_PROGRESS_VISIBLE_ROWS = 4;

type RowLayout = {
  isLast: boolean;
  onLayout?: ViewProps["onLayout"];
};

type Props<T> = {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, layout: RowLayout) => React.ReactNode;
  testID?: string;
};

export default function StatsProgressList<T>({ items, keyExtractor, renderItem, testID }: Props<T>) {
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const needsScroll = items.length > STATS_PROGRESS_VISIBLE_ROWS;
  const visibleHeights = items.slice(0, STATS_PROGRESS_VISIBLE_ROWS)
    .map((item) => rowHeights[keyExtractor(item)]);
  // Use actual heights so wrapping and accessibility fonts preserve four rows.
  const maxHeight = needsScroll && visibleHeights.every((height) => height > 0)
    ? Math.ceil(visibleHeights.reduce((sum, height) => sum + height, 0))
    : undefined;

  const handleRowLayout = useCallback((key: string, height: number) => {
    setRowHeights((current) =>
      current[key] === height ? current : { ...current, [key]: height }
    );
  }, []);

  return (
    <ScrollView
      testID={testID}
      style={maxHeight === undefined ? undefined : { maxHeight }}
      nestedScrollEnabled
      directionalLockEnabled
      scrollEnabled={needsScroll}
      showsVerticalScrollIndicator={needsScroll}
    >
      {items.map((item, index) => {
        const key = keyExtractor(item);
        return (
          <React.Fragment key={key}>
            {renderItem(item, index, {
              isLast: index === items.length - 1,
              onLayout: index < STATS_PROGRESS_VISIBLE_ROWS
                ? (event) => handleRowLayout(key, event.nativeEvent.layout.height)
                : undefined,
            })}
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}
