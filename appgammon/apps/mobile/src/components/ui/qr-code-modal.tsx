import { View, Text, Modal, StyleSheet, Pressable } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Colors, Fonts, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Button } from "@/components/ui/button";
import { formatSessionCode } from "@/lib/format";

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  deepLinkUrl: string;
  sessionCode: string;
}

export function QRCodeModal({ visible, onClose, deepLinkUrl, sessionCode }: QRCodeModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <LiquidGlass style={[styles.card, Shadows.lg]}>
            <Text style={[styles.title, { color: colors.text }]}>Scan to join</Text>

            <View style={styles.qrWrapper}>
              <QRCode value={deepLinkUrl} size={200} backgroundColor="#FFFFFF" />
            </View>

            <Text style={[styles.code, { color: colors.primary }]}>
              {formatSessionCode(sessionCode)}
            </Text>

            <Button
              title="Close"
              variant="ghost"
              size="md"
              onPress={onClose}
              accessibilityLabel="Close QR code"
            />
          </LiquidGlass>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.display,
    marginBottom: Spacing.lg,
  },
  qrWrapper: {
    padding: Spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  code: {
    fontSize: 26,
    fontFamily: Fonts.display,
    letterSpacing: 4,
    marginBottom: Spacing.lg,
  },
});
