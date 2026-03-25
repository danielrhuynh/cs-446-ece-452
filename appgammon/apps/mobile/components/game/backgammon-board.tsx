/**
 * Main backgammon board with 24 points and center bar.
 * White (top): home 19-24, outer 13-18. Red (bottom): home 1-6, outer 7-12.
 */

import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Point } from "./point";
import { Bar } from "./bar";
import type { BoardState } from "@/types/game";

interface BackgammonBoardProps {
  board: BoardState;
  onPointPress?: (pointIndex: number) => void;
}

const POINTS_PER_ROW = 12;
const BAR_HEIGHT = 32;

export function BackgammonBoard({ board, onPointPress }: BackgammonBoardProps) {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const { boardWidth, boardHeight, pointWidth, pointHeight, checkerSize } =
    useMemo(() => {
      const padding = Spacing.lg * 2;
      const boardWidth = Math.min(width - padding, 400);
      const pointWidth = boardWidth / POINTS_PER_ROW;
      const pointHeight = Math.max(pointWidth * 4, 140);
      const boardHeight = pointHeight * 2 + BAR_HEIGHT;
      const checkerSize = Math.min(pointWidth * 0.7, 22);
      return {
        boardWidth,
        boardHeight,
        pointWidth,
        pointHeight,
        checkerSize,
      };
    }, [width]);

  // Top row: points 13-24 (indices 12-23), displayed right-to-left so 13 is left
  const topPoints = Array.from({ length: POINTS_PER_ROW }, (_, i) => 12 + i).reverse();
  // Bottom row: points 1-12 (indices 0-11), displayed left-to-right
  const bottomPoints = Array.from({ length: POINTS_PER_ROW }, (_, i) => i);

  return (
    <View style={styles.wrapper}>
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
              onPress={onPointPress ? () => onPointPress(pointIndex) : undefined}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    padding: Spacing.sm,
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
