/**
 * Single triangle point on the backgammon board.
 * Renders stacked checkers for white and red.
 */

import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
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
  selected?: boolean;
  hinted?: boolean;
  hintColor?: PlayerColor;
  onPress?: () => void;
}

export function Point({
  pointIndex: _pointIndex,
  pointState,
  isLight,
  direction,
  width,
  height,
  checkerSize,
  selected = false,
  hinted = false,
  hintColor,
  onPress,
}: PointProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const hintPulse = useSharedValue(0);
  const maxVisible = 5;

  const fillColor = isLight ? colors.secondaryLight : colors.secondary;
  const showHint = hinted && !selected;
  const hintTint =
    colorScheme === "dark" ? "rgba(116, 198, 157, 0.14)" : "rgba(91, 192, 190, 0.14)";
  const hintBorder =
    colorScheme === "dark" ? "rgba(116, 198, 157, 0.78)" : "rgba(91, 192, 190, 0.82)";
  const hintBadgeColor = colorScheme === "dark" ? "#74C69D" : "#5BC0BE";
  const hintPieceSize = Math.max(checkerSize - 1, 16);
  const stackStep = checkerSize + 4;
  const stackInset = Spacing.xs + 1;
  const hintLeft = (width - hintPieceSize) / 2;

  const ownCount =
    hintColor === "white" ? pointState.white : hintColor === "red" ? pointState.red : 0;
  const opponentCount =
    hintColor === "white" ? pointState.red : hintColor === "red" ? pointState.white : 0;
  const landingCount = !showHint || !hintColor ? 0 : ownCount > 0 ? ownCount + 1 : 1;
  const landingSlotIndex = Math.max(0, Math.min(landingCount, maxVisible) - 1);
  const hintOffset = stackInset + landingSlotIndex * stackStep;

  // Triangle points: base at bottom for "up", base at top for "down"
  const points =
    direction === "up"
      ? `0,${height} ${width / 2},0 ${width},${height}`
      : `0,0 ${width / 2},${height} ${width},0`;
  const hintPosition = direction === "up" ? { bottom: hintOffset } : { top: hintOffset };

  useEffect(() => {
    if (!showHint) {
      cancelAnimation(hintPulse);
      hintPulse.value = 0;
      return;
    }

    hintPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(hintPulse);
    };
  }, [hintPulse, showHint]);

  const hintCheckerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(hintPulse.value, [0, 1], [0.56, 0.82]),
    transform: [{ scale: interpolate(hintPulse.value, [0, 1], [0.96, 1.03]) }],
  }));

  const content = (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={styles.triangle}>
        <Polygon points={points} fill={fillColor} stroke={colors.border} strokeWidth={0.5} />
      </Svg>
      {selected && (
        <View
          style={[
            styles.selectedOverlay,
            {
              width,
              height,
              borderRadius: 4,
              backgroundColor: "rgba(255, 215, 0, 0.3)",
              borderColor: "rgba(255, 215, 0, 0.7)",
            },
          ]}
        />
      )}
      {showHint && (
        <View
          style={[
            styles.hintOverlay,
            {
              width,
              height,
              borderRadius: 4,
              backgroundColor: hintTint,
              borderColor: hintBorder,
            },
          ]}
        />
      )}
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
      {showHint && hintColor && (
        <Animated.View
          style={[
            styles.hintChecker,
            hintCheckerStyle,
            hintPosition,
            {
              left: hintLeft,
              width: hintPieceSize,
              height: hintPieceSize,
              borderRadius: hintPieceSize / 2,
              backgroundColor:
                opponentCount === 1 && ownCount === 0
                  ? `${hintBadgeColor}CC`
                  : `${hintBadgeColor}66`,
              borderColor: hintBadgeColor,
              shadowColor: hintBadgeColor,
            },
          ]}
        >
          <View style={styles.hintCheckerInner} />
        </Animated.View>
      )}
    </View>
  );

  function renderCheckers(count: number, color: PlayerColor) {
    const stack = [];
    const visibleCheckers = count > maxVisible ? maxVisible - 1 : count;

    for (let i = 0; i < visibleCheckers; i++) {
      stack.push(
        <View key={`${color}-${i}`} style={styles.checkerWrap}>
          <Checker color={color} size={checkerSize} />
        </View>,
      );
    }
    if (count > maxVisible) {
      stack.push(
        <View key={`${color}-overflow`} style={[styles.checkerWrap, styles.overflow]}>
          <Text style={[styles.overflowText, { color: colors.text }]}>+{count - maxVisible}</Text>
        </View>,
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
  selectedOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    borderWidth: 2,
  },
  hintOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    borderWidth: 1.5,
  },
  hintChecker: {
    position: "absolute",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  hintCheckerInner: {
    width: "48%",
    height: "48%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
