import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useStore } from '@/data/store';
import { colors, radius } from '@/theme/tokens';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  round?: boolean;
  style?: ViewStyle;
}

/** Pulsing placeholder block. Static (no pulse) when Reduce Motion is on. */
export function Skeleton({ width = '100%', height = 16, round, style }: Props) {
  const pulse = useSharedValue(0.45);
  const { reducedMotion } = useStore();

  useEffect(() => {
    if (reducedMotion) {
      pulse.value = 0.5;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: round ? height / 2 : radius.sm },
        animStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.cardPressed,
  },
});
