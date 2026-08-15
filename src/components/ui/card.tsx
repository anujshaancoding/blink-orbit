import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

interface CardProps extends ViewProps {
  /** Lime-tinted border for cards that carry the accent story. */
  accent?: boolean;
  padded?: boolean;
}

export function Card({ accent, padded = true, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.card,
        padded && styles.padded,
        accent && styles.accent,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.stroke,
    overflow: 'hidden',
  },
  padded: {
    padding: space.lg,
  },
  accent: {
    borderColor: colors.strokeAccent,
    borderWidth: 1,
  },
});
