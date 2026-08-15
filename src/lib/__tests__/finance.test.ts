import {
  borrowPower,
  interestAccrued,
  LAMF,
  projectDailySip,
  simulateCrash,
  unlockProgress,
  xirr,
  type CashFlow,
} from '../finance';

const YEAR = 365.25 * 24 * 3600 * 1000;
const T0 = new Date(2025, 0, 1).getTime();

describe('xirr', () => {
  it('recovers the rate for a simple lump sum', () => {
    // ₹100 → ₹121 in exactly 2 years ⇒ 10% p.a.
    const flows: CashFlow[] = [
      { date: T0, amount: -100 },
      { date: T0 + 2 * YEAR, amount: 121 },
    ];
    expect(xirr(flows)!).toBeCloseTo(0.1, 3);
  });

  it('handles negative returns', () => {
    const flows: CashFlow[] = [
      { date: T0, amount: -100 },
      { date: T0 + YEAR, amount: 90 },
    ];
    expect(xirr(flows)!).toBeCloseTo(-0.1, 3);
  });

  it('returns null when no solution exists', () => {
    expect(xirr([{ date: T0, amount: -100 }])).toBeNull();
    // all-negative flows (money in, nothing back yet)
    expect(
      xirr([
        { date: T0, amount: -100 },
        { date: T0 + YEAR, amount: -100 },
      ]),
    ).toBeNull();
  });

  it('handles a daily-SIP-like stream', () => {
    const flows: CashFlow[] = [];
    for (let d = 0; d < 100; d++) {
      flows.push({ date: T0 + d * (YEAR / 365.25), amount: -51 });
    }
    flows.push({ date: T0 + 100 * (YEAR / 365.25), amount: 5300 });
    const r = xirr(flows)!;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1.5); // sane annualised bound for +4% over ~50d avg holding
  });
});

describe('interestAccrued', () => {
  it('accrues linearly on ACT/365', () => {
    const now = T0 + (365 / 365.25) * YEAR; // exactly 365 days
    expect(interestAccrued(100000, 9.99, T0, now)).toBeCloseTo(9990, 0);
  });

  it('never goes negative when clocks skew', () => {
    expect(interestAccrued(100000, 9.99, T0, T0 - 1000)).toBe(0);
  });
});

describe('borrow power & unlock', () => {
  it('is zero below the floor — no pretend credit', () => {
    expect(borrowPower(LAMF.unlockFloor - 1)).toBe(0);
    expect(borrowPower(0)).toBe(0);
  });

  it('is 80% of portfolio at/above the floor', () => {
    expect(borrowPower(LAMF.unlockFloor)).toBeCloseTo(LAMF.unlockFloor * 0.8);
    expect(borrowPower(100000)).toBeCloseTo(80000);
  });

  it('clamps unlock progress to [0,1]', () => {
    expect(unlockProgress(-5)).toBe(0);
    expect(unlockProgress(LAMF.unlockFloor * 3)).toBe(1);
    expect(unlockProgress(LAMF.unlockFloor / 2)).toBeCloseTo(0.5);
  });
});

describe('simulateCrash', () => {
  const portfolio = 100000;

  it('is always safe with no active draw', () => {
    expect(simulateCrash(portfolio, 0, 40).status).toBe('safe');
    expect(simulateCrash(portfolio, 0, 40).topUpNeeded).toBe(0);
  });

  it('triggers margin call at the threshold, forced sale at the deeper one', () => {
    const drawn = 40000;
    expect(simulateCrash(portfolio, drawn, 14).status).toBe('safe');
    expect(simulateCrash(portfolio, drawn, 15).status).toBe('margin_call');
    expect(simulateCrash(portfolio, drawn, 19).status).toBe('margin_call');
    expect(simulateCrash(portfolio, drawn, 20).status).toBe('forced_sell');
  });

  it('computes the top-up that restores the LTV ratio', () => {
    const drawn = 40000;
    const out = simulateCrash(portfolio, drawn, 60);
    // after top-up, drawn / (after + topUp) should be back at the LTV cap
    expect(drawn / (out.portfolioAfter + out.topUpNeeded)).toBeCloseTo(LAMF.ltv, 6);
  });

  it('borrow power never goes negative', () => {
    expect(simulateCrash(portfolio, 80000, 40).borrowPowerAfter).toBe(0);
  });
});

describe('projectDailySip', () => {
  it('matches simple arithmetic at 0%', () => {
    expect(projectDailySip(21, 0, 1)).toBeCloseTo(21 * 30.4 * 12, 5);
  });

  it('₹21/day at 12% for 10 years lands in a sane range', () => {
    const v = projectDailySip(21, 12, 10);
    expect(v).toBeGreaterThan(140000);
    expect(v).toBeLessThan(160000);
  });
});
