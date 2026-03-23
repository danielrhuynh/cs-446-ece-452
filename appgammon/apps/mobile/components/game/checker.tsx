/**
 * Single checker (piece) for backgammon board.
 * White or red, with subtle shadow for depth.
 */

import { View, StyleSheet } from "react-native";
import { Colors, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { PlayerColor } from "@/types/game";

interface CheckerProps {
  color: PlayerColor;
  size?: number;
}

export function Checker({ color, size = 24 }: CheckerProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const backgroundColor =
    color === "white"
      ? colorScheme === "dark"
        ? "#F5F0E8"
        : "#FAF7F2"
      : colorScheme === "dark"
        ? "#C1121F"
        : "#8B0000";

  return (
    <View
      style={[
        styles.checker,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          ...Shadows.sm,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  checker: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
});
