import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BlinkSlider } from '@/components/ui/slider';
import { ErrorState, OfflineState, StaleBanner } from '@/components/ui/state-views';
import { useStore } from '@/data/store';
import type { UserState } from '@/data/types';
import {
  borrowPower,
  interestAccrued,
  LAMF,
  simulateCrash,
  unlockProgress,
} from '@/lib/finance';
import { inr, inrCompact, inrExact, pctPlain } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

/**
 * The Borrow screen: progress-to-unlock, a live interest meter for active
 * draws, the draw sandbox (cost intuition), and the crash simulator (fear
 * intuition) — the "no surprises" answers to the documented LAMF traumas.
 */
export default function BorrowScreen() {
  const { status, user, errorMessage, isStale, refresh } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {isStale && <StaleBanner />}
      <View style={styles.header}>
        <AppText variant="eyebrow" tone="accent">
          BORROW WITHOUT SELLING
        </AppText>
        <AppText variant="title">Borrow Power</AppText>
      </View>

      {status === 'loading' && (
        <View style={styles.skeletonStack}>
          <Skeleton height={150} />
          <Skeleton height={260} />
          <Skeleton height={160} />
        </View>
      )}
      {status === 'error' && <ErrorState message={errorMessage} onRetry={refresh} />}
      {status === 'offline' && !user && <OfflineState hasCache={false} onRetry={refresh} />}
      {(status === 'ready' || (status === 'offline' && user)) && user && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.stack}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <PowerCard user={user} />
            </Animated.View>
            {user.activeDraw && (
              <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                <InterestMeter user={user} />
              </Animated.View>
            )}
            <Animated.View entering={FadeInDown.duration(400).delay(160)}>
              <DrawSandbox user={user} />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(400).delay(240)}>
              <CrashSimulator user={user} />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(400).delay(320)}>
              <FinePrint />
            </Animated.View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- PowerCard

function PowerCard({ user }: { user: UserState }) {
  const progress = unlockProgress(user.portfolioValue);
  const unlocked = progress >= 1;
  const power = borrowPower(user.portfolioValue);
  const drawn = user.activeDraw?.amount ?? 0;

  const etaDays = useMemo(
    () => (unlocked ? 0 : estimateDaysToUnlock(user.portfolioValue, user.dailySip)),
    [user, unlocked],
  );

  if (!unlocked) {
    return (
      <Card accent style={styles.block}>
        <AppText variant="eyebrow" tone="tertiary">
          CREDIT LINE · LOCKED
        </AppText>
        <AppText variant="display">
          {inr(user.portfolioValue)} <AppText variant="heading" tone="tertiary">of {inrCompact(LAMF.unlockFloor)}</AppText>
        </AppText>
        <ProgressBar progress={progress} />
        <AppText variant="body" tone="secondary">
          {user.portfolioValue <= 0
            ? `Your credit line unlocks when your portfolio crosses ${inrCompact(LAMF.unlockFloor)}. Day one starts tonight.`
            : etaDays > 0
              ? `At ₹${user.dailySip}/day, you unlock around ${etaLabel(etaDays)}. Top-ups pull that closer.`
              : `Almost there — your next few saves unlock it.`}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Unlocked means: borrow up to {pctPlain(LAMF.ltv * 100)} of your portfolio at {LAMF.ratePct}%
          p.a., cash in ~5 minutes, while every unit stays invested and compounding.
        </AppText>
      </Card>
    );
  }

  return (
    <Card accent style={styles.block}>
      <AppText variant="eyebrow" tone="accent">
        CREDIT LINE · LIVE
      </AppText>
      <AppText variant="display" tone="accent">
        {inrCompact(Math.max(0, power - drawn))}
      </AppText>
      <AppText variant="body" tone="secondary">
        available right now, without selling a single unit.
      </AppText>
      <View style={styles.powerRow}>
        <PowerStat label="Portfolio" value={inrCompact(user.portfolioValue)} />
        <PowerStat label="Max draw (80%)" value={inrCompact(power)} />
        <PowerStat label="Drawn" value={drawn > 0 ? inrCompact(drawn) : '₹0'} />
      </View>
    </Card>
  );
}

function PowerStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.powerStat}>
      <AppText variant="caption" tone="tertiary">
        {label}
      </AppText>
      <AppText variant="monoNum">{value}</AppText>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const { reducedMotion } = useStore();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = reducedMotion ? progress : withTiming(progress, { duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reducedMotion]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(1.5, w.value * 100)}%` }));
  return (
    <View style={styles.progressTrack} accessibilityLabel={`${Math.round(progress * 100)} percent to unlock`}>
      <Animated.View style={[styles.progressFill, fill]} />
    </View>
  );
}

function estimateDaysToUnlock(current: number, dailySip: number): number {
  if (dailySip <= 0) return Infinity;
  let v = current;
  const dailyR = 0.12 / 365;
  for (let d = 1; d <= 3650 * 3; d++) {
    v = v * (1 + dailyR) + dailySip;
    if (v >= LAMF.unlockFloor) return d;
  }
  return Infinity;
}

function etaLabel(daysAhead: number): string {
  if (!Number.isFinite(daysAhead)) return 'later';
  const d = new Date(Date.now() + daysAhead * 24 * 3600 * 1000);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ------------------------------------------------------------ InterestMeter

/**
 * Live interest accrual, ticking every second with paise precision.
 * The answer to "the 9.5% loan that turned out to be 16.4%": one number,
 * always current, plus the per-day cost in plain words.
 */
function InterestMeter({ user }: { user: UserState }) {
  const draw = user.activeDraw!;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const accrued = interestAccrued(draw.amount, draw.ratePct, draw.since, now);
  const perDay = (draw.amount * draw.ratePct) / 100 / 365;

  return (
    <Card style={styles.block}>
      <View style={styles.meterHeader}>
        <AppText variant="heading">Interest, live</AppText>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <AppText variant="monoSm" tone="accent">
            ACCRUING
          </AppText>
        </View>
      </View>
      <AppText variant="displayXL" style={styles.meterValue} accessibilityLabel={`Interest accrued so far: ${inrExact(accrued)}`}>
        {inrExact(accrued)}
      </AppText>
      <AppText variant="body" tone="secondary">
        on your {inrCompact(draw.amount)} draw · {draw.ratePct}% p.a. · that’s {inrExact(perDay)} a
        day, only on what you’ve actually used.
      </AppText>
      <AppText variant="caption" tone="tertiary">
        No EMI. Repay any amount, any day, zero foreclosure charges. Interest stops the second you
        repay.
      </AppText>
    </Card>
  );
}

// ------------------------------------------------------------- DrawSandbox

const PERSONAL_LOAN_RATE = 16; // typical unsecured personal-loan APR for this segment

/**
 * Cost intuition before commitment: drag a hypothetical draw and see the
 * per-day cost in canteen-money terms, next to what a personal loan would
 * charge. Works pre-unlock too, framed explicitly as "when you unlock".
 */
function DrawSandbox({ user }: { user: UserState }) {
  const unlocked = unlockProgress(user.portfolioValue) >= 1;
  const power = borrowPower(user.portfolioValue);
  const drawn = user.activeDraw?.amount ?? 0;
  const maxDraw = unlocked ? Math.max(0, power - drawn) : LAMF.unlockFloor * LAMF.ltv;

  const STEPS = 20;
  const [step, setStep] = useState(10);

  const amount = Math.round(((maxDraw * step) / STEPS) / 500) * 500;
  const perDay = (amount * LAMF.ratePct) / 100 / 365;
  const perDayPL = (amount * PERSONAL_LOAN_RATE) / 100 / 365;
  const perMonth = perDay * 30;

  const onStep = (v: number) => {
    setStep((prev) => {
      if (prev !== v) Haptics.selectionAsync();
      return v;
    });
  };

  if (maxDraw <= 0 && unlocked) {
    return (
      <Card style={styles.block}>
        <AppText variant="heading">Try a draw</AppText>
        <AppText variant="body" tone="tertiary">
          Your full power is drawn right now. Repay any amount to free it up again.
        </AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.block}>
      <AppText variant="heading">Try a draw</AppText>
      <AppText variant="caption" tone="secondary">
        {unlocked
          ? 'Slide to feel the cost before you ever commit. Nothing happens until you actually draw.'
          : `A preview for when you unlock: this is what borrowing against a ${inrCompact(LAMF.unlockFloor)} portfolio costs.`}
      </AppText>

      <View style={styles.dropReadout}>
        <AppText variant="display" tone="accent">
          {amount <= 0 ? '₹0' : inrCompact(amount)}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          hypothetical draw
        </AppText>
      </View>

      <BlinkSlider
        initialPosition={0.5}
        steps={STEPS}
        onStep={onStep}
        currentStep={step}
        accessibilityLabel={`Hypothetical draw amount, currently ${inr(amount)}`}
        a11yStep={1}
      />

      {amount > 0 ? (
        <>
          <View style={styles.simResults}>
            <SimStat label="Costs per day" value={inrExact(perDay)} />
            <SimStat label="Per month" value={inr(perMonth)} />
          </View>
          <View style={styles.compareBox}>
            <Ionicons name="swap-vertical-outline" size={16} color={colors.textTertiary} />
            <AppText variant="caption" tone="secondary" style={styles.compareText}>
              A {PERSONAL_LOAN_RATE}% personal loan for the same amount costs {inrExact(perDayPL)}/day —
              you’d keep {inr((perDayPL - perDay) * 30)}/month, and your portfolio never stops
              compounding.
            </AppText>
          </View>
        </>
      ) : (
        <AppText variant="caption" tone="tertiary">
          Slide right to price a draw. ₹0 drawn costs ₹0 — an unused credit line is free, forever.
        </AppText>
      )}
    </Card>
  );
}

// ----------------------------------------------------------- CrashSimulator

const MAX_DROP = 40;

function CrashSimulator({ user }: { user: UserState }) {
  const drawn = user.activeDraw?.amount ?? 0;
  const [drop, setDrop] = useState(15);

  const hasPortfolio = user.portfolioValue > 0;
  const outcome = simulateCrash(user.portfolioValue, drawn, drop);

  const onStep = (v: number) => {
    setDrop((prev) => {
      if (prev !== v) Haptics.selectionAsync();
      return v;
    });
  };

  const statusMeta = {
    safe: {
      color: colors.positive,
      icon: 'shield-checkmark-outline' as const,
      title: drawn > 0 ? 'Nothing happens to your pledge' : 'Nothing can be force-sold',
      body:
        drawn > 0
          ? 'Your loan stays within the safe zone. Units stay pledged, SIP keeps buying cheaper units.'
          : 'With no active loan there is no margin call — ever. A crash just means your daily SIP buys more units.',
    },
    margin_call: {
      color: colors.warning,
      icon: 'warning-outline' as const,
      title: `Margin call at −${Math.round(LAMF.marginCallAt * 100)}%`,
      body: `You’d get a notice to top up ${inr(outcome.topUpNeeded)} (or repay part of the loan) within 7 days. Nothing is sold at this stage.`,
    },
    forced_sell: {
      color: colors.negative,
      icon: 'alert-circle-outline' as const,
      title: `Forced sale risk at −${Math.round(LAMF.forcedSellAt * 100)}%`,
      body: `If you don’t top up ${inr(outcome.topUpNeeded)} or repay, the lender can sell just enough pledged units to restore the ratio. This is the scenario other apps only mention in the fine print.`,
    },
  }[outcome.status];

  return (
    <Card style={styles.block}>
      <AppText variant="heading">What if the market crashes?</AppText>
      <AppText variant="caption" tone="secondary">
        Drag to stress-test your exact numbers. No surprises — you should know this before you
        ever borrow.
      </AppText>

      {!hasPortfolio ? (
        <AppText variant="body" tone="tertiary">
          Once you have a portfolio, this simulator stress-tests it against real margin rules.
        </AppText>
      ) : (
        <>
          <View style={styles.dropReadout}>
            <AppText variant="display" tone={drop >= 20 ? 'negative' : drop >= 15 ? 'warning' : 'primary'}>
              −{drop}%
            </AppText>
            <AppText variant="caption" tone="tertiary">
              market drop
            </AppText>
          </View>

          <BlinkSlider
            initialPosition={15 / MAX_DROP}
            steps={MAX_DROP}
            onStep={onStep}
            currentStep={drop}
            a11yStep={5}
            accessibilityLabel={`Market drop simulator, currently minus ${drop} percent`}
            markers={[
              { at: (LAMF.marginCallAt * 100) / MAX_DROP, color: colors.warning },
              { at: (LAMF.forcedSellAt * 100) / MAX_DROP, color: colors.negative },
            ]}
          />

          <View style={styles.simResults}>
            <SimStat label="Portfolio after" value={inrCompact(outcome.portfolioAfter)} />
            <SimStat
              label="Borrow power after"
              value={outcome.borrowPowerAfter > 0 ? inrCompact(outcome.borrowPowerAfter) : '₹0'}
            />
          </View>

          <View style={[styles.statusBox, { borderColor: statusMeta.color }]}>
            <Ionicons name={statusMeta.icon} size={18} color={statusMeta.color} />
            <View style={styles.statusText}>
              <AppText variant="heading" style={{ color: statusMeta.color }}>
                {statusMeta.title}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {statusMeta.body}
              </AppText>
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

function SimStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.simStat}>
      <AppText variant="caption" tone="tertiary">
        {label}
      </AppText>
      <AppText variant="monoNum">{value}</AppText>
    </View>
  );
}

// -------------------------------------------------------------- Fine print

const FINE_PRINT: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'time-outline', text: 'Unpledging takes 2–4 working days — it is not instant, and we say so here, not in a PDF.' },
  { icon: 'trending-down-outline', text: `A margin call happens if your collateral falls ${Math.round(LAMF.marginCallAt * 100)}%. You always get a top-up window first.` },
  { icon: 'cash-outline', text: 'Interest accrues daily on the drawn amount only. An unused credit line costs ₹0, forever.' },
  { icon: 'lock-open-outline', text: 'Your SIP keeps running and compounding while pledged. Borrowing never pauses growth.' },
];

function FinePrint() {
  return (
    <Card style={styles.block}>
      <AppText variant="heading">The fine print, upfront</AppText>
      {FINE_PRINT.map((f, i) => (
        <View key={i} style={styles.fineRow}>
          <Ionicons name={f.icon} size={16} color={colors.textTertiary} style={styles.fineIcon} />
          <AppText variant="caption" tone="secondary" style={styles.fineText}>
            {f.text}
          </AppText>
        </View>
      ))}
    </Card>
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
  powerRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
  },
  powerStat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
  },
  progressTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  meterValue: {
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  dropReadout: {
    alignItems: 'center',
    gap: 2,
  },
  simResults: {
    flexDirection: 'row',
    gap: space.sm,
  },
  simStat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
  },
  compareBox: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'flex-start',
  },
  compareText: {
    flex: 1,
  },
  statusBox: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  statusText: {
    flex: 1,
    gap: 4,
  },
  fineRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  fineIcon: {
    marginTop: 2,
  },
  fineText: {
    flex: 1,
  },
});
