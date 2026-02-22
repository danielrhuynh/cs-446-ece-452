/**
 * Custom Button component matching wireframe designs
 */

import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case "primary":
        return colors.primary;
      case "secondary":
        return colors.secondary;
      case "outline":
      case "ghost":
        return "transparent";
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case "primary":
      case "secondary":
        return "#fff";
      case "outline":
        return colors.primary;
      case "ghost":
        return colors.text;
      default:
        return "#fff";
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") {
      return disabled ? colors.border : colors.primary;
    }
    return "transparent";
  };

  const getPadding = () => {
    switch (size) {
      case "sm":
        return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md };
      case "lg":
        return { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl };
      default:
        return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "sm":
        return 14;
      case "lg":
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          ...getPadding(),
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: getFontSize(),
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: {
    width: "100%",
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
});
