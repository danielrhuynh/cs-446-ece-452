/**
 * Game Screen
 * Shows backgammon board, dice, doubling cube, emotes.
 * All gameplay state is server-driven via SSE.
 */

import { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Platform, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Colors, Spacing, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useGameViewModel } from "@/hooks/use-game-view-model";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";
import { BackButton } from "@/components/ui/back-button";
import { GameUI } from "@/components/game";

export default function GameScreen() {
  const router = useRouter();
  const { sessionId, isHost } = useLocalSearchParams<{
    sessionId: string;
    isHost?: string;
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const isHostBool = isHost === "true";
  const navigatedRef = useRef(false);

  const {
    session,
    uiGameState,
    playerColor,
    selectedPoint,
    emotesMuted,
    setEmotesMuted,
    shouldExitSession,
    gameOverInfo,
    seriesCompleteInfo,
    isLoading,
    canSubmitMoves,
    actions,
  } = useGameViewModel(sessionId, isHostBool);

  const myPlayerId = isHostBool ? (session?.player_1_id ?? "") : (session?.player_2_id ?? "");

  useEffect(() => {
    if (shouldExitSession && !navigatedRef.current) {
      navigatedRef.current = true;
      router.replace("/");
    }
  }, [router, shouldExitSession]);

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
      [
        {
          text: "OK",
          onPress: () => {
            navigatedRef.current = true;
            router.replace("/");
          },
        },
      ],
    );
  }, [myPlayerId, router, seriesCompleteInfo]);

  const doLeave = useCallback(async () => {
    await actions.leaveSession();
    router.replace("/");
  }, [actions, router]);

  const handleLeave = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to leave? The session will be cancelled.")) {
        void doLeave();
      }
      return;
    }

    Alert.alert("Leave Game", "Are you sure you want to leave? The session will be cancelled.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => void doLeave() },
    ]);
  }, [doLeave]);

  const wrapAction = useCallback(
    (message: string, fn: () => Promise<void>) => async () => {
      try {
        await fn();
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : message);
      }
    },
    [],
  );

  if (isLoading || !session || !uiGameState) {
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
            onPointPress={actions.onPointPress}
            selectedPoint={selectedPoint}
            onRollDice={wrapAction("Failed to roll dice", actions.onRollDice)}
            onSubmitMoves={wrapAction("Failed to submit moves", actions.onSubmitMoves)}
            canSubmitMoves={canSubmitMoves}
            onEmoteSelect={actions.onEmoteSelect}
            onProposeDouble={wrapAction("Failed to propose double", actions.onProposeDouble)}
            onAcceptDouble={wrapAction("Failed to accept double", actions.onAcceptDouble)}
            onDeclineDouble={wrapAction("Failed to decline double", actions.onDeclineDouble)}
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
