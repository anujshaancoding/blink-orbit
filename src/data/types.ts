export type AssetClass = 'stocks' | 'fd' | 'gold' | 'realEstate' | 'fno';

export interface Holding {
  asset: AssetClass;
  label: string;
  value: number;
  /** fraction of portfolio, 0–1 */
  allocation: number;
  /** yesterday's change in ₹ (can be negative) */
  dayChange: number;
}

export type TxnType = 'sip' | 'topup' | 'withdrawal' | 'draw' | 'repay';

export interface Txn {
  id: string;
  type: TxnType;
  amount: number;
  /** epoch ms */
  date: number;
}

export interface ActiveDraw {
  amount: number;
  /** epoch ms when drawn */
  since: number;
  ratePct: number;
}

export interface UserState {
  personaId: PersonaId;
  name: string;
  joinedAt: number;
  dailySip: number;
  portfolioValue: number;
  investedTotal: number;
  /** ₹ earned yesterday across holdings (sum of dayChange) */
  yesterdayEarnings: number;
  holdings: Holding[];
  txns: Txn[];
  saveTimestamps: number[];
  activeDraw: ActiveDraw | null;
  referralCode: string;
}

export type PersonaId = 'new' | 'steady' | 'lapsed' | 'withdrawal' | 'whale';

export interface PersonaMeta {
  id: PersonaId;
  label: string;
  blurb: string;
}

export const PERSONAS: PersonaMeta[] = [
  { id: 'new', label: 'Day-0 Naya', blurb: 'Joined today. No savings yet — empty states everywhere.' },
  { id: 'steady', label: 'Steady Saver', blurb: '214-day streak at ₹51/day. Mid-journey to unlock.' },
  { id: 'lapsed', label: 'Lapsed Streak', blurb: 'Missed 3 days ago. Streak broken, best was 62.' },
  { id: 'withdrawal', label: 'Rough Month', blurb: 'Withdrew last month; portfolio dipped. Honest framing.' },
  { id: 'whale', label: 'Crore Club', blurb: '₹1Cr+ portfolio, credit line live with an active draw.' },
];
