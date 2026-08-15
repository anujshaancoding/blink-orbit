import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, OfflineState, StaleBanner } from '@/components/ui/state-views';
import { useStore } from '@/data/store';
import type { UserState } from '@/data/types';
import { BENCHMARKS, xirr, type CashFlow } from '@/lib/finance';
import { inr, pct, pctPlain } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

/**
 * The Truth panel — the anti-"hidden spread" screen.
 * Real XIRR from actual cash flows (not a marketing CAGR), benchmarked
 * against FD / inflation / savings, plus an honest ledger and cost card.
 */
export default function TruthScreen() {
  const { status, user, errorMessage, isStale, refresh } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {isStale && <StaleBanner />}
      <View style={styles.header}>
        <AppText variant="eyebrow" tone="accent">
          NO SPIN. NO SPREAD.
        </AppText>
        <AppText variant="title">The Truth Panel</AppText>
      </View>

      {status === 'loading' && (
        <View style={styles.skeletonStack}>
          <Skeleton height={160} />
          <Skeleton height={220} />
          <Skeleton height={140} />
        </View>
      )}
      {status === 'error' && <ErrorState message={errorMessage} onRetry={refresh} />}
      {status === 'offline' && !user && <OfflineState hasCache={false} onRetry={refresh} />}
      {(status === 'ready' || (status === 'offline' && user)) && user && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {user.txns.length === 0 ? <TruthEmpty /> : <TruthBody user={user} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TruthEmpty() {
  return (
    <Card style={styles.block}>
      <AppText variant="heading">Nothing to audit yet</AppText>
      <AppText variant="body" tone="secondary">
        Once your first save lands, this screen shows your real annualised return (XIRR) computed
        from every rupee in and out — benchmarked against an FD, inflation and a savings account.
        No cherry-picked windows.
      </AppText>
    </Card>
  );
}

function TruthBody({ user }: { user: UserState }) {
  const { loadedAt } = useStore();
  const realXirr = useMemo(() => {
    const flows: CashFlow[] = user.txns
      .map((t) => ({
        date: t.date,
        // investments are money OUT of pocket (negative); withdrawals came back (positive)
        amount: t.type === 'withdrawal' ? Math.abs(t.amount) : -t.amount,
      }))
      .filter((f) => f.amount !== 0)
      .sort((a, b) => a.date - b.date);
    flows.push({ date: loadedAt, amount: user.portfolioValue });
    const r = xirr(flows);
    return r === null ? null : r * 100;
  }, [user, loadedAt]);

  const gain = user.portfolioValue - user.investedTotal + totalWithdrawn(user);
  const youPct = realXirr ?? 0;
  const maxPct = Math.max(Math.abs(youPct), BENCHMARKS.fd, BENCHMARKS.inflation, BENCHMARKS.savingsAccount) || 1;

  return (
    <View style={styles.stack}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Card accent style={styles.block}>
          <AppText variant="eyebrow" tone="tertiary">
            YOUR REAL ANNUALISED RETURN (XIRR)
          </AppText>
          <AppText
            variant="displayXL"
            tone={youPct >= 0 ? 'accent' : 'negative'}
            accessibilityLabel={`Your real annualised return is ${pct(youPct)}`}
          >
            {realXirr === null ? '—' : pct(youPct)}
          </AppText>
          <AppText variant="caption" tone="secondary">
            Computed from every deposit and withdrawal you’ve actually made — the same math your
            CA would use. Not a fund factsheet number.
          </AppText>

          <View style={styles.bars}>
            <BenchBar label="You" value={youPct} max={maxPct} highlight delay={0} />
            <BenchBar label="Fixed deposit" value={BENCHMARKS.fd} max={maxPct} delay={120} />
            <BenchBar label="Inflation" value={BENCHMARKS.inflation} max={maxPct} delay={240} />
            <BenchBar label="Savings a/c" value={BENCHMARKS.savingsAccount} max={maxPct} delay={360} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(120)}>
        <Card style={styles.block}>
          <AppText variant="heading">The honest ledger</AppText>
          <LedgerRow label="You put in" value={inr(user.investedTotal)} />
          {totalWithdrawn(user) > 0 && (
            <LedgerRow label="You took out" value={inr(totalWithdrawn(user))} />
          )}
          <LedgerRow label="Worth today" value={inr(user.portfolioValue)} />
          <View style={styles.divider} />
          <LedgerRow
            label={gain >= 0 ? 'Your money earned' : 'Currently down'}
            value={inr(gain)}
            tone={gain >= 0 ? 'positive' : 'negative'}
            big
          />
          {gain < 0 && (
            <AppText variant="caption" tone="secondary">
              Shown in red because it’s true. Daily SIPs buy more units on red days — this number
              is expected to swing early on.
            </AppText>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(240)}>
        <Card style={styles.block}>
          <AppText variant="heading">What this costs you</AppText>
          <LedgerRow label="Platform fee" value="₹0" />
          <LedgerRow label="Buy/sell spread" value="₹0" />
          <LedgerRow label="Exit charges" value="₹0 · no lock-in" />
          <LedgerRow label="Fund expense ratio" value={`~${pctPlain(1.1, 1)} p.a.`} />
          <AppText variant="caption" tone="tertiary">
            The expense ratio is charged inside the fund’s NAV by the fund house — shown here
            because most apps don’t. It’s the only cost in the loop.
          </AppText>
        </Card>
      </Animated.View>
    </View>
  );
}

function totalWithdrawn(user: UserState): number {
  return user.txns.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + Math.abs(t.amount), 0);
}

function LedgerRow({
  label,
  value,
  tone = 'primary',
  big,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'positive' | 'negative';
  big?: boolean;
}) {
  return (
    <View style={styles.ledgerRow}>
      <AppText variant={big ? 'heading' : 'body'} tone="secondary">
        {label}
      </AppText>
      <AppText variant={big ? 'title' : 'monoNum'} tone={tone}>
        {value}
      </AppText>
    </View>
  );
}

function BenchBar({
  label,
  value,
  max,
  highlight,
  delay,
}: {
  label: string;
  value: number;
  max: number;
  highlight?: boolean;
  delay: number;
}) {
  const { reducedMotion } = useStore();
  const w = useSharedValue(0);
  const target = Math.max(0.02, Math.abs(value) / max);

  useEffect(() => {
    w.value = reducedMotion ? target : withDelay(delay, withTiming(target, { duration: 700 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reducedMotion]);

  const barStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View style={styles.benchRow}>
      <AppText variant="caption" tone={highlight ? 'accent' : 'secondary'} style={styles.benchLabel}>
        {label}
      </AppText>
      <View style={styles.benchTrack}>
        <Animated.View
          style={[
            styles.benchFill,
            { backgroundColor: highlight ? (value >= 0 ? colors.accent : colors.negative) : colors.cardPressed },
            barStyle,
          ]}
        />
      </View>
      <AppText variant="monoSm" tone={highlight ? 'accent' : 'tertiary'} style={styles.benchValue}>
        {pct(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: 2,
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  stack: {
    gap: space.lg,
  },
  skeletonStack: {
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  block: {
    gap: space.md,
  },
  bars: {
    gap: space.sm,
    marginTop: space.sm,
  },
  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  benchLabel: {
    width: 88,
  },
  benchTrack: {
    flex: 1,
    height: 14,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  benchFill: {
    height: '100%',
    borderRadius: radius.sm - 4,
  },
  benchValue: {
    width: 56,
    textAlign: 'right',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.stroke,
  },
});
