/**
 * Dice display for backgammon.
 * Shows die values with pip layout. Roll animation when values change.
 */

import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface DiceDisplayProps {
  dice: [number, number] | null;
  diceUsed?: boolean[] | null;
  canRoll?: boolean;
  canSubmit?: boolean;
  turnStatusText?: string;
  onRoll?: () => void;
}

const PIP_POSITIONS: Record<number, { row: number; col: number }[]> = {
  1: [{ row: 1, col: 1 }],
  2: [
    { row: 0, col: 0 },
    { row: 2, col: 2 },
  ],
  3: [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 2 },
  ],
  4: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
  ],
  5: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
  ],
  6: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 1, col: 2 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
  ],
};

function SingleDie({
  value,
  size = 44,
  used = false,
}: {
  value: number;
  size?: number;
  used?: boolean;
}) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.2, { duration: 80 }), withTiming(1, { duration: 120 }));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [1, 1.2], [used ? 0.42 : 1, used ? 0.48 : 1]),
    transform: [{ scale: used ? scale.value * 0.97 : scale.value }],
  }));

  const faceInset = Math.max(6, Math.round(size * 0.14));
  const faceSize = size - faceInset * 2;
  const pipSize = faceSize / 6;
  const pips = PIP_POSITIONS[value] ?? [];

  return (
    <Animated.View style={animatedStyle}>
      <LiquidGlass
        style={[
          styles.die,
          {
            width: size,
            height: size,
            borderRadius: BorderRadius.md,
            borderColor: used ? colors.border : colors.glassBorder,
          },
        ]}
      >
        {used && <View style={[styles.usedScrim, { borderRadius: BorderRadius.md }]} />}
        <View
          style={[
            styles.face,
            {
              width: faceSize,
              height: faceSize,
            },
          ]}
        >
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => {
              const hasPip = pips.some((p) => p.row === row && p.col === col);
              return (
                <View
                  key={`${row}-${col}`}
                  style={[
                    styles.cell,
                    {
                      width: faceSize / 3,
                      height: faceSize / 3,
                    },
                  ]}
                >
                  {hasPip && (
                    <View
                      style={[
                        styles.pip,
                        {
                          width: pipSize,
                          height: pipSize,
                          borderRadius: pipSize / 2,
                          backgroundColor: used ? colors.textMuted : colors.text,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            }),
          )}
        </View>
      </LiquidGlass>
    </Animated.View>
  );
}

export function DiceDisplay({
  dice,
  diceUsed,
  canRoll,
  canSubmit,
  turnStatusText,
  onRoll,
}: DiceDisplayProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const dieSize = 44;

  if (!dice) {
    const Wrapper = canRoll && onRoll ? TouchableOpacity : View;
    const wrapperProps =
      canRoll && onRoll
        ? {
            onPress: onRoll,
            activeOpacity: 0.7,
            accessibilityLabel: "Roll dice",
            accessibilityRole: "button" as const,
          }
        : {};
    return (
      <View style={styles.block}>
        <Wrapper {...wrapperProps}>
          <LiquidGlass
            style={[
              styles.placeholder,
              {
                borderColor: canRoll ? colors.primary : colors.glassBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.placeholderText,
                { color: canRoll ? colors.primary : colors.textMuted },
              ]}
            >
              Roll
            </Text>
          </LiquidGlass>
        </Wrapper>
        {turnStatusText && (
          <Text style={[styles.statusText, { color: colors.textMuted }]}>{turnStatusText}</Text>
        )}
      </View>
    );
  }

  const isDoubles = dice[0] === dice[1];
  const usage = diceUsed ?? Array.from({ length: isDoubles ? 4 : 2 }, () => false);
  const remainingCount = usage.filter((used) => !used).length;
  const usedCount = usage.length - remainingCount;
  const statusLabel =
    canSubmit && remainingCount === 0
      ? "Ready to submit"
      : canSubmit && usedCount > 0
        ? "Moves queued"
        : null;
  const footerLabel = [turnStatusText, statusLabel].filter(Boolean).join(" · ");
  const indicatorGroups = isDoubles
    ? [usage.slice(0, 2), usage.slice(2, 4)]
    : [[usage[0]], [usage[1]]];

  return (
    <View style={styles.block}>
      <View style={styles.container}>
        {[dice[0], dice[1]].map((value, dieIndex) => (
          <View key={`${value}-${dieIndex}`} style={styles.dieColumn}>
            <SingleDie value={value} size={dieSize} used={!isDoubles && usage[dieIndex]} />
            <View style={styles.dieIndicatorRow}>
              {indicatorGroups[dieIndex].map((used, indicatorIndex) => (
                <View
                  key={`${value}-${dieIndex}-${indicatorIndex}`}
                  style={[
                    styles.usagePill,
                    indicatorGroups[dieIndex].length === 1
                      ? styles.usagePillSingle
                      : styles.usagePillDouble,
                    {
                      backgroundColor: used ? colors.primary : "transparent",
                      borderColor: used ? colors.primary : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      {footerLabel && (
        <Text style={[styles.statusText, { color: colors.textMuted }]}>{footerLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: Spacing.md,
  },
  dieColumn: {
    width: 44,
    alignItems: "center",
    gap: 6,
  },
  die: {
    justifyContent: "center",
    alignItems: "center",
  },
  face: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
  },
  pip: {
    opacity: 0.9,
  },
  usedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  dieIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 10,
    gap: 4,
  },
  usagePill: {
    height: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  usagePillSingle: {
    width: 32,
  },
  usagePillDouble: {
    width: 14,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  placeholder: {
    width: 88,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
});
