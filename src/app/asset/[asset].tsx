import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ASSET_COLORS } from '@/components/orbit/wealth-orb';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import type { AssetClass } from '@/data/types';
import { inr, inrExact, pctPlain } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

const ASSET_BLURBS: Record<AssetClass, string> = {
  stocks: 'Equity does the heavy lifting over years. It swings the most day to day — which is exactly what a daily SIP is built to average through.',
  fd: 'The ballast. Fixed deposits barely move, and that’s their job: they keep a floor under the portfolio when everything else wobbles.',
  gold: 'The cultural classic, held the honest way — as a market instrument with a visible price, not a marked-up "digital gold" spread.',
  realEstate: 'REIT exposure — property income without needing ₹80 lakh and a broker. Slow, steady, dividend-flavoured.',
  fno: 'A small, capped F&O allocation for asymmetric upside. It is the most volatile slice, which is why it stays the smallest.',
};

/**
 * Per-asset drill-down: value, allocation, yesterday's move, and a 30-day
 * sparkline. Reached by tapping a legend chip (or satellite) on the orb.
 */
export default function AssetScreen() {
  const { asset } = useLocalSearchParams<{ asset: string }>();
  const router = useRouter();
  const { user } = useStore();
  const { width } = useWindowDimensions();

  const holding = user?.holdings.find((h) => h.asset === asset);

  if (!user || !holding) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centerFill}>
          <AppText variant="body" tone="secondary">
            This asset isn’t in your orbit yet.
          </AppText>
          <PressableScale onPress={() => router.back()} style={styles.primary} accessibilityLabel="Go back">
            <AppText variant="heading" tone="onAccent">
              Back
            </AppText>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const color = ASSET_COLORS[holding.asset];
  const up = holding.dayChange >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <AppText variant="title">{holding.label}</AppText>
        </View>
        <PressableScale onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </PressableScale>
      </View>

      <View style={styles.body}>
        <Card accent style={styles.heroCard}>
          <AppText variant="eyebrow" tone="tertiary">
            YOUR HOLDING
          </AppText>
          <AppText variant="display">{inr(holding.value)}</AppText>
          <View style={styles.metaRow}>
            <AppText variant="monoSm" tone="secondary">
              {pctPlain(holding.allocation * 100)} of portfolio
            </AppText>
            <AppText variant="monoSm" tone={up ? 'positive' : 'negative'}>
              {up ? '▲' : '▼'} {inrExact(Math.abs(holding.dayChange))} yesterday
            </AppText>
          </View>
          <Sparkline
            width={width - space.xl * 2 - space.lg * 2}
            height={72}
            color={color}
            seedKey={holding.asset}
            endValue={holding.value}
          />
          <AppText variant="caption" tone="tertiary">
            Last 30 days · demo data
          </AppText>
        </Card>

        <Card style={styles.blurbCard}>
          <AppText variant="heading">Why it’s in your orbit</AppText>
          <AppText variant="body" tone="secondary">
            {ASSET_BLURBS[holding.asset]}
          </AppText>
        </Card>
      </View>
    </SafeAreaView>
  );
}

/** Deterministic 30-point sparkline ending at the current value. */
function Sparkline({
  width,
  height,
  color,
  seedKey,
  endValue,
}: {
  width: number;
  height: number;
  color: string;
  seedKey: string;
  endValue: number;
}) {
  const path = useMemo(() => {
    const n = 30;
    const seed = [...seedKey].reduce((s, c) => s + c.charCodeAt(0), 0);
    // Walk backwards from today's value so the line always lands on truth.
    const values: number[] = [endValue];
    for (let i = 1; i < n; i++) {
      const r = frac(Math.sin(seed * 13.9898 + i * 78.233) * 43758.5453);
      const drift = 1 - (r - 0.48) * 0.05;
      values.push(values[i - 1] * drift);
    }
    values.reverse();

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const p = Skia.Path.Make();
    values.forEach((v, i) => {
      const x = (i / (n - 1)) * width;
      const y = height - 6 - ((v - min) / span) * (height - 12);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    });
    return p;
  }, [width, height, seedKey, endValue]);

  return (
    <Canvas style={{ width, height }}>
      <Path path={path} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" color={color} />
    </Canvas>
  );
}

function frac(n: number) {
  return n - Math.floor(n);
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgElevated,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  heroCard: {
    gap: space.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  blurbCard: {
    gap: space.sm,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.xl,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.xxl,
    alignItems: 'center',
  },
});
