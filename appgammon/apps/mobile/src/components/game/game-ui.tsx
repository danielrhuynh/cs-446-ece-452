/** Game UI. */

import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { BorderRadius, Colors, Fonts, Layout, Shadows, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BackgammonBoard } from "./backgammon-board";
import { DiceDisplay } from "./dice-display";
import { DoublingCube } from "./doubling-cube";
import { EmoteArea } from "./emote-area";
import { Button } from "@/components/ui/button";
import {
  EMOTES,
  type GameState,
  type PlayerColor,
  type EmoteId,
  type LastEmote,
} from "@/types/game";

const EMOTE_DURATION_MS = 2000;

interface GameUIProps {
  gameState: GameState;
  playerColor: PlayerColor;
  player1Name?: string;
  player2Name?: string;
  onPointPress?: (pointIndex: number) => void;
  selectedPoint?: number | null;
  hintedDestinations?: number[];
  diceUsed?: boolean[] | null;
  onRollDice?: () => void;
  onSubmitMoves?: () => void;
  canSubmitMoves?: boolean;
  onEmoteSelect?: (emoteId: EmoteId) => void;
  onProposeDouble?: () => void;
  onAcceptDouble?: () => void;
  onDeclineDouble?: () => void;
  showEmotes?: boolean;
  showRaiseHint?: boolean;
  onDismissRaiseHint?: () => void;
}

function ScoreEmoteToast({
  lastEmote,
  showEmotes,
}: {
  lastEmote: LastEmote | null;
  showEmotes: boolean;
}) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [visibleEmote, setVisibleEmote] = useState<LastEmote | null>(null);

  useEffect(() => {
    if (!lastEmote || !showEmotes) {
      setVisibleEmote(null);
      return;
    }

    setVisibleEmote(lastEmote);
    const timeoutId = setTimeout(() => {
      setVisibleEmote((current) => (current?.timestamp === lastEmote.timestamp ? null : current));
    }, EMOTE_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [lastEmote, showEmotes]);

  const emote = useMemo(
    () =>
      visibleEmote ? (EMOTES.find((entry) => entry.id === visibleEmote.emoteId) ?? null) : null,
    [visibleEmote],
  );

  return (
    <View style={styles.eventOverlay} pointerEvents="none">
      <View style={[styles.eventSlot, styles.eventSlotStart]}>
        {visibleEmote?.fromPlayer === "white" && emote && (
          <Animated.View
            key={`${visibleEmote.emoteId}-${visibleEmote.timestamp}`}
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(250)}
            style={styles.toastWrap}
          >
            <View
              style={[
                styles.eventBubble,
                Shadows.sm,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.eventLabel, { color: colors.onPrimary }]}>{emote.label}</Text>
            </View>
          </Animated.View>
        )}
      </View>
      <View style={[styles.eventSlot, styles.eventSlotEnd]}>
        {visibleEmote?.fromPlayer === "red" && emote && (
          <Animated.View
            key={`${visibleEmote.emoteId}-${visibleEmote.timestamp}`}
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(250)}
            style={styles.toastWrap}
          >
            <View
              style={[
                styles.eventBubble,
                Shadows.sm,
                {
                  backgroundColor: colors.accent,
                },
              ]}
            >
              <Text style={[styles.eventLabel, { color: colors.onPrimary }]}>{emote.label}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export function GameUI({
  gameState,
  playerColor,
  player1Name = "Player 1",
  player2Name = "Player 2",
  onPointPress,
  selectedPoint,
  hintedDestinations = [],
  diceUsed,
  onRollDice,
  onSubmitMoves,
  canSubmitMoves = false,
  onEmoteSelect,
  onProposeDouble,
  onAcceptDouble,
  onDeclineDouble,
  showEmotes = true,
  showRaiseHint = false,
  onDismissRaiseHint,
}: GameUIProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const whiteName = playerColor === "white" ? "You" : player1Name;
  const redName = playerColor === "red" ? "You" : player2Name;
  const turnStatusText = gameState.currentPlayer === playerColor ? "Your turn" : "Opponent's turn";

  return (
    <View style={styles.container}>
      {/* Score */}
      <View style={styles.scoreWrap}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <View style={[styles.checkerDot, { backgroundColor: "#FAF7F2" }]} />
            <Text style={[styles.scoreLabel, { color: colors.text }]}>{whiteName}</Text>
            <Text style={[styles.scoreValue, { color: colors.primary }]}>
              {gameState.matchScore.white}
            </Text>
          </View>
          <Text style={[styles.scoreDivider, { color: colors.textMuted }]}>–</Text>
          <View style={styles.scoreItem}>
            <View style={[styles.checkerDot, { backgroundColor: "#8B0000" }]} />
            <Text style={[styles.scoreLabel, { color: colors.text }]}>{redName}</Text>
            <Text style={[styles.scoreValue, { color: colors.accent }]}>
              {gameState.matchScore.red}
            </Text>
          </View>
        </View>
        <ScoreEmoteToast lastEmote={gameState.lastEmote} showEmotes={showEmotes} />
      </View>

      {/* Board */}
      <BackgammonBoard
        board={gameState.board}
        playerColor={playerColor}
        onPointPress={onPointPress}
        selectedPoint={selectedPoint}
        hintedDestinations={hintedDestinations}
      />

      {/* Controls */}
      <View style={styles.controlsBlock}>
        {showRaiseHint && onDismissRaiseHint && (
          <View
            style={[
              styles.raiseHint,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.raiseHintText, { color: colors.textMuted }]}>
              Raise the stakes before rolling. Your opponent can accept or pass.
            </Text>
            <TouchableOpacity onPress={onDismissRaiseHint} activeOpacity={0.8}>
              <Text style={[styles.raiseHintAction, { color: colors.primary }]}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.controlsRow}>
          <View style={styles.sideSlot}>
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
          <View style={styles.diceSlot}>
            <DiceDisplay
              dice={gameState.dice}
              diceUsed={diceUsed}
              canRoll={gameState.canRoll}
              canSubmit={canSubmitMoves}
              turnStatusText={turnStatusText}
              onRoll={onRollDice}
            />
          </View>
          <View style={styles.sideSlot}>
            <EmoteArea onEmoteSelect={onEmoteSelect} />
          </View>
        </View>
      </View>

      {/* Submit moves */}
      {canSubmitMoves && onSubmitMoves && (
        <View style={styles.submitRow}>
          <Button title="Submit Moves" variant="primary" size="md" onPress={onSubmitMoves} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
    alignItems: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
  },
  scoreWrap: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    position: "relative",
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
  eventOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventSlot: {
    flex: 1,
    justifyContent: "center",
  },
  eventSlotStart: {
    alignItems: "flex-start",
  },
  eventSlotEnd: {
    alignItems: "flex-end",
  },
  toastWrap: {
    transform: [{ translateY: -28 }],
  },
  eventBubble: {
    minWidth: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  eventLabel: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },
  controlsBlock: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  raiseHint: {
    width: "100%",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  raiseHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.medium,
    lineHeight: 18,
  },
  raiseHintAction: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: Spacing.sm,
  },
  sideSlot: {
    width: 76,
    alignItems: "center",
  },
  diceSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  submitRow: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
  },
});
