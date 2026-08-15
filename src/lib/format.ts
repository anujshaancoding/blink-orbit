/**
 * Indian-locale money & number formatting.
 *
 * Edge cases handled here (see README "Edge cases"):
 * - Indian digit grouping (12,34,567 — not 1,234,567)
 * - Lakh/crore compaction for large values so layouts never overflow
 * - Negative amounts formatted as "−₹1,240" (true minus, sign outside ₹)
 * - Sub-rupee paise shown only where precision matters (interest accrual)
 * - NaN/Infinity guarded to "—" so a bad mock never renders "₹NaN"
 */

const inrFull = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function guard(value: number): boolean {
  return Number.isFinite(value);
}

/** ₹12,34,567 — full Indian grouping, no decimals. */
export function inr(value: number): string {
  if (!guard(value)) return '—';
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${inrFull.format(Math.abs(Math.round(value)))}`;
}

/** ₹1,240.37 — with paise, for live interest/accrual displays. */
export function inrExact(value: number): string {
  if (!guard(value)) return '—';
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${inrPaise.format(Math.abs(value))}`;
}

/**
 * Compact Indian notation: 1.2K → ₹1.2K, 4,56,000 → ₹4.56L, 2,30,00,000 → ₹2.3Cr.
 * Used anywhere space is constrained (orb core, share cards, chips).
 */
export function inrCompact(value: number): string {
  if (!guard(value)) return '—';
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `${sign}₹${trimZeros((abs / 1_00_00_000).toFixed(2))}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trimZeros((abs / 1_00_000).toFixed(2))}L`;
  if (abs >= 10_000) return `${sign}₹${trimZeros((abs / 1_000).toFixed(1))}K`;
  return `${sign}₹${inrFull.format(Math.round(abs))}`;
}

function trimZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}

/** +14.2% / −3.1% — always signed, one decimal. */
export function pct(value: number, decimals = 1): string {
  if (!guard(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/** Unsigned percent for neutral contexts (e.g. "80% of portfolio"). */
export function pctPlain(value: number, decimals = 0): string {
  if (!guard(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/** "day 214" / "1 day" / "14 days" */
export function days(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

/** Ordinal day-of-streak label: Day 214 */
export function dayLabel(n: number): string {
  return `Day ${inrFull.format(n)}`;
}
