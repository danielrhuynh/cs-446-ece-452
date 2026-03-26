/**
 * Composes the full backgammon game UI: board, dice, doubling cube, emotes.
 */

import { View, Text, StyleSheet } from "react-native";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BackgammonBoard } from "./backgammon-board";
import { DiceDisplay } from "./dice-display";
import { DoublingCube } from "./doubling-cube";
import { EmoteArea } from "./emote-area";
import type { GameState, PlayerColor, EmoteId } from "@/types/game";

interface GameUIProps {
  gameState: GameState;
  playerColor: PlayerColor;
  player1Name?: string;
  player2Name?: string;
  onPointPress?: (pointIndex: number) => void;
  onEmoteSelect?: (emoteId: EmoteId) => void;
  onProposeDouble?: () => void;
  onAcceptDouble?: () => void;
  onDeclineDouble?: () => void;
  emotesMuted?: boolean;
  onEmotesMutedChange?: (muted: boolean) => void;
}

export function GameUI({
  gameState,
  playerColor,
  player1Name = "Player 1",
  player2Name = "Player 2",
  onPointPress,
  onEmoteSelect,
  onProposeDouble,
  onAcceptDouble,
  onDeclineDouble,
  emotesMuted = false,
  onEmotesMutedChange,
}: GameUIProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const whiteName = playerColor === "white" ? "You" : player1Name;
  const redName = playerColor === "red" ? "You" : player2Name;

  return (
    <View style={styles.container}>
      {/* Score display */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreItem}>
          <View style={[styles.checkerDot, { backgroundColor: "#FAF7F2" }]} />
          <Text style={[styles.scoreLabel, { color: colors.text }]}>
            {whiteName}
          </Text>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>
            {gameState.matchScore.white}
          </Text>
        </View>
        <Text style={[styles.scoreDivider, { color: colors.textMuted }]}>
          –
        </Text>
        <View style={styles.scoreItem}>
          <View style={[styles.checkerDot, { backgroundColor: "#8B0000" }]} />
          <Text style={[styles.scoreLabel, { color: colors.text }]}>
            {redName}
          </Text>
          <Text style={[styles.scoreValue, { color: colors.accent }]}>
            {gameState.matchScore.red}
          </Text>
        </View>
      </View>

      {/* Board */}
      <BackgammonBoard board={gameState.board} playerColor={playerColor} onPointPress={onPointPress} />

      {/* Controls row: dice + doubling cube + emotes */}
      <View style={styles.controlsRow}>
        <View style={styles.controlsSection}>
          <DiceDisplay dice={gameState.dice} />
        </View>
        <View style={styles.controlsSection}>
          <DoublingCube
            value={gameState.doublingCube}
            owner={gameState.doublingCubeOwner}
            pendingProposal={gameState.pendingDoubleProposal}
            canPropose={gameState.canProposeDouble}
            currentPlayer={gameState.currentPlayer}
            onProposeDouble={onProposeDouble}
            onAcceptDouble={onAcceptDouble}
            onDeclineDouble={onDeclineDouble}
          />
        </View>
        <View style={styles.controlsSection}>
          <EmoteArea
            lastEmote={gameState.lastEmote}
            emotesMuted={emotesMuted}
            onEmoteSelect={onEmoteSelect}
            onMuteToggle={onEmotesMutedChange}
          />
        </View>
      </View>

      {/* Turn indicator */}
      <Text style={[styles.turnIndicator, { color: colors.textMuted }]}>
        {gameState.currentPlayer === playerColor
          ? "Your turn"
          : "Opponent's turn"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  scoreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  checkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  scoreDivider: {
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  controlsSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  turnIndicator: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: "center",
  },
});
