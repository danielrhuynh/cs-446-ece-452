/** Game screen. */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { BorderRadius, Colors, Fonts, Spacing, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useGameViewModel } from "@/hooks/use-game-view-model";
import {
  clearActiveSession,
  clearAuthToken,
  getHasSeenRaiseHint,
  getPlayTurnSound,
  getShowEmotes,
  setHasSeenRaiseHint,
  setPlayTurnSound,
  setShowEmotes,
} from "@/lib/storage";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { SessionShareCard } from "@/components/ui/session-share-card";
import { GameUI } from "@/components/game";

const TURN_CHIME = require("../../assets/sounds/turn-chime.wav");

function formatReconnectCountdown(deadline: string | null, now: number) {
  if (!deadline) return "Waiting for them to reconnect.";

  const remainingMs = Math.max(0, new Date(deadline).getTime() - now);
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);

  return remainingMs > 0
    ? `Seat reserved for ${minutes}:${String(seconds).padStart(2, "0")}.`
    : "Grace period elapsed. You can keep waiting or leave the session.";
}

function GameMenuButton({ onPress }: { onPress: () => void }) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Open game settings"
    >
      <LiquidGlass style={[styles.menuButton, Shadows.sm]}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </LiquidGlass>
    </TouchableOpacity>
  );
}

function GameMenuModal({
  visible,
  showEmotes,
  playTurnSound,
  onClose,
  onShowEmotesChange,
  onPlayTurnSoundChange,
}: {
  visible: boolean;
  showEmotes: boolean;
  playTurnSound: boolean;
  onClose: () => void;
  onShowEmotesChange: (value: boolean) => void;
  onPlayTurnSoundChange: (value: boolean) => void;
}) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Pressable>
          <View
            style={[
              styles.menuCard,
              Shadows.md,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Game settings</Text>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                accessibilityLabel="Close game settings"
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuRow}>
              <View style={styles.menuCopy}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Show emotes</Text>
                <Text style={[styles.menuHelp, { color: colors.textMuted }]}>
                  Show live reactions near player names.
                </Text>
              </View>
              <Switch
                value={showEmotes}
                onValueChange={onShowEmotesChange}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={showEmotes ? colors.primary : colors.cardBackground}
              />
            </View>

            <View style={styles.menuRow}>
              <View style={styles.menuCopy}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Turn sound</Text>
                <Text style={[styles.menuHelp, { color: colors.textMuted }]}>
                  Play a short chime when it becomes your turn.
                </Text>
              </View>
              <Switch
                value={playTurnSound}
                onValueChange={onPlayTurnSoundChange}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={playTurnSound ? colors.primary : colors.cardBackground}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  const previousTurnRef = useRef<boolean | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmotes, setShowEmotesState] = useState<boolean | null>(null);
  const [playTurnSound, setPlayTurnSoundState] = useState<boolean | null>(null);
  const [hasSeenRaiseHint, setHasSeenRaiseHintState] = useState<boolean | null>(null);
  const turnPlayer = useAudioPlayer(TURN_CHIME);

  const {
    session,
    uiGameState,
    playerColor,
    selectedPoint,
    hintedDestinations,
    diceUsed,
    opponentDisconnected,
    reconnectDeadlineAt,
    shouldExitSession,
    gameOverInfo,
    matchCompleteInfo,
    isLoading,
    canSubmitMoves,
    actions,
  } = useGameViewModel(sessionId, isHostBool);
  const [now, setNow] = useState(() => Date.now());

  const myPlayerId = isHostBool ? (session?.player_1_id ?? "") : (session?.player_2_id ?? "");
  const isMyTurn = !!uiGameState && uiGameState.currentPlayer === playerColor;
  const shouldShowRaiseHint =
    hasSeenRaiseHint === false &&
    !!uiGameState &&
    (uiGameState.canProposeDouble || uiGameState.pendingDoubleProposal);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [storedShowEmotes, storedPlayTurnSound, storedHasSeenRaiseHint] = await Promise.all([
        getShowEmotes(),
        getPlayTurnSound(),
        getHasSeenRaiseHint(),
      ]);

      if (cancelled) return;
      setShowEmotesState(storedShowEmotes);
      setPlayTurnSoundState(storedPlayTurnSound);
      setHasSeenRaiseHintState(storedHasSeenRaiseHint);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => {
      // Best-effort audio mode setup for short UI cues.
    });
  }, []);

  useEffect(() => {
    if (shouldExitSession && !navigatedRef.current) {
      void clearActiveSession();
      void clearAuthToken();
      navigatedRef.current = true;
      router.replace("/");
    }
  }, [router, shouldExitSession]);

  useEffect(() => {
    if (!opponentDisconnected) return;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [opponentDisconnected]);

  useEffect(() => {
    if (!gameOverInfo) return;
    const iWon = gameOverInfo.winnerId === myPlayerId;
    Alert.alert(
      iWon ? "You won this game" : "You lost this game",
      `Score: ${gameOverInfo.player1Score} – ${gameOverInfo.player2Score}`,
    );
  }, [gameOverInfo, myPlayerId]);

  useEffect(() => {
    if (!matchCompleteInfo) return;
    const iWon = matchCompleteInfo.winnerId === myPlayerId;
    Alert.alert(
      iWon ? "You won the match" : "Match over",
      `Final score: ${matchCompleteInfo.player1Score} – ${matchCompleteInfo.player2Score}`,
      [
        {
          text: "OK",
          onPress: () => {
            void clearActiveSession();
            void clearAuthToken();
            navigatedRef.current = true;
            router.replace("/");
          },
        },
      ],
    );
  }, [matchCompleteInfo, myPlayerId, router]);

  useEffect(() => {
    if (!uiGameState) return;
    if (previousTurnRef.current === null) {
      previousTurnRef.current = isMyTurn;
      return;
    }

    const becameMyTurn = !previousTurnRef.current && isMyTurn;
    previousTurnRef.current = isMyTurn;

    if (!becameMyTurn || playTurnSound !== true) return;

    try {
      turnPlayer.seekTo(0);
      turnPlayer.play();
    } catch {
      // Ignore best-effort cue failures.
    }
  }, [isMyTurn, playTurnSound, turnPlayer, uiGameState]);

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

  const handleShowEmotesChange = useCallback((value: boolean) => {
    setShowEmotesState(value);
    void setShowEmotes(value);
  }, []);

  const handlePlayTurnSoundChange = useCallback((value: boolean) => {
    setPlayTurnSoundState(value);
    void setPlayTurnSound(value);
  }, []);

  const handleDismissRaiseHint = useCallback(() => {
    setHasSeenRaiseHintState(true);
    void setHasSeenRaiseHint(true);
  }, []);

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
        <GameMenuButton onPress={() => setShowMenu(true)} />
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
            hintedDestinations={hintedDestinations}
            diceUsed={diceUsed}
            onRollDice={wrapAction("Failed to roll dice", actions.onRollDice)}
            onSubmitMoves={wrapAction("Failed to submit moves", actions.onSubmitMoves)}
            canSubmitMoves={canSubmitMoves}
            onEmoteSelect={actions.onEmoteSelect}
            onProposeDouble={wrapAction("Failed to propose double", actions.onProposeDouble)}
            onAcceptDouble={wrapAction("Failed to accept double", actions.onAcceptDouble)}
            onDeclineDouble={wrapAction("Failed to decline double", actions.onDeclineDouble)}
            showEmotes={showEmotes ?? true}
            showRaiseHint={shouldShowRaiseHint}
            onDismissRaiseHint={handleDismissRaiseHint}
          />
        </ScrollView>

        {opponentDisconnected ? (
          <View style={styles.overlay}>
            <LiquidGlass style={[styles.overlayCard, Shadows.md]}>
              <Text style={[styles.overlayTitle, { color: colors.text }]}>
                Opponent disconnected
              </Text>
              <Text style={[styles.overlayBody, { color: colors.textMuted }]}>
                {formatReconnectCountdown(reconnectDeadlineAt, now)}
              </Text>
              <Text style={[styles.overlayHint, { color: colors.textMuted }]}>
                Their seat is still reserved on the original device. You can wait here or end the
                session.
              </Text>
              <SessionShareCard sessionId={sessionId} />
              <Button fullWidth onPress={handleLeave} title="Leave Session" variant="outline" />
            </LiquidGlass>
          </View>
        ) : null}
      </Animated.View>
      <GameMenuModal
        visible={showMenu}
        showEmotes={showEmotes ?? true}
        playTurnSound={playTurnSound ?? true}
        onClose={() => setShowMenu(false)}
        onShowEmotesChange={handleShowEmotesChange}
        onPlayTurnSoundChange={handlePlayTurnSoundChange}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
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
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.22)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 72,
    paddingHorizontal: Spacing.md,
  },
  menuCard: {
    width: 288,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  menuCopy: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  menuHelp: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    lineHeight: 17,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xxl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  overlayCard: {
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  overlayTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
  },
  overlayBody: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  overlayHint: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
});
