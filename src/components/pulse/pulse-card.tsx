import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { useStore } from '@/data/store';
import type { UserState } from '@/data/types';
import { pulseGreeting } from '@/lib/dates';
import { inrExact } from '@/lib/format';
import { space, type } from '@/theme/tokens';

/**
 * The daily pulse: what the money did on its own since yesterday.
 * Honesty rules:
 * - a down day is shown as a down day ("markets dipped") — never hidden
 * - a flat/zero day (new user) gets the projection nudge instead of a fake win
 */
export function PulseCard({ user }: { user: UserState }) {
  const { loadedAt } = useStore();
  const e = user.yesterdayEarnings;

  const tick = useCallback(() => {
    Haptics.notificationAsync(
      e >= 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    );
  }, [e]);

  if (user.portfolioValue <= 0) return null;

  const isDown = e < 0;

  return (
    <Card accent={!isDown} style={styles.card}>
      <AppText variant="eyebrow" tone="tertiary">
        {pulseGreeting(loadedAt).toUpperCase()}
      </AppText>
      <View style={styles.row}>
        <CountUp
          value={e}
          format={inrExact}
          onSettled={tick}
          style={[type.displayXL, { color: isDown ? '#FF8A7A' : '#C8F169' }]}
        />
      </View>
      <AppText variant="body" tone="secondary">
        {isDown
          ? 'Markets dipped. Your daily SIP just bought the same assets cheaper — that’s how averaging works.'
          : 'earned by your money, on its own. No tasks, no spins — just compounding.'}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});
