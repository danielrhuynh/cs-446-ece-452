/**
 * Game Screen
 * Shows backgammon board, dice, doubling cube, emotes.
 */

import { useEffect, useRef, useCallback, useState } from "react";
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
import { cancelSession } from "@/lib/api";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";
import { BackButton } from "@/components/ui/back-button";
import { GameUI } from "@/components/game";
import {
  INITIAL_BOARD,
  type GameState,
  type PlayerColor,
  type EmoteId,
} from "@/types/game";

export default function GameScreen() {
  const router = useRouter();
  const { sessionId, isHost } = useLocalSearchParams<{
    sessionId: string;
    isHost?: string;
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const { session, lastEvent } = useSessionEvents(sessionId);
  const navigatedRef = useRef(false);
  const [gameState, setGameState] = useState<GameState>({
    board: INITIAL_BOARD,
    currentPlayer: "white",
    dice: null,
    doublingCube: 1,
    doublingCubeOwner: null,
    pendingDoubleProposal: false,
    matchScore: { white: 0, red: 0 },
    matchLength: 3,
    lastEmote: null,
    canMove: true,
    canProposeDouble: true,
  });
  const [emotesMuted, setEmotesMuted] = useState(false);

  const playerColor: PlayerColor = isHost === "true" ? "white" : "red";

  useEffect(() => {
    const shouldExitSession =
      lastEvent === "session_cancelled" || session?.status === "cancelled";

    if (shouldExitSession && !navigatedRef.current) {
      navigatedRef.current = true;
      router.replace("/");
    }
  }, [lastEvent, session, router]);

  const doLeave = useCallback(async () => {
    if (sessionId) {
      try {
        await cancelSession(sessionId);
      } catch {
        // Best-effort cancel
      }
    }
    router.replace("/");
  }, [router, sessionId]);

  const handleLeave = useCallback(() => {
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Are you sure you want to leave? The session will be cancelled."
        )
      ) {
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
      ]
    );
  }, [doLeave]);

  const handlePointPress = useCallback((pointIndex: number) => {
    // Placeholder: game logic will validate and update state via backend
    console.log("Point pressed:", pointIndex);
  }, []);

  const handleEmoteSelect = useCallback((emoteId: EmoteId) => {
    // Placeholder: send emote via backend, display locally
    setGameState((prev) => ({
      ...prev,
      lastEmote: {
        emoteId,
        fromPlayer: prev.currentPlayer,
        timestamp: Date.now(),
      },
    }));
  }, []);

  const handleProposeDouble = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      pendingDoubleProposal: true,
    }));
  }, []);

  const handleAcceptDouble = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      pendingDoubleProposal: false,
      doublingCube: prev.doublingCube * 2,
      doublingCubeOwner: prev.currentPlayer,
    }));
  }, []);

  const handleDeclineDouble = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      pendingDoubleProposal: false,
    }));
  }, []);

  if (!session) {
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
            gameState={gameState}
            playerColor={playerColor}
            player1Name={session.player_1?.name ?? undefined}
            player2Name={session.player_2?.name ?? undefined}
            onPointPress={handlePointPress}
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
