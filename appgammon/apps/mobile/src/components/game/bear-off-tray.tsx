/**
 * Bear-off tray showing borne-off checkers.
 * Tappable as a destination when bearing off.
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Checker } from "./checker";
import type { BorneOffState, PlayerColor } from "@/types/game";

interface BearOffTrayProps {
  borneOff: BorneOffState;
  playerColor: PlayerColor;
  checkerSize: number;
  height: number;
  onPress?: (pointIndex: number) => void;
}

export function BearOffTray({
  borneOff,
  playerColor,
  checkerSize,
  height,
  onPress,
}: BearOffTrayProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Player1 (white) bears off to 24, player2 (red) bears off to -1
  const bearOffIndex = playerColor === "white" ? 24 : -1;
  const count = playerColor === "white" ? borneOff.white : borneOff.red;

  const content = (
    <View style={[styles.tray, { height, backgroundColor: colors.primaryLight }]}>
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
});
