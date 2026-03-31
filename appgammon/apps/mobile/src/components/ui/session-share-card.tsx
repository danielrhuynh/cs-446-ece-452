import { useState } from "react";
import { Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { BorderRadius, Colors, Fonts, Shadows, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatSessionCode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface SessionShareCardProps {
  sessionId: string;
}

export function SessionShareCard({ sessionId }: SessionShareCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [copied, setCopied] = useState(false);

  const joinUrl = Linking.createURL("/join", { queryParams: { sessionCode: sessionId } });

  const handleCopy = async () => {
    await Clipboard.setStringAsync(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({
      title: "Join my Backgammon game",
      message: `Join my Backgammon game: ${joinUrl}\nCode: ${sessionId}`,
      url: joinUrl,
    });
  };

  return (
    <LiquidGlass style={[styles.card, Shadows.sm]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Session code</Text>
      <TouchableOpacity
        accessibilityLabel={`Session code: ${formatSessionCode(sessionId)}. Tap to copy`}
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={() => void handleCopy()}
      >
        <Text style={[styles.code, { color: colors.primary }]}>{formatSessionCode(sessionId)}</Text>
      </TouchableOpacity>
      <Text style={[styles.hint, { color: copied ? colors.primary : colors.textMuted }]}>
        {copied ? "Copied to clipboard" : "Share this code if they need to rejoin"}
      </Text>

      <View style={styles.actions}>
        <Button
          fullWidth
          onPress={() => void handleShare()}
          size="sm"
          title="Share Invite"
          variant="outline"
        />
      </View>
    </LiquidGlass>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  code: {
    fontFamily: Fonts.display,
    fontSize: 30,
    letterSpacing: 3,
  },
  hint: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  actions: {
    marginTop: Spacing.sm,
  },
});
