import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildPersona } from './personas';
import type { PersonaId, UserState } from './types';

/**
 * Mock backend with real-world texture: configurable latency, injectable
 * failures, and an offline cache — so every loading/error/empty/success
 * state in the app is reachable on demand from the debug panel.
 */

export interface DebugSettings {
  personaId: PersonaId;
  latencyMs: number;
  /** When true, the next fetch throws once, then auto-resets. */
  failNext: boolean;
  /** Simulate no connectivity: fetch rejects, cache (if any) is served. */
  offline: boolean;
}

export const DEFAULT_DEBUG: DebugSettings = {
  personaId: 'steady',
  latencyMs: 900,
  failNext: false,
  offline: false,
};

const SETTINGS_KEY = 'blink.debug.v1';
const CACHE_KEY = 'blink.cache.user.v1';

export async function loadDebugSettings(): Promise<DebugSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_DEBUG;
    return { ...DEFAULT_DEBUG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DEBUG;
  }
}

export async function saveDebugSettings(s: DebugSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Non-fatal: settings just won't survive a restart.
  }
}

export class OfflineError extends Error {
  cached: UserState | null;
  constructor(cached: UserState | null) {
    super('offline');
    this.cached = cached;
  }
}

export async function fetchUserState(settings: DebugSettings): Promise<UserState> {
  await sleep(settings.latencyMs);

  if (settings.offline) {
    throw new OfflineError(await readCache());
  }
  if (settings.failNext) {
    throw new Error('Something went wrong on our side. Your money is safe — this is a display glitch, not a transaction failure.');
  }

  const state = buildPersona(settings.personaId, Date.now());
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // Cache write failures are silent — worst case, offline mode has no snapshot.
  }
  return state;
}

async function readCache(): Promise<UserState | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserState) : null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
