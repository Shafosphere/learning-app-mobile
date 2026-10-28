import { Children, type ReactNode } from "react";
import { View } from "react-native";

export function CourseCardGrid({ children, columns = 1 }: {
  children: ReactNode;
  columns?: 1 | 2;
}) {
  const cards = Children.toArray(children);
  return (
    <View style={{ width: "100%", gap: 12 }}>
      {Array.from({ length: Math.ceil(cards.length / columns) }, (_, row) => (
        <View key={row} style={{ flexDirection: "row", gap: 16 }}>
          {Array.from({ length: columns }, (_, column) => (
            <View key={column} style={{ flex: 1, minWidth: 0 }}>
              {cards[row * columns + column] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
