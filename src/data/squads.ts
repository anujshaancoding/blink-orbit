import type { PersonaId, UserState } from './types';
import { currentStreak } from '@/lib/dates';

export interface SquadMember {
  id: string;
  name: string;
  /** hue 0–360 for the generated avatar ring */
  hue: number;
  dailySip: number;
  /** saved days out of the last 30 — the ONLY ranked metric */
  consistency: number;
  streak: number;
  isYou: boolean;
}

export interface Squad {
  name: string;
  members: SquadMember[];
  /** collective saved-days out of members*30 for the window */
  squadConsistency: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FRIEND_POOL = [
  'Ishaan', 'Ananya', 'Rohan', 'Sara', 'Dev', 'Nisha', 'Arjun', 'Tara',
];

const SQUAD_NAMES: Record<string, string> = {
  steady: 'Compound Interest Gang',
  lapsed: 'The Comeback Club',
  withdrawal: 'Rainy Day Crew',
  whale: 'Quiet Money',
};

/**
 * Deterministic mock squad per persona.
 * Design rule from the research: rank by CONSISTENCY (days saved / 30),
 * never by amount — so a ₹21/day student can beat a ₹2,001/day whale.
 * Returns null for the day-0 persona (empty state: create/join a squad).
 */
export function buildSquad(personaId: PersonaId, user: UserState, now: number): Squad | null {
  if (personaId === 'new' || user.saveTimestamps.length === 0) return null;

  const rand = mulberry32(personaId.length * 1000 + user.dailySip);
  const memberCount = 3 + Math.floor(rand() * 2); // 3–4 friends + you

  const youDays = new Set(
    user.saveTimestamps
      .filter((t) => t >= now - 30 * 24 * 3600 * 1000)
      .map((t) => new Date(t).toDateString()),
  ).size;

  const you: SquadMember = {
    id: 'you',
    name: user.name,
    hue: 84, // lime
    dailySip: user.dailySip,
    consistency: Math.min(30, youDays),
    streak: currentStreak(user.saveTimestamps, now).length,
    isYou: true,
  };

  const friends: SquadMember[] = Array.from({ length: memberCount }, (_, i) => {
    const name = FRIEND_POOL[Math.floor(rand() * FRIEND_POOL.length * 0.999)];
    const consistency = Math.floor(8 + rand() * 23); // 8–30
    return {
      id: `f-${i}`,
      name: `${name}`,
      hue: Math.floor(rand() * 360),
      dailySip: [21, 34, 51, 101][Math.floor(rand() * 4)],
      consistency: Math.min(30, consistency),
      streak: Math.floor(consistency * (0.3 + rand() * 0.7)),
      isYou: false,
    };
  });

  // De-duplicate friend names for readability.
  const seen = new Set<string>();
  friends.forEach((f, i) => {
    while (seen.has(f.name)) f.name = FRIEND_POOL[(FRIEND_POOL.indexOf(f.name) + 1 + i) % FRIEND_POOL.length];
    seen.add(f.name);
  });

  const members = [you, ...friends].sort((a, b) => b.consistency - a.consistency || b.streak - a.streak);
  const squadConsistency = members.reduce((s, m) => s + m.consistency, 0) / (members.length * 30);

  return {
    name: SQUAD_NAMES[personaId] ?? 'Your Squad',
    members,
    squadConsistency,
  };
}
