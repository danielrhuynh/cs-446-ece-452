/**
 * Join Session Screen
 * Session code input, join button, name modal for deep link flows
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, BorderRadius, Spacing, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeviceId } from "@/hooks/use-device-id";
import { joinSession } from "@/lib/api";
import { getDisplayName, setDisplayName, setAuthToken } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeInput } from "@/components/ui/code-input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";

export default function JoinSessionScreen() {
  const router = useRouter();
  const { displayName, sessionCode: deepLinkedCode } = useLocalSearchParams<{
    displayName?: string;
    sessionCode?: string;
  }>();
  const { deviceId, isLoading: deviceIdLoading } = useDeviceId();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const initialCode = useMemo(
    () =>
      (deepLinkedCode ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6),
    [deepLinkedCode],
  );
  const [sessionCode, setSessionCode] = useState(initialCode);
  const [resolvedDisplayName, setResolvedDisplayName] = useState(displayName ?? "");
  const [checkedName, setCheckedName] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  // QR scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Name modal state for deep link flow
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (displayName) {
      setResolvedDisplayName(displayName);
      setCheckedName(true);
      return;
    }

    async function loadDisplayName() {
      const savedName = await getDisplayName();
      if (savedName) {
        setResolvedDisplayName(savedName);
      } else if (initialCode) {
        setShowNameModal(true);
      }

      setCheckedName(true);
    }

    void loadDisplayName();
  }, [displayName, initialCode, router]);

  const handleNameSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Please enter a display name");
      return;
    }
    await setDisplayName(trimmed);
    setResolvedDisplayName(trimmed);
    setShowNameModal(false);
  };

  const handleScanQR = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please allow camera access in Settings to scan QR codes.",
        );
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    try {
      const url = new URL(data);
      const code = url.searchParams.get("sessionCode");
      if (code) {
        const sanitized = code
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6);
        if (sanitized.length > 0) {
          setSessionCode(sanitized);
          setError("");
        }
      }
    } catch {
      // Not a URL — treat raw text as a potential code
      const sanitized = data
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      if (sanitized.length > 0) {
        setSessionCode(sanitized);
        setError("");
      }
    }
    setShowScanner(false);
  }, []);

  const handleJoinSession = async () => {
    if (sessionCode.length !== 6) {
      setError("Please enter a valid 6-character code");
      return;
    }

    if (!deviceId || !resolvedDisplayName) {
      setShowNameModal(true);
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const session = await joinSession(deviceId, resolvedDisplayName, sessionCode);
      await setAuthToken(session.auth_token);

      router.replace({
        pathname: "/lobby",
        params: {
          sessionId: session.id,
          displayName: resolvedDisplayName,
          isHost: "false",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join session";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.outer}>
          <View style={styles.content}>
            {/* ─── Code entry card ─── */}
            <Animated.View entering={FadeInDown.duration(260)} style={styles.wrap}>
              <LiquidGlass style={[styles.codeCard, Shadows.sm]}>
                <Text style={[styles.title, { color: colors.text }]}>Enter Session Code</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Ask your friend for their 6-character code
                </Text>

                <View style={styles.codeInputContainer}>
                  <CodeInput
                    value={sessionCode}
                    onChange={(code) => {
                      setSessionCode(code);
                      if (error) setError("");
                    }}
                  />
                </View>

                <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={[styles.pill, { borderColor: colors.border }]}
                  onPress={handleScanQR}
                  activeOpacity={0.7}
                  accessibilityLabel="Scan QR code"
                  accessibilityRole="button"
                >
                  <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                  <Text style={[styles.pillLabel, { color: colors.primary }]}>Scan QR Code</Text>
                </TouchableOpacity>
              </LiquidGlass>
            </Animated.View>

            {/* ─── Name row ─── */}
            {resolvedDisplayName ? (
              <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.wrap}>
                <TouchableOpacity
                  style={styles.nameRow}
                  onPress={() => {
                    setNameInput(resolvedDisplayName);
                    setShowNameModal(true);
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={`Joining as ${resolvedDisplayName}. Tap to change name.`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.joiningAs, { color: colors.textMuted }]}>
                    Joining as{" "}
                    <Text style={{ color: colors.text, fontFamily: Fonts.semibold }}>
                      {resolvedDisplayName}
                    </Text>
                  </Text>
                  <Text style={[styles.changeName, { color: colors.primary }]}>Change</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : checkedName ? (
              <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.wrap}>
                <TouchableOpacity
                  style={styles.nameRow}
                  onPress={() => {
                    setNameInput("");
                    setShowNameModal(true);
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel="Set your display name"
                  accessibilityRole="button"
                >
                  <Text style={[styles.joiningAs, { color: colors.textMuted }]}>
                    No display name set
                  </Text>
                  <Text style={[styles.changeName, { color: colors.primary }]}>Set Name</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {error ? (
              <Text
                style={[styles.errorText, { color: colors.error }]}
                accessibilityLiveRegion="assertive"
              >
                {error}
              </Text>
            ) : null}

            {/* ─── Join button ─── */}
            <Animated.View entering={FadeInDown.delay(120).duration(260)} style={styles.wrap}>
              <Button
                title="Join Session"
                variant="primary"
                size="lg"
                fullWidth
                loading={isJoining || deviceIdLoading}
                disabled={sessionCode.length !== 6 || !resolvedDisplayName || !checkedName}
                onPress={handleJoinSession}
                accessibilityLabel="Join session"
                accessibilityHint="Connects you to your friend's game"
              />
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* QR Scanner modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={() => setShowScanner(false)}
              accessibilityLabel="Close scanner"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.scannerTargetArea}>
              <View style={[styles.scannerCorner, styles.cornerTopLeft]} />
              <View style={[styles.scannerCorner, styles.cornerTopRight]} />
              <View style={[styles.scannerCorner, styles.cornerBottomLeft]} />
              <View style={[styles.scannerCorner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.scannerHint}>Point at a session QR code</Text>
          </View>
        </View>
      </Modal>

      {/* Name modal — fixed: Pressable backdrop + stopPropagation on card */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (resolvedDisplayName) setShowNameModal(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              if (resolvedDisplayName) setShowNameModal(false);
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCardWrap}>
              <LiquidGlass style={[styles.nameModalCard, Shadows.lg]}>
                <Text style={[styles.nameModalTitle, { color: colors.text }]}>
                  What's your name?
                </Text>
                <Text style={[styles.nameModalSubtitle, { color: colors.textMuted }]}>
                  Enter a display name to join the game
                </Text>

                <View style={styles.nameInputWrap}>
                  <Input
                    placeholder="Display name"
                    value={nameInput}
                    onChangeText={(text) => {
                      setNameInput(text);
                      if (nameError) setNameError("");
                    }}
                    error={nameError}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    maxLength={20}
                    accessibilityLabel="Display name"
                  />
                </View>

                <Button
                  title="Continue"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleNameSubmit}
                  accessibilityLabel="Continue with this name"
                />
              </LiquidGlass>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  outer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  content: { gap: Spacing.md, alignItems: "center" },
  wrap: { width: "100%", maxWidth: Layout.contentMaxWidth, alignSelf: "center" },

  /* Code entry card */
  codeCard: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.display,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  codeInputContainer: {
    marginBottom: Spacing.sm,
  },
  thinDivider: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
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

  /* Name row */
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
    minHeight: 44,
  },
  joiningAs: {
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  changeName: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },

  /* Error */
  errorText: {
    fontSize: 15,
    textAlign: "center",
    fontFamily: Fonts.medium,
  },

  // Scanner modal styles
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 80,
  },
  scannerCloseButton: {
    alignSelf: "flex-start",
    marginLeft: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTargetArea: {
    width: 240,
    height: 240,
    position: "relative",
  },
  scannerCorner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#fff",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  scannerHint: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.medium,
    textAlign: "center",
  },
  // Name modal styles — fixed to avoid input focus issues
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCardWrap: {
    width: "100%",
    maxWidth: 360,
  },
  nameModalCard: {
    width: "100%",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  nameModalTitle: {
    fontSize: 22,
    fontFamily: Fonts.display,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  nameModalSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  nameInputWrap: {
    width: "100%",
    marginBottom: Spacing.md,
  },
});
