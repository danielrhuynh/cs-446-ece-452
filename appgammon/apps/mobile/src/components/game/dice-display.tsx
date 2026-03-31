/**
 * Dice display for backgammon.
 * Shows die values with pip layout. Roll animation when values change.
 */

import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
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
  canRoll?: boolean;
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

function SingleDie({ value, size = 44 }: { value: number; size?: number }) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.2, { duration: 80 }), withTiming(1, { duration: 120 }));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pipSize = size / 6;
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
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <View style={[styles.grid, { width: size, height: size }]}>
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => {
              const hasPip = pips.some((p) => p.row === row && p.col === col);
              return (
                <View
                  key={`${row}-${col}`}
                  style={[
                    styles.cell,
                    {
                      width: size / 3,
                      height: size / 3,
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
                          backgroundColor: colors.text,
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

export function DiceDisplay({ dice, canRoll, onRoll }: DiceDisplayProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

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
      <View style={styles.container}>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SingleDie value={dice[0]} />
      <SingleDie value={dice[1]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  die: {
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
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
