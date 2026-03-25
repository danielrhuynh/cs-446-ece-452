/**
 * Single triangle point on the backgammon board.
 * Renders stacked checkers for white and red.
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Checker } from "./checker";
import type { PointState as PointStateType, PlayerColor } from "@/types/game";

interface PointProps {
  pointIndex: number;
  pointState: PointStateType;
  isLight: boolean;
  direction: "up" | "down";
  width: number;
  height: number;
  checkerSize: number;
  onPress?: () => void;
}

export function Point({
  pointIndex,
  pointState,
  isLight,
  direction,
  width,
  height,
  checkerSize,
  onPress,
}: PointProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const fillColor = isLight ? colors.secondaryLight : colors.secondary;

  // Triangle points: base at bottom for "up", base at top for "down"
  const points =
    direction === "up"
      ? `0,${height} ${width / 2},0 ${width},${height}`
      : `0,0 ${width / 2},${height} ${width},0`;

  const content = (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={styles.triangle}>
        <Polygon points={points} fill={fillColor} stroke={colors.border} strokeWidth={0.5} />
      </Svg>
      <View
        style={[
          styles.checkersContainer,
          {
            width,
            [direction === "up" ? "bottom" : "top"]: Spacing.xs,
            flexDirection: direction === "up" ? "column-reverse" : "column",
            alignItems: "center",
          },
        ]}
        pointerEvents="none"
      >
        {renderCheckers(pointState.white, "white")}
        {renderCheckers(pointState.red, "red")}
      </View>
    </View>
  );

  function renderCheckers(count: number, color: PlayerColor) {
    const maxVisible = 5;
    const stack = [];
    for (let i = 0; i < Math.min(count, maxVisible); i++) {
      stack.push(
        <View key={`${color}-${i}`} style={styles.checkerWrap}>
          <Checker color={color} size={checkerSize} />
        </View>
      );
    }
    if (count > maxVisible) {
      stack.push(
        <View key={`${color}-overflow`} style={[styles.checkerWrap, styles.overflow]}>
          <Text style={[styles.overflowText, { color: colors.text }]}>
            +{count - maxVisible}
          </Text>
        </View>
      );
    }
    return stack;
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  triangle: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  checkersContainer: {
    position: "absolute",
    left: 0,
    justifyContent: "flex-start",
    gap: 2,
  },
  checkerWrap: {
    marginVertical: 1,
  },
  overflow: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  overflowText: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
  },
});
