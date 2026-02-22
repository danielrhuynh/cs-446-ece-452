/**
 * Session code display component
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface CodeDisplayProps {
  code: string;
}

export function CodeDisplay({ code }: CodeDisplayProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Format code with hyphen in middle (e.g., XK49-TZ)
  const formattedCode =
    code.length === 6
      ? `${code.slice(0, 4)}-${code.slice(4)}`
      : code;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
  };

  return (
    <TouchableOpacity onPress={handleCopy} activeOpacity={0.7}>
      <View
        style={[
          styles.container,
          {
            borderColor: colors.primary,
            backgroundColor: colors.cardBackground,
          },
        ]}
      >
        <Text style={[styles.code, { color: colors.primary }]}>
          {formattedCode}
        </Text>
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Tap to copy
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  code: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});
