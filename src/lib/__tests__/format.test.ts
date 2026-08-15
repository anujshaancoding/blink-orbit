import { inr, inrCompact, inrExact, pct } from '../format';

describe('inr', () => {
  it('uses Indian digit grouping', () => {
    expect(inr(1234567)).toBe('₹12,34,567');
    expect(inr(1000)).toBe('₹1,000');
  });

  it('formats negatives with a true minus outside the rupee sign', () => {
    expect(inr(-1240)).toBe('−₹1,240');
  });

  it('guards non-finite values', () => {
    expect(inr(NaN)).toBe('—');
    expect(inr(Infinity)).toBe('—');
  });

  it('rounds paise away', () => {
    expect(inr(99.6)).toBe('₹100');
  });
});

describe('inrCompact', () => {
  it('compacts to lakh and crore, trimming zeros', () => {
    expect(inrCompact(50_000)).toBe('₹50K');
    expect(inrCompact(4_56_000)).toBe('₹4.56L');
    expect(inrCompact(2_30_00_000)).toBe('₹2.3Cr');
    expect(inrCompact(1_00_00_000)).toBe('₹1Cr');
  });

  it('leaves small values fully grouped', () => {
    expect(inrCompact(9_999)).toBe('₹9,999');
  });

  it('keeps the sign on negatives', () => {
    expect(inrCompact(-4_56_000)).toBe('−₹4.56L');
  });
});

describe('inrExact', () => {
  it('always shows two decimals for accrual displays', () => {
    expect(inrExact(1240.371)).toBe('₹1,240.37');
    expect(inrExact(0)).toBe('₹0.00');
  });
});

describe('pct', () => {
  it('signs both directions and uses a true minus', () => {
    expect(pct(14.23)).toBe('+14.2%');
    expect(pct(-3.14)).toBe('−3.1%');
    expect(pct(0)).toBe('0.0%');
  });
});
