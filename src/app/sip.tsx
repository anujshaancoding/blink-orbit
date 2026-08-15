import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Self-serve SIP control. The single documented BlinkMoney complaint is
 * "you have to raise a ticket and wait two days to touch your SIP" — this
 * screen is the answer: pause in two taps, resume in one, no human in the
 * loop, and the copy never guilt-trips.
 */
export default function SipScreen() {
  const router = useRouter();
  const { user, sipPausedUntil, pauseSip, resumeSip, loadedAt } = useStore();

  const paused = sipPausedUntil !== null && sipPausedUntil > loadedAt;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow" tone="accent">
            YOUR MONEY, YOUR RULES
          </AppText>
          <AppText variant="title">Manage your SIP</AppText>
        </View>
        <PressableScale onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </PressableScale>
      </View>

      <View style={styles.body}>
        <Card accent style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: paused ? colors.warning : colors.accent }]} />
            <AppText variant="heading">
              {paused ? `Paused until ${dateLabel(sipPausedUntil!)}` : `Running · ₹${user?.dailySip ?? 21}/day`}
            </AppText>
          </View>
          <AppText variant="caption" tone="secondary">
            {paused
              ? 'Nothing will be debited until then. Your existing money stays invested and keeps compounding.'
              : 'Debits land by 7 AM daily. Pause anytime — no ticket, no waiting, no questions.'}
          </AppText>
        </Card>

        {paused ? (
          <PressableScale haptic="success" style={styles.primary} onPress={resumeSip} accessibilityLabel="Resume SIP now">
            <AppText variant="heading" tone="onAccent">
              Resume now
            </AppText>
          </PressableScale>
        ) : (
          <Card style={styles.pauseCard}>
            <AppText variant="heading">Need a breather?</AppText>
            <AppText variant="caption" tone="secondary">
              Rent week, trip, tight month — pause instantly. The streak pauses too; it doesn’t
              break. Honest system, honest rules.
            </AppText>
            <View style={styles.pauseRow}>
              {[7, 14, 30].map((d) => (
                <PressableScale
                  key={d}
                  haptic="medium"
                  style={styles.pauseChip}
                  onPress={() => pauseSip(d)}
                  accessibilityLabel={`Pause for ${d} days`}
                >
                  <AppText variant="heading" tone="accent">
                    {d} days
                  </AppText>
                </PressableScale>
              ))}
            </View>
          </Card>
        )}

        <View style={styles.fineRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <AppText variant="caption" tone="tertiary" style={styles.fineText}>
            Withdrawals are separate and always available — no lock-in. Pausing affects future
            debits only; nothing already invested moves.
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgElevated,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: space.xl,
    paddingTop: 0,
    gap: space.lg,
  },
  statusCard: {
    gap: space.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  pauseCard: {
    gap: space.md,
  },
  pauseRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  pauseChip: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.strokeAccent,
  },
  fineRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
  },
  fineText: {
    flex: 1,
  },
});
