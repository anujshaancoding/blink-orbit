import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import { colors, palette, radius, space } from '@/theme/tokens';

/**
 * Referral landing — handles blinkorbit://r/CODE (and the /r/CODE path in
 * dev). The inviter's name is derived from the code; an unknown/garbled
 * code degrades to a generic invite rather than an error.
 */
export default function ReferralLanding() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { setPersona } = useStore();

  const inviter = inviterFromCode(code);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <AppText variant="heading">
              Blink<AppText variant="heading" tone="accent">Money</AppText>
            </AppText>
          </View>

          <AppText variant="displayXL">
            {inviter ? `${inviter} saves daily.` : 'Someone wants you in orbit.'}
          </AppText>
          <AppText variant="body" tone="secondary">
            {inviter
              ? `They sent you their real numbers — not an ad. Start your own orbit from ₹21/day and unlock a credit line as it grows.`
              : 'Start from ₹21/day. Watch it grow across five assets. Borrow against it without selling.'}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <Card accent style={styles.pitch}>
            {PITCH.map((p) => (
              <View key={p.text} style={styles.pitchRow}>
                <Ionicons name={p.icon} size={18} color={colors.accent} />
                <AppText variant="body" tone="secondary" style={styles.pitchText}>
                  {p.text}
                </AppText>
              </View>
            ))}
            <AppText variant="caption" tone="tertiary">
              No signup bonus, no cashback bribe. If the product needs a bribe, it isn’t working.
            </AppText>
          </Card>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(280)} style={styles.footer}>
        <PressableScale
          haptic="success"
          style={styles.cta}
          onPress={() => {
            // Demo: drop the visitor into the Day-0 experience.
            setPersona('new');
            router.replace('/');
          }}
          accessibilityLabel="Start your orbit from 21 rupees a day"
        >
          <AppText variant="heading" tone="onAccent">
            Start my orbit — ₹21/day
          </AppText>
        </PressableScale>
        <PressableScale onPress={() => router.replace('/')} style={styles.skip} accessibilityLabel="Just look around">
          <AppText variant="caption" tone="tertiary">
            just looking, thanks
          </AppText>
        </PressableScale>
      </Animated.View>
    </SafeAreaView>
  );
}

const PITCH: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'trending-up-outline', text: 'Daily auto-invest across stocks, FD, gold, real estate & F&O' },
  { icon: 'flash-outline', text: 'A credit line that grows with every save — cash in ~5 min at ₹50K' },
  { icon: 'analytics-outline', text: 'A Truth panel with your real XIRR. No hidden spreads, ever.' },
];

/** PRIYA51 → "Priya". Garbage in → null (generic invite). */
function inviterFromCode(code: string | undefined): string | null {
  if (!code) return null;
  const letters = code.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 2 || letters.length > 12) return null;
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.forest950,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    gap: space.xl,
  },
  header: {
    gap: space.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  pitch: {
    gap: space.lg,
  },
  pitchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  pitchText: {
    flex: 1,
  },
  footer: {
    padding: space.xl,
    gap: space.md,
    alignItems: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  skip: {
    paddingVertical: space.sm,
  },
});
