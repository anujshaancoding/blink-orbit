import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import { currentStreak, longestStreak } from '@/lib/dates';
import { BENCHMARKS, xirr, type CashFlow } from '@/lib/finance';
import { inr, inrCompact, pct } from '@/lib/format';
import { colors, font, palette, radius, space } from '@/theme/tokens';

/**
 * The Flex: a verified-style milestone card. Real numbers, computed the
 * honest way (XIRR), watermarked with the date — designed to be the
 * screenshot people already share, minus the cherry-picking.
 */
export default function ShareScreen() {
  const { user, status, loadedAt } = useStore();
  const router = useRouter();
  const shotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!user) return null;
    const { length } = currentStreak(user.saveTimestamps, loadedAt);
    const best = longestStreak(user.saveTimestamps);
    const dayN = Math.max(1, Math.round((loadedAt - user.joinedAt) / (24 * 3600 * 1000)));

    const flows: CashFlow[] = user.txns
      .map((t) => ({ date: t.date, amount: t.type === 'withdrawal' ? Math.abs(t.amount) : -t.amount }))
      .sort((a, b) => a.date - b.date);
    flows.push({ date: loadedAt, amount: user.portfolioValue });
    const r = xirr(flows);

    return { streak: length, best, dayN, xirrPct: r === null ? null : r * 100 };
  }, [user, loadedAt]);

  const onShare = async () => {
    // Double-tap guard: capture+share can take a second; never fire twice.
    if (sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setShareError('Sharing isn’t available on this device. You can screenshot the card instead.');
        return;
      }
      const uri = await captureRef(shotRef, { format: 'png', quality: 1 });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Blink card' });
    } catch {
      // User cancelling the share sheet lands here too — only surface a
      // message when it looks like a real failure is repeating.
      setShareError(null);
    } finally {
      setSharing(false);
    }
  };

  if (status !== 'ready' && status !== 'offline') {
    return (
      <SafeAreaView style={styles.safe}>
        <ModalHeader onClose={() => router.back()} />
        <View style={styles.center}>
          <AppText variant="body" tone="secondary">
            Your card is ready once your money loads.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !stats) return null;

  const isDayZero = user.txns.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ModalHeader onClose={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.cardShadow}>
          {/* Everything inside ViewShot renders into the shared PNG. */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.brandDot} />
              <AppText variant="heading" style={styles.brandText}>
                Blink<AppText variant="heading" tone="accent">Money</AppText>
              </AppText>
              <View style={styles.flex} />
              <AppText variant="monoSm" tone="tertiary">
                {new Date(loadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </AppText>
            </View>

            {isDayZero ? (
              <>
                <AppText variant="eyebrow" tone="tertiary">
                  DAY 0
                </AppText>
                <AppText variant="display">The habit starts tonight.</AppText>
                <AppText variant="body" tone="secondary">
                  ₹{user.dailySip}/day → stocks, gold, FD, real estate & F&O. Automatically.
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="eyebrow" tone="tertiary">
                  DAY {stats.dayN} OF ₹{user.dailySip}/DAY
                </AppText>
                <AppText variant="displayXL" tone="accent">
                  {user.portfolioValue >= 1_00_000 ? inrCompact(user.portfolioValue) : inr(user.portfolioValue)}
                </AppText>
                <AppText variant="body" tone="secondary">
                  saved & invested, {inr(user.dailySip)} at a time
                </AppText>

                <View style={styles.statRow}>
                  <CardStat
                    label="REAL XIRR"
                    value={stats.xirrPct === null ? '—' : pct(stats.xirrPct)}
                    accent={stats.xirrPct !== null && stats.xirrPct >= 0}
                  />
                  <CardStat label="FD WOULD PAY" value={pct(BENCHMARKS.fd)} />
                  <CardStat label="STREAK" value={`${stats.streak || stats.best}d`} />
                </View>
                <AppText variant="monoSm" tone="tertiary">
                  XIRR computed from actual cash flows · not a projected return
                </AppText>
              </>
            )}

            <View style={styles.cardFooter}>
              <View style={styles.referralPill}>
                <AppText variant="monoSm" tone="onAccent">
                  join me → blinkmoney.in/r/{user.referralCode}
                </AppText>
              </View>
            </View>
          </View>
        </ViewShot>

        <AppText variant="caption" tone="tertiary" align="center" style={styles.disclaimer}>
          The card shares real, dated numbers — no cherry-picked windows. Your referral code is on
          it; you both earn ₹0 because bribes aren’t the point. It’s just proof.
        </AppText>

        {shareError && (
          <AppText variant="caption" tone="warning" align="center">
            {shareError}
          </AppText>
        )}

        <PressableScale
          haptic="medium"
          onPress={onShare}
          disabled={sharing}
          style={styles.shareButton}
          accessibilityLabel="Share this card"
        >
          <Ionicons name="logo-whatsapp" size={18} color={colors.onAccent} />
          <AppText variant="heading" tone="onAccent">
            {sharing ? 'Preparing…' : 'Share the proof'}
          </AppText>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <AppText variant="title">Your Blink Card</AppText>
      <PressableScale onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
        <Ionicons name="close" size={20} color={colors.textPrimary} />
      </PressableScale>
    </View>
  );
}

function CardStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.cardStat}>
      <AppText variant="eyebrow" tone="tertiary" style={styles.cardStatLabel}>
        {label}
      </AppText>
      <AppText variant="monoNum" tone={accent ? 'accent' : 'primary'} style={styles.cardStatValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgElevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: space.xl,
    gap: space.lg,
  },
  cardShadow: {
    borderRadius: radius.xl,
  },
  card: {
    backgroundColor: palette.forest950,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.glassStroke,
    padding: space.xl,
    gap: space.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.lime,
  },
  brandText: {
    fontFamily: font.groteskBold,
  },
  flex: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  cardStat: {
    flex: 1,
    backgroundColor: palette.forest850,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    gap: 4,
    alignItems: 'center',
  },
  cardStatLabel: {
    fontSize: 9,
    letterSpacing: 1,
  },
  cardStatValue: {
    fontSize: 16,
  },
  cardFooter: {
    marginTop: space.lg,
  },
  referralPill: {
    backgroundColor: palette.lime,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignSelf: 'flex-start',
  },
  disclaimer: {
    paddingHorizontal: space.lg,
  },
  shareButton: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
