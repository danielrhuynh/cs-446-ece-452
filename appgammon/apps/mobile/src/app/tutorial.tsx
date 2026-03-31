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
            A short read: what you are racing toward, how points add up, and what the board expects
            from each move.
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
              <SectionIntro eyebrow="Match" title="Race to the total your table agreed on">
                <BodyLine>
                  The series is first to 3, 5, or 7 points—whoever hits that cap wins the match. You
                  only move the match needle by finishing individual games, not by collecting pretty
                  stacks.
                </BodyLine>
              </SectionIntro>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(320)}>
            <LiquidGlass style={[styles.panel, Shadows.sm]}>
              <SectionIntro
                eyebrow="Finishing a game"
                title="Clear the board ahead of your opponent"
              >
                <BodyLine>
                  Your goal each game is to bring every checker home, then bear them off. Whoever
                  bears off first takes that game and banks the points shown in the table below.
                </BodyLine>
              </SectionIntro>

              <View style={[styles.tableWrap, { borderColor: colors.border }]}>
                <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.tableLabelCol}>
                    <Text style={[styles.tableName, { color: colors.text }]}>Single</Text>
                    <MutedLine>They got pieces off, but you still finished first.</MutedLine>
                  </View>
                  <Text style={[styles.tablePts, { color: colors.primary }]}>1</Text>
                </View>
                <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.tableLabelCol}>
                    <Text style={[styles.tableName, { color: colors.text }]}>Gammon</Text>
                    <MutedLine>They never removed a single checker.</MutedLine>
                  </View>
                  <Text style={[styles.tablePts, { color: colors.primary }]}>2</Text>
                </View>
                <View style={styles.tableRow}>
                  <View style={styles.tableLabelCol}>
                    <Text style={[styles.tableName, { color: colors.text }]}>Backgammon</Text>
                    <MutedLine>
                      When you finish, they still have a piece on the bar or sitting in your home
                      quadrant.
                    </MutedLine>
                  </View>
                  <Text style={[styles.tablePts, { color: colors.primary }]}>3</Text>
                </View>
              </View>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(130).duration(320)}>
            <LiquidGlass style={[styles.panel, Shadows.sm]}>
              <SectionIntro eyebrow="Doubling" title="Offers that multiply what is on the line">
                <BodyLine>
                  On your turn—or before it begins—you can offer to double how much this game pays.
                  Accept, and play continues at the new stakes. Pass, and you hand them the game at
                  the current cube value instead of playing it out.
                </BodyLine>
                <BodyLine>
                  Doubles can chain. If the cube has been accepted twice already, a backgammon base
                  of three multiplies like this: 3 x 2 x 2 = 12 match points from that one game.
                </BodyLine>
              </SectionIntro>
            </LiquidGlass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(170).duration(320)}>
            <LiquidGlass style={[styles.panel, Shadows.sm]}>
              <SectionIntro eyebrow="Board basics" title="Same start, opposite directions">
                <BodyLine>
                  Both sides begin from the familiar opening: mirrored stacks on the six, eight,
                  thirteen, and twenty-four points. White travels counterclockwise toward home; red
                  runs clockwise toward theirs.
                </BodyLine>
                <BodyLine>
                  Land on a point with two or more enemy checkers and the lane is closed. Land on a
                  lone opponent and that checker goes to the bar—they have to re-enter before
                  anything else sensible happens.
                </BodyLine>
                <BodyLine>
                  Bearing off only unlocks once every one of your checkers sits in your home board.
                </BodyLine>
                <MutedLine>
                  In the live table you will see the exact layout—this screen stays high level.
                </MutedLine>
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
