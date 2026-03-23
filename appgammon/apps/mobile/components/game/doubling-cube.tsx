/**
 * Doubling cube display and propose/accept/decline UI.
 */

import { View, Text, StyleSheet } from "react-native";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Button } from "@/components/ui/button";
import type { PlayerColor } from "@/types/game";

interface DoublingCubeProps {
  value: number;
  owner: PlayerColor | null;
  pendingProposal: boolean;
  canPropose: boolean;
  currentPlayer: PlayerColor;
  onProposeDouble?: () => void;
  onAcceptDouble?: () => void;
  onDeclineDouble?: () => void;
}

export function DoublingCube({
  value,
  owner,
  pendingProposal,
  canPropose,
  currentPlayer,
  onProposeDouble,
  onAcceptDouble,
  onDeclineDouble,
}: DoublingCubeProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <LiquidGlass
        style={[
          styles.cube,
          {
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <Text style={[styles.value, { color: colors.text }]}>
          {value === 1 ? "1" : value}
        </Text>
      </LiquidGlass>

      {pendingProposal && onAcceptDouble && onDeclineDouble && (
        <View style={styles.proposalActions}>
          <Text style={[styles.proposalLabel, { color: colors.textMuted }]}>
            Double?
          </Text>
          <View style={styles.buttons}>
            <Button
              title="Accept"
              variant="primary"
              size="sm"
              onPress={onAcceptDouble}
            />
            <Button
              title="Decline"
              variant="outline"
              size="sm"
              onPress={onDeclineDouble}
            />
          </View>
        </View>
      )}

      {!pendingProposal && canPropose && onProposeDouble && value === 1 && (
        <Button
          title="Double"
          variant="secondary"
          size="sm"
          onPress={onProposeDouble}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  cube: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  value: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  proposalActions: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  proposalLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
});
