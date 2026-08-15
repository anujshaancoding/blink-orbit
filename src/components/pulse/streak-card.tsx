import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { useStore } from '@/data/store';
import type { UserState } from '@/data/types';
import { currentStreak, dayKey, longestStreak } from '@/lib/dates';
import { colors, radius, space } from '@/theme/tokens';

const DAY = 24 * 3600 * 1000;

/**
 * Streak of consecutive save-days. Deliberate design choices:
 * - we gamify the ACT of saving only (no lotteries, no mystery rewards)
 * - a broken streak is framed around the surviving habit ("62-day best,
 *   money still compounding"), never with shame or loss-aversion pressure
 */
export function StreakCard({ user }: { user: UserState }) {
  const { loadedAt: now } = useStore();
  const { length, savedToday } = currentStreak(user.saveTimestamps, now);
  const best = longestStreak(user.saveTimestamps);

  if (user.saveTimestamps.length === 0) return null;

  const broken = length === 0;

  // Last 14 days as dots, oldest → newest.
  const dayKeys = new Set(user.saveTimestamps.map(dayKey));
  const dots = Array.from({ length: 14 }, (_, i) => {
    const ms = now - (13 - i) * DAY;
    return { key: i, saved: dayKeys.has(dayKey(ms)), isToday: i === 13 };
  });

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="flame" size={18} color={broken ? colors.textTertiary : colors.accent} />
          <AppText variant="heading">Save streak</AppText>
        </View>
        <AppText variant="monoNum" tone={broken ? 'secondary' : 'accent'}>
          {broken ? `best ${best}d` : `${length}d`}
        </AppText>
      </View>

      <View style={styles.dotsRow} accessibilityLabel={`Last 14 days of saving. ${dots.filter((d) => d.saved).length} days saved.`}>
        {dots.map((d) => (
          <View
            key={d.key}
            style={[
              styles.dayDot,
              d.saved ? styles.dayDotSaved : styles.dayDotMissed,
              d.isToday && !d.saved && styles.dayDotPending,
            ]}
          />
        ))}
      </View>

      <AppText variant="caption" tone="secondary">
        {broken
          ? `Streaks break. Compounding doesn’t — your ${best}-day best is still invested and growing.`
          : savedToday
            ? 'Today’s auto-save landed. Nothing for you to do.'
            : 'Today’s auto-save hasn’t run yet — it usually lands by 7 AM.'}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayDot: {
    flex: 1,
    height: 22,
    borderRadius: radius.sm - 4,
  },
  dayDotSaved: {
    backgroundColor: colors.accent,
    opacity: 0.9,
  },
  dayDotMissed: {
    backgroundColor: colors.cardPressed,
  },
  dayDotPending: {
    borderWidth: 1,
    borderColor: colors.accentDim,
    backgroundColor: 'transparent',
  },
});
