/**
 * Player card component for lobby screen
 */

import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface PlayerCardProps {
  name: string;
  isHost?: boolean;
  status: "ready" | "joined" | "waiting";
}

export function PlayerCard({ name, isHost = false, status }: PlayerCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const textColor = colors.text;
  const glowX = useSharedValue(-200);

  useEffect(() => {
    glowX.value = withRepeat(
      withTiming(400, {
        duration: 4000,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [glowX]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glowX.value }],
  }));

  const getStatusColor = () => {
    switch (status) {
      case "ready":
        return colors.hostBadge;
      case "joined":
        return colors.joinedBadge;
      default:
        return colors.border;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "ready":
        return "Ready";
      case "joined":
        return "Joined";
      default:
        return "Waiting";
    }
  };

  return (
    <LiquidGlass
      style={[
        styles.container,
        {
          borderColor: getStatusColor(),
        },
      ]}
      accessibilityLabel={`${name}, ${isHost ? "Host" : "Player"}, ${getStatusText()}`}
    >
      <Animated.View pointerEvents="none" style={[styles.animatedGlow, glowStyle]}>
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowGradient}
        />
      </Animated.View>
      <View style={styles.nameContainer}>
        <Text style={[styles.name, { color: textColor }]}>{name}</Text>
        {isHost && (
          <View
            style={[
              styles.hostBadge,
              {
                backgroundColor:
                  colorScheme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(28,25,23,0.08)",
              },
            ]}
          >
            <Text style={[styles.hostBadgeText, { color: textColor }]}>Host</Text>
          </View>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
    </LiquidGlass>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    minHeight: 56,
  },
  animatedGlow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 200,
    opacity: 0.6,
  },
  glowGradient: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  name: {
    fontSize: 17,
    fontFamily: Fonts.semibold,
  },
  hostBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hostBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.light.onPrimary,
  },
});
