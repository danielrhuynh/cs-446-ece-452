/**
 * Main backgammon board with 24 points and center bar.
 * Renders from the perspective of the given playerColor so the
 * player's home board is always at the bottom-right.
 */

import { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Point } from "./point";
import { Bar } from "./bar";
import { BearOffTray } from "./bear-off-tray";
import type { BoardState, PlayerColor } from "@/types/game";

interface BackgammonBoardProps {
  board: BoardState;
  playerColor: PlayerColor;
  onPointPress?: (pointIndex: number) => void;
  selectedPoint?: number | null;
}

const POINTS_PER_ROW = 12;
const BAR_HEIGHT = 32;

export function BackgammonBoard({
  board,
  playerColor,
  onPointPress,
  selectedPoint,
}: BackgammonBoardProps) {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const { boardWidth, pointWidth, pointHeight, checkerSize } = useMemo(() => {
    const padding = Spacing.lg * 2;
    const boardWidth = Math.min(width - padding, 400);
    const pointWidth = boardWidth / POINTS_PER_ROW;
    const pointHeight = Math.max(pointWidth * 4, 140);
    const checkerSize = Math.min(pointWidth * 0.7, 22);
    return {
      boardWidth,
      pointWidth,
      pointHeight,
      checkerSize,
    };
  }, [width]);

  // White perspective: top 13→24, bottom 12→1 (home bottom-right)
  // Red perspective:   top 12→1,  bottom 13→24 (home bottom-right)
  const topPoints =
    playerColor === "white"
      ? Array.from({ length: POINTS_PER_ROW }, (_, i) => 12 + i)
      : Array.from({ length: POINTS_PER_ROW }, (_, i) => i).reverse();
  const bottomPoints =
    playerColor === "white"
      ? Array.from({ length: POINTS_PER_ROW }, (_, i) => i).reverse()
      : Array.from({ length: POINTS_PER_ROW }, (_, i) => 12 + i);

  const trayHeight = pointHeight * 2 + BAR_HEIGHT;

  return (
    <View style={styles.wrapper}>
      <View style={styles.boardRow}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.board, { width: boardWidth, borderRadius: 12 }]}
        >
          {/* Top row: points 13-24, triangles point down */}
          <View style={[styles.row, { height: pointHeight }]}>
            {topPoints.map((pointIndex, i) => (
              <Point
                key={`top-${pointIndex}`}
                pointIndex={pointIndex}
                pointState={board.points[pointIndex]}
                isLight={i % 2 === 0}
                direction="down"
                width={pointWidth}
                height={pointHeight}
                checkerSize={checkerSize}
                selected={selectedPoint === pointIndex}
                onPress={onPointPress ? () => onPointPress(pointIndex) : undefined}
              />
            ))}
          </View>

          {/* Bar */}
          <Bar
            bar={board.bar}
            width={boardWidth}
            height={BAR_HEIGHT}
            checkerSize={checkerSize}
            onPress={onPointPress}
            selectedPoint={selectedPoint}
          />

          {/* Bottom row: points 1-12, triangles point up */}
          <View style={[styles.row, { height: pointHeight }]}>
            {bottomPoints.map((pointIndex, i) => (
              <Point
                key={`bottom-${pointIndex}`}
                pointIndex={pointIndex}
                pointState={board.points[pointIndex]}
                isLight={i % 2 === 1}
                direction="up"
                width={pointWidth}
                height={pointHeight}
                checkerSize={checkerSize}
                selected={selectedPoint === pointIndex}
                onPress={onPointPress ? () => onPointPress(pointIndex) : undefined}
              />
            ))}
          </View>
        </LinearGradient>

        {/* Bear-off tray */}
        <BearOffTray
          borneOff={board.borneOff}
          playerColor={playerColor}
          checkerSize={checkerSize}
          height={trayHeight}
          onPress={onPointPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    padding: Spacing.sm,
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.xs,
  },
  board: {
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.15)",
  },
  row: {
    flexDirection: "row",
  },
});
