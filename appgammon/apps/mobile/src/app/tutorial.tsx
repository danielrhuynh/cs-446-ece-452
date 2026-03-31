import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors, Fonts, Spacing, BorderRadius, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { setHasSeenTutorial } from "@/lib/storage";
import { ScreenContainer } from "@/components/ui/screen-container";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";

function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  return (
    <View style={styles.sectionIntro}>
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>{eyebrow}</Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function BodyLine({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  return <Text style={[styles.body, { color: colors.text }]}>{children}</Text>;
}

function MutedLine({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  return <Text style={[styles.muted, { color: colors.textMuted }]}>{children}</Text>;
}

export default function TutorialScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const openedFromHome = source === "home";
  const finishLabel = useMemo(
    () => (openedFromHome ? "Done" : "Continue to App"),
    [openedFromHome],
  );

  const finishTutorial = async () => {
    await setHasSeenTutorial(true);
    if (openedFromHome) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <View style={styles.topRail}>
          {openedFromHome ? (
            <BackButton onPress={() => router.back()} label="Home" />
          ) : (
            <View style={styles.backPlaceholder} />
          )}
        </View>

        <Animated.View entering={FadeInDown.duration(280)} style={styles.hero}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>How Appgammon plays</Text>
          <Text style={[styles.heroLead, { color: colors.textMuted }]}>
            Learn how matches score, how games end, and how pieces move.
          </Text>
          <View style={[styles.heroRule, { backgroundColor: colors.border }]} />
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(50).duration(320)}>
            <LiquidGlass style={[styles.panel, Shadows.sm]}>
              <SectionIntro eyebrow="Match" title="Reach the target score first">
                <BodyLine>
                  Your table picks a match length: first to 3, 5, or 7 points. Win games to earn
                  points. Reach the target first and you win the match.
                </BodyLine>
              </SectionIntro>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(320)}>
            <LiquidGlass style={[styles.panel, Shadows.sm]}>
              <SectionIntro
                eyebrow="Finishing a game"
                title="Bring your checkers home and bear them off"
              >
                <BodyLine>
                  Move all of your checkers into your home board, then bear them off. The first
                  player to clear every checker wins the game and scores from the table below.
                </BodyLine>
              </SectionIntro>

              <View style={[styles.tableWrap, { borderColor: colors.border }]}>
                <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.tableLabelCol}>
                    <Text style={[styles.tableName, { color: colors.text }]}>Single</Text>
                    <MutedLine>Your opponent bore off at least one checker.</MutedLine>
                  </View>
                  <Text style={[styles.tablePts, { color: colors.primary }]}>1</Text>
                </View>
                <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.tableLabelCol}>
                    <Text style={[styles.tableName, { color: colors.text }]}>Gammon</Text>
                    <MutedLine>Your opponent did not bear off any checkers.</MutedLine>
                  </View>
                  <Text style={[styles.tablePts, { color: colors.primary }]}>2</Text>
                </View>
                <View style={styles.tableRow}>
                  <View style={styles.tableLabelCol}>
                    <Text style={[styles.tableName, { color: colors.text }]}>Backgammon</Text>
                    <MutedLine>
                      Your opponent still has a checker on the bar or in your home board when you
                      finish.
                    </MutedLine>
                  </View>
                  <Text style={[styles.tablePts, { color: colors.primary }]}>3</Text>
                </View>
              </View>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(130).duration(320)}>
            <LiquidGlass style={[styles.panel, Shadows.sm]}>
              <SectionIntro eyebrow="Doubling" title="Raise the stakes with the cube">
                <BodyLine>
                  Before you roll, you can offer a double. If your opponent accepts, the game keeps
                  going at twice the current value. If they pass, you win the game at the current
                  cube value.
                </BodyLine>
                <BodyLine>
                  Players can redouble later. If the cube reaches 4, a backgammon is worth 12 points
                  because 3 x 4 = 12.
                </BodyLine>
              </SectionIntro>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(170).duration(320)}>
            <LiquidGlass style={[styles.panel, Shadows.sm]}>
              <SectionIntro eyebrow="Board basics" title="Both players start from the same layout">
                <BodyLine>
                  Both players start with mirrored stacks on the 6, 8, 13, and 24 points. White
                  moves counterclockwise toward home. Red moves clockwise.
                </BodyLine>
                <BodyLine>
                  A point with two or more opposing checkers is closed. A point with one opposing
                  checker is a blot. Hit it and that checker goes to the bar. A player with a
                  checker on the bar must re-enter before making any other move.
                </BodyLine>
                <BodyLine>
                  You can bear off only after all of your checkers are in your home board.
                </BodyLine>
                <MutedLine>The game screen shows the full board and legal moves.</MutedLine>
              </SectionIntro>
            </LiquidGlass>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInDown.delay(200).duration(280)} style={styles.footer}>
          <Button
            title={finishLabel}
            variant="primary"
            fullWidth
            size="lg"
            onPress={() => void finishTutorial()}
          />
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  topRail: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  backPlaceholder: { height: 44 },
  hero: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: -0.4,
    alignSelf: "flex-start",
  },
  heroLead: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 520,
    alignSelf: "flex-start",
  },
  heroRule: {
    alignSelf: "flex-start",
    width: 56,
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.xs,
    opacity: 0.85,
  },
  scroll: {
    flex: 1,
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  panel: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionIntro: {
    gap: Spacing.xs,
  },
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 19,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  muted: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  tableWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableLabelCol: {
    flex: 1,
    gap: 4,
  },
  tableName: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  tablePts: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 30,
    minWidth: 36,
    textAlign: "right",
    marginTop: 2,
  },
  footer: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
    paddingTop: Spacing.sm,
  },
});
