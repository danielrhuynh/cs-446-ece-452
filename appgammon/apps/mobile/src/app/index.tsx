/** Home screen. */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Colors, Fonts, Spacing, BorderRadius, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeviceId } from "@/hooks/use-device-id";
import { isStaleJoinSessionError, joinSession } from "@/lib/api";
import {
  clearActiveSession,
  clearAuthToken,
  getActiveSession,
  getDisplayName,
  getHasSeenTutorial,
  setActiveSession,
  setAuthToken,
  setDisplayName,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";

export default function HomeScreen() {
  const router = useRouter();
  const { pendingSessionCode } = useLocalSearchParams<{ pendingSessionCode?: string }>();
  const { deviceId, isLoading: deviceIdLoading } = useDeviceId();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [displayNameValue, setDisplayNameValue] = useState("");
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      const savedName = await getDisplayName();
      if (savedName) setDisplayNameValue(savedName);

      const hasSeenTutorial = await getHasSeenTutorial();
      if (!hasSeenTutorial) {
        router.replace("/tutorial" as never);
        return;
      }

      if (deviceId) {
        const activeSession = await getActiveSession();

        if (activeSession) {
          try {
            const session = await joinSession(
              deviceId,
              activeSession.displayName,
              activeSession.sessionId,
            );
            await setAuthToken(session.auth_token);
            await setActiveSession({
              sessionId: session.id,
              displayName: activeSession.displayName,
              isHost: session.role === "host",
              targetScore: activeSession.targetScore,
            });

            router.replace({
              pathname: "/lobby",
              params: {
                sessionId: session.id,
                displayName: activeSession.displayName,
                isHost: session.role === "host" ? "true" : "false",
                ...(activeSession.targetScore
                  ? { targetScore: String(activeSession.targetScore) }
                  : {}),
              },
            });
            return;
          } catch (error) {
            if (isStaleJoinSessionError(error)) {
              await clearActiveSession();
              await clearAuthToken();
            }
          }
        }
      }

      setIsReady(true);
    }
    void loadHomeData();
  }, [deviceId, router]);

  const validate = () => {
    if (!displayNameValue.trim()) {
      setError("Please enter a display name");
      return false;
    }
    setError("");
    return true;
  };

  const handleCreateGame = async () => {
    if (!validate()) return;
    await setDisplayName(displayNameValue.trim());
    router.push({ pathname: "/create", params: { displayName: displayNameValue.trim() } });
  };

  const handleJoinGame = async () => {
    if (!validate()) return;
    await setDisplayName(displayNameValue.trim());
    router.push({
      pathname: "/join",
      params: { displayName: displayNameValue.trim(), sessionCode: pendingSessionCode },
    });
  };

  if (!isReady || deviceIdLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingState} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.logoSection}>
            <Animated.View
              entering={FadeIn.duration(500)}
              style={[styles.logoCircle, { borderColor: colors.primary }]}
            >
              <Text style={[styles.logoText, { color: colors.primary }]}>AG</Text>
            </Animated.View>
            <Animated.Text
              entering={FadeIn.delay(80).duration(400)}
              style={[styles.title, { color: colors.text }]}
            >
              Appgammon
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(160).duration(400)}
              style={[styles.subtitle, { color: colors.textMuted }]}
            >
              Play with friends. No account required.
            </Animated.Text>
          </View>

          <Animated.View entering={FadeInDown.delay(200).duration(380)} style={styles.cardWrap}>
            <LiquidGlass style={[styles.mainCard, Shadows.md]}>
              <View style={styles.inputSection}>
                <Input
                  label="Your display name"
                  placeholder="e.g. John"
                  value={displayNameValue}
                  onChangeText={(text) => {
                    setDisplayNameValue(text);
                    if (error) setError("");
                  }}
                  error={error}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={20}
                  accessibilityLabel="Display name"
                  accessibilityHint="Enter the name others will see during the game"
                />
              </View>

              <View style={styles.buttonSection}>
                <Button
                  title="Create Game"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleCreateGame}
                  accessibilityLabel="Create a new game"
                  accessibilityHint="Creates a new session and gives you a code to share"
                />
                <Button
                  title="Join Game"
                  variant="outline"
                  size="lg"
                  fullWidth
                  onPress={handleJoinGame}
                  accessibilityLabel="Join an existing game"
                  accessibilityHint="Enter a code from a friend to join their game"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                style={styles.tutorialCardPressable}
                onPress={() =>
                  router.push({ pathname: "/tutorial" as never, params: { source: "home" } })
                }
                accessibilityRole="button"
                accessibilityLabel="Open the tutorial"
                accessibilityHint="Shows a short walkthrough of movement, scoring, and doubling"
              >
                <LiquidGlass style={[styles.tutorialCard, { borderColor: colors.border }]}>
                  <Text style={[styles.tutorialText, { color: colors.textMuted }]}>
                    Rules refresher
                  </Text>
                  <Text style={[styles.tutorialMeta, { color: colors.secondary }]}>90 sec</Text>
                </LiquidGlass>
              </TouchableOpacity>
            </LiquidGlass>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
  },
  logoSection: { alignItems: "center", gap: Spacing.sm },
  title: {
    fontSize: 32,
    fontFamily: Fonts.display,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    marginTop: Spacing.xs,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  logoText: { fontSize: 32, fontFamily: Fonts.display },
  cardWrap: { width: "100%", maxWidth: Layout.cardMaxWidth },
  mainCard: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  inputSection: { width: "100%" },
  buttonSection: { width: "100%", gap: Spacing.sm },
  tutorialCardPressable: {
    width: "100%",
  },
  tutorialCard: {
    width: "100%",
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  tutorialText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  tutorialMeta: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  loadingState: { flex: 1 },
});
