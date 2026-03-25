/**
 * Center bar for captured pieces (hit checkers).
 */

import { View, Text, StyleSheet } from "react-native";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Checker } from "./checker";
import type { BarState } from "@/types/game";

interface BarProps {
  bar: BarState;
  width: number;
  height: number;
  checkerSize: number;
}

export function Bar({ bar, width, height, checkerSize }: BarProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { width, height, backgroundColor: colors.primary }]}>
      <View style={styles.section}>
        {bar.white > 0 && (
          <View style={styles.pieces}>
            {Array.from({ length: Math.min(bar.white, 5) }).map((_, i) => (
              <View key={`w-${i}`} style={styles.checkerWrap}>
                <Checker color="white" size={checkerSize} />
              </View>
            ))}
            {bar.white > 5 && (
              <Text style={[styles.count, { color: colors.text }]}>+{bar.white - 5}</Text>
            )}
          </View>
        )}
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.section}>
        {bar.red > 0 && (
          <View style={styles.pieces}>
            {Array.from({ length: Math.min(bar.red, 5) }).map((_, i) => (
              <View key={`r-${i}`} style={styles.checkerWrap}>
                <Checker color="red" size={checkerSize} />
              </View>
            ))}
            {bar.red > 5 && (
              <Text style={[styles.count, { color: colors.text }]}>+{bar.red - 5}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
  },
  section: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  divider: {
    width: 1,
  },
  pieces: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkerWrap: {
    margin: 2,
  },
  count: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
});
