/** Create session screen. */

import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Alert, Share, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Colors, Fonts, Spacing, BorderRadius, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeviceId } from "@/hooks/use-device-id";
import { useSessionEvents } from "@/hooks/use-session-events";
import { createSession, cancelSession, type CreateSessionRes } from "@/lib/api";
import { setAuthToken } from "@/lib/storage";
import { formatSessionCode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";
import { LoadingCard } from "@/components/ui/loading-card";
import { SegmentControl } from "@/components/ui/segment-control";
import { QRCodeModal } from "@/components/ui/qr-code-modal";

type BestOf = 3 | 5 | 7;

/* Waiting indicator dot. */
function PulsingDot({ color, delay }: { color: string; delay: number }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }, style]}
    />
  );
}

/* Screen component. */
export default function CreateSessionScreen() {
  const router = useRouter();
  const { displayName } = useLocalSearchParams<{ displayName: string }>();
  const { deviceId, isLoading: deviceIdLoading } = useDeviceId();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [session, setSession] = useState<CreateSessionRes | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const createRequestedRef = useRef(false);

  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [gameClock, setGameClock] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  /* Create the session after the device ID loads. */
  useEffect(() => {
    async function doCreateSession() {
      if (!deviceId || !displayName || createRequestedRef.current) return;
      createRequestedRef.current = true;
      setIsCreating(true);
      setError("");
      try {
        const newSession = await createSession(deviceId, displayName);
        await setAuthToken(newSession.auth_token);
        setSession(newSession);
      } catch (err) {
        createRequestedRef.current = false;
        setError(err instanceof Error ? err.message : "Failed to create session");
      } finally {
        setIsCreating(false);
      }
    }
    if (!deviceIdLoading && deviceId) void doCreateSession();
  }, [deviceId, deviceIdLoading, displayName]);

  /* React to join and cancel events. */
  const { session: sseSession, lastEvent: sseEvent } = useSessionEvents(session?.id);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (navigatedRef.current) return;
    const latestSession = sseSession ?? session;

    if (sseEvent === "session_cancelled" || latestSession?.status === "cancelled") {
      navigatedRef.current = true;
      router.replace("/");
      return;
    }

    const shouldEnterLobby =
      !!latestSession &&
      (sseEvent === "player_joined" ||
        latestSession.status === "closed" ||
        latestSession.status === "in_game");

    if (shouldEnterLobby) {
      navigatedRef.current = true;
      router.replace({
        pathname: "/lobby",
        params: {
          sessionId: latestSession.id,
          displayName,
          isHost: "true",
          bestOf: String(bestOf),
        },
      });
    }
  }, [bestOf, sseEvent, session, sseSession, displayName, router]);

  /* User actions. */
  const handleCancel = async () => {
    navigatedRef.current = true;
    if (!session) {
      router.back();
      return;
    }
    try {
      await cancelSession(session.id);
    } catch {
      /* best-effort */
    }
    router.back();
  };

  const getDeepLinkUrl = () =>
    session ? Linking.createURL("/join", { queryParams: { sessionCode: session.id } }) : "";

  const handleCopy = async () => {
    if (!session) return;
    await Clipboard.setStringAsync(session.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!session) return;
    const joinUrl = getDeepLinkUrl();
    try {
      await Share.share({
        title: "Join my Backgammon game",
        message: `Join my Backgammon game: ${joinUrl}\nCode: ${session.id}`,
        url: joinUrl,
      });
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    }
  };

  /* Loading and error states. */
  if (deviceIdLoading || isCreating) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <LoadingCard message="Creating session..." />
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <LiquidGlass style={[styles.errorCard, Shadows.md]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <Button
              title="Try Again"
              variant="primary"
              onPress={() => router.back()}
              style={{ marginTop: Spacing.md, width: "100%" }}
            />
          </LiquidGlass>
        </View>
      </ScreenContainer>
    );
  }

  /* Main render. */
  return (
    <ScreenContainer>
      <View style={styles.outer}>
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(260)} style={styles.wrap}>
            <LiquidGlass style={[styles.codeCard, Shadows.sm]}>
              <Text style={[styles.inviteLabel, { color: colors.textMuted }]}>Share this code</Text>

              <TouchableOpacity
                onPress={handleCopy}
                activeOpacity={0.7}
                accessibilityLabel={`Session code: ${session ? formatSessionCode(session.id) : "loading"}. Tap to copy`}
                accessibilityRole="button"
              >
                <Text style={[styles.codeValue, { color: colors.primary }]}>
                  {session ? formatSessionCode(session.id) : "------"}
                </Text>
              </TouchableOpacity>

              <Text
                style={[styles.copyHint, { color: copied ? colors.primary : colors.textMuted }]}
                accessibilityLiveRegion="polite"
              >
                {copied ? "Copied to clipboard" : "Tap code to copy"}
              </Text>

              <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

              <View style={styles.shareRow}>
                <TouchableOpacity
                  style={[styles.pill, { borderColor: colors.border }]}
                  onPress={handleShare}
                  activeOpacity={0.7}
                  accessibilityLabel="Share game invite"
                  accessibilityRole="button"
                >
                  <Ionicons name="share-outline" size={18} color={colors.primary} />
                  <Text style={[styles.pillLabel, { color: colors.primary }]}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pill, { borderColor: colors.border }]}
                  onPress={() => setQrVisible(true)}
                  activeOpacity={0.7}
                  accessibilityLabel="Show QR code"
                  accessibilityRole="button"
                >
                  <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                  <Text style={[styles.pillLabel, { color: colors.primary }]}>QR Code</Text>
                </TouchableOpacity>
              </View>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.wrap}>
            <LiquidGlass style={[styles.settingsCard, Shadows.sm]}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Best of</Text>
                <SegmentControl<BestOf> options={[3, 5, 7]} value={bestOf} onChange={setBestOf} />
              </View>
              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Clock</Text>
                <SegmentControl<boolean>
                  options={[true, false]}
                  value={gameClock}
                  onChange={setGameClock}
                  labelForOption={(v) => (v ? "ON" : "OFF")}
                />
              </View>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(260)}>
            <View style={styles.waitingContainer}>
              <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => (
                  <PulsingDot key={i} color={colors.primary} delay={i * 200} />
                ))}
              </View>
              <Text style={[styles.waitingText, { color: colors.textMuted }]}>
                Waiting for your opponent
              </Text>
            </View>
          </Animated.View>
        </View>

        <Button
          title="Cancel Session"
          variant="ghost"
          size="md"
          onPress={handleCancel}
          accessibilityLabel="Cancel session and go back"
          style={styles.cancelBtn}
        />
      </View>

      {session && (
        <QRCodeModal
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          deepLinkUrl={getDeepLinkUrl()}
          sessionCode={session.id}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    justifyContent: "center",
  },
  content: { gap: Spacing.md, alignItems: "center" },
  wrap: { width: "100%", maxWidth: Layout.contentMaxWidth },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },

  errorCard: {
    width: "100%",
    maxWidth: Layout.cardMaxWidth,
    padding: Spacing.xl,
    alignItems: "center",
    borderRadius: BorderRadius.xl,
  },
  errorText: { fontSize: 16, textAlign: "center", fontFamily: Fonts.medium },

  codeCard: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  inviteLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  codeValue: { fontSize: 36, fontFamily: Fonts.display, letterSpacing: 4 },
  copyHint: { fontSize: 14, fontFamily: Fonts.medium, marginTop: Spacing.sm },
  thinDivider: { width: 40, height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
  shareRow: { flexDirection: "row", gap: Spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
  },
  pillLabel: { fontSize: 15, fontFamily: Fonts.semibold },

  settingsCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  settingLabel: { fontSize: 16, fontFamily: Fonts.medium, flex: 1 },
  settingDivider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.sm },

  waitingContainer: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md },
  dotsRow: { flexDirection: "row", gap: 7, alignItems: "center" },
  waitingText: { fontSize: 15, fontFamily: Fonts.medium },

  cancelBtn: { alignSelf: "center" },
});
