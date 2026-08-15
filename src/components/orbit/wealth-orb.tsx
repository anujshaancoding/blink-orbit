import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { AssetClass, Holding } from '@/data/types';
import { palette } from '@/theme/tokens';

export const ASSET_COLORS: Record<AssetClass, string> = {
  stocks: palette.lime,
  gold: palette.warning,
  fd: palette.info,
  realEstate: palette.mist,
  fno: palette.negative,
};

interface Props {
  size: number;
  /** 0–1 progress toward unlocking the credit line (ring sweep). */
  unlockProgress: number;
  unlocked: boolean;
  holdings: Holding[];
  reducedMotion: boolean;
}

const RING_STROKE = 10;

/**
 * The living wealth visualization:
 * - outer ring = Borrow Power (sweep fills as the portfolio approaches ₹50K,
 *   solid + brighter once unlocked)
 * - core = the portfolio, breathing slowly
 * - satellites = the five asset classes orbiting at speeds scaled by
 *   allocation (bigger holding → closer, slower orbit)
 *
 * All animation is driven by one Reanimated clock on the UI thread; React
 * re-renders only when data changes. Reduce Motion freezes the clock and
 * the breath, keeping a fully static (but complete) rendering.
 */
export function WealthOrb({ size, unlockProgress: progress, unlocked, holdings, reducedMotion }: Props) {
  const c = size / 2;
  const coreR = size * 0.21;
  const ringR = c - RING_STROKE;

  // --- clock (ms) for orbital motion ---
  const clock = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      clock.value = 0;
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(withTiming(120_000, { duration: 120_000, easing: Easing.linear }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // --- breathing core ---
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);
  const coreRadius = useDerivedValue(() => coreR * (1 + 0.04 * breath.value));
  const glowRadius = useDerivedValue(() => coreR * (1.55 + 0.12 * breath.value));

  // --- borrow power ring (sweeps in on mount / data change) ---
  const sweep = useSharedValue(0);
  useEffect(() => {
    const target = Math.max(0.001, progress);
    if (reducedMotion) {
      sweep.value = target;
      return;
    }
    sweep.value = withTiming(target, { duration: 1200, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reducedMotion]);

  const ringPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const rect = Skia.XYWHRect(c - ringR, c - ringR, ringR * 2, ringR * 2);
    p.arcToOval(rect, -90, 360 * Math.min(1, sweep.value), true);
    return p;
  });

  const trackPath = React.useMemo(() => {
    const p = Skia.Path.Make();
    const rect = Skia.XYWHRect(c - ringR, c - ringR, ringR * 2, ringR * 2);
    p.arcToOval(rect, -90, 359.99, true);
    return p;
  }, [c, ringR]);

  const ringColor = unlocked ? palette.limeBright : palette.lime;

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* ambient glow behind everything */}
      <Circle cx={c} cy={c} r={glowRadius} color={palette.glowLime}>
        <BlurMask blur={28} style="normal" />
      </Circle>

      {/* borrow power track + progress */}
      <Path path={trackPath} style="stroke" strokeWidth={RING_STROKE} strokeCap="round" color={palette.forest700} />
      <Path
        path={ringPath}
        style="stroke"
        strokeWidth={RING_STROKE}
        strokeCap="round"
        color={ringColor}
        opacity={unlocked ? 1 : 0.92}
      >
        {unlocked ? <BlurMask blur={6} style="solid" /> : null}
      </Path>

      {/* orbit guides */}
      {holdings.map((h, i) => (
        <Circle
          key={`guide-${h.asset}`}
          cx={c}
          cy={c}
          r={orbitRadius(i, coreR, ringR)}
          style="stroke"
          strokeWidth={1}
          color={palette.forest800}
        />
      ))}

      {/* the core */}
      <Group>
        <Circle cx={c} cy={c} r={coreRadius}>
          <RadialGradient c={vec(c, c - coreR * 0.35)} r={coreR * 1.6} colors={[palette.limeBright, palette.lime, palette.forest600]} />
        </Circle>
      </Group>

      {/* satellites */}
      {holdings.map((h, i) => (
        <Satellite key={h.asset} holding={h} index={i} clock={clock} center={c} coreR={coreR} ringR={ringR} />
      ))}
    </Canvas>
  );
}

function orbitRadius(index: number, coreR: number, ringR: number): number {
  const inner = coreR * 1.45;
  const outer = ringR - 18;
  const steps = 4;
  return inner + ((outer - inner) * index) / steps;
}

function Satellite({
  holding,
  index,
  clock,
  center,
  coreR,
  ringR,
}: {
  holding: Holding;
  index: number;
  clock: SharedValue<number>;
  center: number;
  coreR: number;
  ringR: number;
}) {
  const r = orbitRadius(index, coreR, ringR);
  // Inner orbits move faster (Kepler-ish); phase spreads satellites out.
  const speed = 0.00022 - index * 0.000028;
  const phase = (index * Math.PI * 2) / 5 + 0.7;
  const dotR = 4 + holding.allocation * 16;

  const cx = useDerivedValue(() => center + r * Math.cos(phase + clock.value * speed));
  const cy = useDerivedValue(() => center + r * Math.sin(phase + clock.value * speed));

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={dotR + 5} color={ASSET_COLORS[holding.asset]} opacity={0.22}>
        <BlurMask blur={8} style="normal" />
      </Circle>
      <Circle cx={cx} cy={cy} r={dotR} color={ASSET_COLORS[holding.asset]} />
    </Group>
  );
}
