/**
 * Center bar for captured pieces (hit checkers).
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Checker } from "./checker";
import type { BarState } from "@/types/game";

interface BarProps {
  bar: BarState;
  width: number;
  height: number;
  checkerSize: number;
  onPress?: (pointIndex: number) => void;
  selectedPoint?: number | null;
}

export function Bar({ bar, width, height, checkerSize, onPress, selectedPoint }: BarProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const whiteContent =
    bar.white > 0 ? (
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
    ) : null;

  const redContent =
    bar.red > 0 ? (
      <View style={styles.pieces}>
        {Array.from({ length: Math.min(bar.red, 5) }).map((_, i) => (
          <View key={`r-${i}`} style={styles.checkerWrap}>
            <Checker color="red" size={checkerSize} />
          </View>
        ))}
        {bar.red > 5 && <Text style={[styles.count, { color: colors.text }]}>+{bar.red - 5}</Text>}
      </View>
    ) : null;

  return (
    <View style={[styles.container, { width, height, backgroundColor: colors.primary }]}>
      {onPress && bar.white > 0 ? (
        <TouchableOpacity
          style={[styles.section, selectedPoint === -1 && styles.selected]}
          activeOpacity={0.7}
          onPress={() => onPress(-1)}
        >
          {whiteContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.section}>{whiteContent}</View>
      )}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {onPress && bar.red > 0 ? (
        <TouchableOpacity
          style={[styles.section, selectedPoint === 24 && styles.selected]}
          activeOpacity={0.7}
          onPress={() => onPress(24)}
        >
          {redContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.section}>{redContent}</View>
      )}
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
  selected: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.7)",
    borderRadius: 4,
  },
});
