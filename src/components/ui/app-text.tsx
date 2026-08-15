import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

import { colors, type } from '@/theme/tokens';

type Variant = keyof typeof type;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'positive' | 'negative' | 'warning' | 'onAccent';

const toneColor: Record<Tone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  accent: colors.accent,
  positive: colors.positive,
  negative: colors.negative,
  warning: colors.warning,
  onAccent: colors.onAccent,
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
}

/**
 * Single text primitive for the whole app. `maxFontSizeMultiplier` caps OS
 * font scaling at 1.4× so accessibility scaling works without shattering
 * number-dense layouts (amounts get ellipsized, never clipped).
 */
export function AppText({ variant = 'body', tone = 'primary', align, style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[type[variant], { color: toneColor[tone] }, align ? { textAlign: align } : null, style]}
    />
  );
}
