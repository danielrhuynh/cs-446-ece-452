/**
 * Game Screen
 * Shows backgammon board, dice, doubling cube, emotes.
 * All gameplay state is server-driven via SSE.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Colors, Spacing, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSessionEvents } from "@/hooks/use-session-events";
import { useGameEvents } from "@/hooks/use-game-events";
import {
  cancelSession,
  rollDice,
  submitMoves,
  proposeDouble,
  respondToDouble,
  sendEmote,
} from "@/lib/api";
import { mapServerToUIGameState } from "@/lib/game-state-mapper";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";
import { BackButton } from "@/components/ui/back-button";
import { GameUI } from "@/components/game";
import type { PlayerColor, EmoteId, LastEmote } from "@/types/game";
import {
  type Move,
  type Board,
  type Bar,
  type BorneOff,
  type DiceUsed,
  type PlayerRole,
  colorToRole,
  getAvailableDice,
  getValidMoves,
  getDieValueForMove,
  markDieUsed,
  applyMove,
  initializeDiceUsed,
} from "@appgammon/common";

export default function GameScreen() {
  const router = useRouter();
  const { sessionId, isHost } = useLocalSearchParams<{
    sessionId: string;
    isHost?: string;
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const isHostBool = isHost === "true";

  const { session, lastEvent: sessionLastEvent } = useSessionEvents(sessionId);
  const {
    seriesState,
    doubleProposal,
    lastEmote: sseEmote,
    gameOverInfo,
    seriesCompleteInfo,
  } = useGameEvents(sessionId);

  const navigatedRef = useRef(false);

  // Derive player identity from session
  const player1Id = session?.player_1_id ?? "";
  const myPlayerId = isHostBool ? session?.player_1_id ?? "" : session?.player_2_id ?? "";
  const playerColor: PlayerColor = isHostBool ? "white" : "red";
  const myRole: PlayerRole = colorToRole(playerColor);

  // ── Move selection state ──
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);

  // ── Emote state ──
  const [emotesMuted, setEmotesMuted] = useState(false);
  const [lastEmote, setLastEmote] = useState<LastEmote | null>(null);

  // Convert incoming SSE emote (UUID-based) to UI emote (color-based)
  useEffect(() => {
    if (!sseEmote || emotesMuted) return;
    const fromColor: PlayerColor = sseEmote.fromPlayer === player1Id ? "white" : "red";
    setLastEmote({
      emoteId: sseEmote.emoteId as EmoteId,
      fromPlayer: fromColor,
      timestamp: sseEmote.timestamp,
    });
  }, [sseEmote, player1Id, emotesMuted]);

  // ── Working game state with pending moves applied ──
  const serverGame = seriesState?.currentGame ?? null;

  const workingState = useMemo(() => {
    if (!serverGame) return null;

    let board: Board = [...serverGame.board];
    let bar: Bar = { ...serverGame.bar };
    let borneOff: BorneOff = { ...serverGame.borneOff };
    let diceUsed: DiceUsed = serverGame.diceUsed
      ? [...serverGame.diceUsed]
      : initializeDiceUsed(serverGame.dice ?? [1, 1]);

    for (const move of pendingMoves) {
      const result = applyMove(board, bar, borneOff, move, myRole);
      board = result.board;
      bar = result.bar;
      borneOff = result.borneOff;
      diceUsed = markDieUsed(serverGame.dice ?? [1, 1], diceUsed, getDieValueForMove(move, myRole));
    }

    return { board, bar, borneOff, diceUsed };
  }, [serverGame, pendingMoves, myRole]);

  // Reset pending moves when server game version changes (new turn / new game)
  const gameVersionRef = useRef<number | null>(null);
  useEffect(() => {
    if (!serverGame) return;
    if (gameVersionRef.current !== null && gameVersionRef.current !== serverGame.version) {
      setPendingMoves([]);
      setSelectedFrom(null);
    }
    gameVersionRef.current = serverGame.version;
  }, [serverGame]);

  // ── Map server state to UI state ──
  const uiGameState = useMemo(() => {
    if (!seriesState) return null;

    const mapped = mapServerToUIGameState(
      seriesState,
      player1Id,
      myPlayerId,
      doubleProposal !== null,
      lastEmote,
    );

    // Override board with working state (pending moves applied) for preview
    if (workingState && seriesState.currentGame) {
      mapped.board = {
        points: workingState.board.map((val) => ({
          white: Math.max(0, val),
          red: Math.abs(Math.min(0, val)),
        })),
        bar: {
          white: workingState.bar.player1,
          red: workingState.bar.player2,
        },
      };
    }

    return mapped;
  }, [seriesState, player1Id, myPlayerId, doubleProposal, lastEmote, workingState]);

  // ── Session cancellation navigation ──
  useEffect(() => {
    const shouldExitSession =
      sessionLastEvent === "session_cancelled" || session?.status === "cancelled";
    if (shouldExitSession && !navigatedRef.current) {
      navigatedRef.current = true;
      router.replace("/");
    }
  }, [sessionLastEvent, session, router]);

  // ── Game over / series complete alerts ──
  useEffect(() => {
    if (!gameOverInfo) return;
    const iWon = gameOverInfo.winnerId === myPlayerId;
    Alert.alert(
      iWon ? "You won this game!" : "You lost this game",
      `Score: ${gameOverInfo.player1Score} – ${gameOverInfo.player2Score}`,
    );
  }, [gameOverInfo, myPlayerId]);

  useEffect(() => {
    if (!seriesCompleteInfo) return;
    const iWon = seriesCompleteInfo.winnerId === myPlayerId;
    Alert.alert(
      iWon ? "You won the match!" : "Match over",
      `Final score: ${seriesCompleteInfo.player1Score} – ${seriesCompleteInfo.player2Score}`,
      [{ text: "OK", onPress: () => { navigatedRef.current = true; router.replace("/"); } }],
    );
  }, [seriesCompleteInfo, myPlayerId, router]);

  // ── Actions ──

  const doLeave = useCallback(async () => {
    if (sessionId) {
      try { await cancelSession(sessionId); } catch { /* best-effort */ }
    }
    router.replace("/");
  }, [router, sessionId]);

  const handleLeave = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to leave? The session will be cancelled.")) {
        void doLeave();
      }
      return;
    }
    Alert.alert(
      "Leave Game",
      "Are you sure you want to leave? The session will be cancelled.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => void doLeave() },
      ],
    );
  }, [doLeave]);

  const handleRollDice = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    try {
      await rollDice(sessionId, serverGame.id);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to roll dice");
    }
  }, [sessionId, serverGame]);

  const handlePointPress = useCallback(
    (pointIndex: number) => {
      if (!serverGame || !workingState || !uiGameState?.canMove) return;
      const dice = serverGame.dice;
      if (!dice) return;

      const available = getAvailableDice(dice, workingState.diceUsed);
      if (available.length === 0) return;

      if (selectedFrom === null) {
        // Check if this point has a checker we can move
        const hasValidMove = available.some((die) => {
          const validMoves = getValidMoves(
            workingState.board, workingState.bar, workingState.borneOff, myRole, die,
          );
          return validMoves.some((m) => m.from === pointIndex);
        });
        if (hasValidMove) {
          setSelectedFrom(pointIndex);
        }
      } else {
        // Try to make a move from selectedFrom to pointIndex
        const move: Move = { from: selectedFrom, to: pointIndex };
        const dieValue = getDieValueForMove(move, myRole);
        const isAvailable = available.includes(dieValue);

        if (isAvailable) {
          const validMoves = getValidMoves(
            workingState.board, workingState.bar, workingState.borneOff, myRole, dieValue,
          );
          const isValid = validMoves.some((m) => m.from === move.from && m.to === move.to);
          if (isValid) {
            setPendingMoves((prev) => [...prev, move]);
            setSelectedFrom(null);
            return;
          }
        }
        // Invalid destination — deselect
        setSelectedFrom(null);
      }
    },
    [serverGame, workingState, uiGameState?.canMove, selectedFrom, myRole],
  );

  const handleSubmitMoves = useCallback(async () => {
    if (!sessionId || !serverGame || pendingMoves.length === 0) return;
    try {
      await submitMoves(sessionId, serverGame.id, serverGame.version, pendingMoves);
      setPendingMoves([]);
      setSelectedFrom(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Version mismatch")) {
        setPendingMoves([]);
        setSelectedFrom(null);
      }
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to submit moves");
    }
  }, [sessionId, serverGame, pendingMoves]);

  const handleProposeDouble = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    try {
      await proposeDouble(sessionId, serverGame.id);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to propose double");
    }
  }, [sessionId, serverGame]);

  const handleAcceptDouble = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    try {
      await respondToDouble(sessionId, serverGame.id, "accept");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to accept double");
    }
  }, [sessionId, serverGame]);

  const handleDeclineDouble = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    try {
      await respondToDouble(sessionId, serverGame.id, "decline");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to decline double");
    }
  }, [sessionId, serverGame]);

  const handleEmoteSelect = useCallback(
    async (emoteId: EmoteId) => {
      if (!sessionId) return;
      // Show locally immediately
      setLastEmote({ emoteId, fromPlayer: playerColor, timestamp: Date.now() });
      try {
        await sendEmote(sessionId, emoteId);
      } catch {
        // Best-effort, rate limiting handled server-side
      }
    },
    [sessionId, playerColor],
  );

  // ── Derived: can submit moves? ──
  const canSubmitMoves = pendingMoves.length > 0 && !!uiGameState?.canMove;

  // ── Loading ──
  if (!session || !uiGameState) {
    return (
      <ScreenContainer>
        <View style={styles.headerWrap}>
          <BackButton onPress={handleLeave} />
        </View>
        <View style={styles.center}>
          <LiquidGlass style={[styles.loadingCard, Shadows.md]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </LiquidGlass>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <BackButton onPress={handleLeave} />
      </View>
      <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <GameUI
            gameState={uiGameState}
            playerColor={playerColor}
            player1Name={session.player_1?.name ?? undefined}
            player2Name={session.player_2?.name ?? undefined}
            onPointPress={handlePointPress}
            onRollDice={handleRollDice}
            onSubmitMoves={handleSubmitMoves}
            canSubmitMoves={canSubmitMoves}
            onEmoteSelect={handleEmoteSelect}
            onProposeDouble={handleProposeDouble}
            onAcceptDouble={handleAcceptDouble}
            onDeclineDouble={handleDeclineDouble}
            emotesMuted={emotesMuted}
            onEmotesMutedChange={setEmotesMuted}
          />
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    alignItems: "flex-start",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    width: 100,
    height: 100,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xxl,
  },
});
