/**
 * Bear-off tray showing borne-off checkers.
 * Tappable as a destination when bearing off.
 */

import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Checker } from "./checker";
import type { BorneOffState, PlayerColour } from "@/types/game";

interface BearOffTrayProps {
  borneOff: BorneOffState;
  playerColor: PlayerColour;
  checkerSize: number;
  height: number;
  onPress?: (pointIndex: number) => void;
  hinted?: boolean;
}

export function BearOffTray({
  borneOff,
  playerColor,
  checkerSize,
  height,
  onPress,
  hinted = false,
}: BearOffTrayProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const hintPulse = useSharedValue(0);

  // Player1 (white) bears off to 24, player2 (red) bears off to -1
  const bearOffIndex = playerColor === "white" ? 24 : -1;
  const count = playerColor === "white" ? borneOff.white : borneOff.red;
  const hintBorder =
    colorScheme === "dark" ? "rgba(116, 198, 157, 0.85)" : "rgba(91, 192, 190, 0.88)";
  const hintBackground =
    colorScheme === "dark" ? "rgba(116, 198, 157, 0.14)" : "rgba(91, 192, 190, 0.14)";
  const hintBadgeColor = colorScheme === "dark" ? "#74C69D" : "#5BC0BE";

  useEffect(() => {
    if (!hinted) {
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
  }, [hintPulse, hinted]);

  const hintBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(hintPulse.value, [0, 1], [0.82, 1]),
    transform: [{ scale: interpolate(hintPulse.value, [0, 1], [0.94, 1.12]) }],
  }));

  const content = (
    <View
      style={[
        styles.tray,
        { height, backgroundColor: colors.primaryLight },
        hinted && styles.hinted,
        hinted && { backgroundColor: hintBackground, borderColor: hintBorder },
      ]}
    >
      {hinted && (
        <Animated.View
          style={[
            styles.hintBadge,
            hintBadgeStyle,
            { backgroundColor: hintBadgeColor, shadowColor: hintBadgeColor },
          ]}
        >
          <View style={styles.hintBadgeInner} />
        </Animated.View>
      )}
      {count > 0 && (
        <View style={styles.pieces}>
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <View key={i} style={styles.checkerWrap}>
              <Checker color={playerColor} size={checkerSize * 0.8} />
            </View>
          ))}
          {count > 5 && <Text style={[styles.count, { color: colors.text }]}>{count}</Text>}
        </View>
      )}
      <Text style={[styles.label, { color: colors.textMuted }]}>OFF</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(bearOffIndex)}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  tray: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    minWidth: 36,
  },
  pieces: {
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
  },
  checkerWrap: {
    marginVertical: -2,
  },
  count: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    marginTop: 2,
  },
  label: {
    fontSize: 9,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  hinted: {
    borderWidth: 2,
  },
  hintBadge: {
    position: "absolute",
    top: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  hintBadgeInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
});
