/**
 * Custom Input component matching wireframe designs
 */

import {
  TextInput,
  View,
  Text,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error ? "#EF4444" : colors.border,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  input: {
    width: "100%",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});
