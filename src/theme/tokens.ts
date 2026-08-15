/**
 * BlinkMoney design tokens — derived from blinkmoney.in and the brand's
 * dark-green + lime visual language. The app is dark-first by design:
 * the brand's hero surfaces are deep green with lime accents.
 */
export const palette = {
  // Greens (dark → light)
  forest950: '#04120C',
  forest900: '#071B12',
  forest850: '#0A2418',
  forest800: '#0E2F1F',
  forest700: '#143D29',
  forest600: '#1C4F36',
  forest500: '#2A6B4A',

  // Brand lime
  lime: '#C8F169',
  limeBright: '#D9FF7A',
  limeDim: '#9BC24E',

  // Text on dark
  white: '#F4FAF0',
  mist: '#B9CCBB',
  sage: '#7E9884',

  // Semantic
  positive: '#7BE495',
  negative: '#FF8A7A',
  warning: '#FFD37A',
  info: '#8AC7FF',

  // Overlays
  glowLime: 'rgba(200, 241, 105, 0.16)',
  glassStroke: 'rgba(200, 241, 105, 0.14)',
  cardStroke: 'rgba(244, 250, 240, 0.08)',
  scrim: 'rgba(4, 18, 12, 0.72)',
} as const;

export const colors = {
  bg: palette.forest950,
  bgElevated: palette.forest900,
  card: palette.forest850,
  cardPressed: palette.forest800,
  stroke: palette.cardStroke,
  strokeAccent: palette.glassStroke,

  textPrimary: palette.white,
  textSecondary: palette.mist,
  textTertiary: palette.sage,

  accent: palette.lime,
  accentBright: palette.limeBright,
  accentDim: palette.limeDim,
  onAccent: palette.forest950,

  positive: palette.positive,
  negative: palette.negative,
  warning: palette.warning,
  info: palette.info,
} as const;

export const font = {
  // Display / headings / numbers
  grotesk: 'SpaceGrotesk_500Medium',
  groteskBold: 'SpaceGrotesk_700Bold',
  groteskRegular: 'SpaceGrotesk_400Regular',
  // Labels, eyebrows, ticker-style figures
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const type = {
  displayXL: { fontFamily: font.groteskBold, fontSize: 44, lineHeight: 48 },
  display: { fontFamily: font.groteskBold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: font.groteskBold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: font.grotesk, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: font.groteskRegular, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: font.groteskRegular, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: font.mono, fontSize: 11, lineHeight: 16, letterSpacing: 1.6 },
  monoSm: { fontFamily: font.mono, fontSize: 12, lineHeight: 18 },
  monoNum: { fontFamily: font.monoBold, fontSize: 15, lineHeight: 20 },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Standard spring/timing durations so motion feels like one system. */
export const motion = {
  fast: 180,
  base: 320,
  slow: 600,
  countUp: 1400,
} as const;
