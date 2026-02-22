/**
 * Player card component for lobby screen
 */

import { View, Text, StyleSheet } from "react-native";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface PlayerCardProps {
  name: string;
  isHost?: boolean;
  status: "ready" | "joined" | "waiting";
}

export function PlayerCard({ name, isHost = false, status }: PlayerCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

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
        return "[ready]";
      case "joined":
        return "[joined]";
      default:
        return "[waiting]";
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getStatusColor(),
          borderColor: getStatusColor(),
        },
      ]}
    >
      <View style={styles.nameContainer}>
        <Text style={styles.name}>{name}</Text>
        {isHost && <Text style={styles.hostBadge}>(Host)</Text>}
      </View>
      <Text style={styles.status}>{getStatusText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  hostBadge: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    opacity: 0.9,
  },
});
