import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo } from 'react-native';

import {
  DEFAULT_DEBUG,
  DebugSettings,
  fetchUserState,
  loadDebugSettings,
  OfflineError,
  saveDebugSettings,
} from './mock-api';
import type { PersonaId, UserState } from './types';

type Status = 'loading' | 'ready' | 'error' | 'offline';

interface StoreValue {
  status: Status;
  user: UserState | null;
  /** When the current snapshot was produced — the canonical "now" for all derived math. */
  loadedAt: number;
  /** Set when status is 'error' */
  errorMessage: string | null;
  /** True when showing a stale cached snapshot in offline mode */
  isStale: boolean;
  debug: DebugSettings;
  reducedMotion: boolean;
  /** Milestone ids already celebrated for the active persona. */
  seenMilestones: string[];
  /** Epoch ms until which the SIP is paused, or null when running. */
  sipPausedUntil: number | null;
  refresh: () => void;
  setPersona: (id: PersonaId) => void;
  updateDebug: (patch: Partial<DebugSettings>) => void;
  markCelebrated: (ids: string[]) => void;
  pauseSip: (days: number) => void;
  resumeSip: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<UserState | null>(null);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [debug, setDebug] = useState<DebugSettings>(DEFAULT_DEBUG);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [seenMilestones, setSeenMilestones] = useState<string[]>([]);
  const [sipPausedUntil, setSipPausedUntil] = useState<number | null>(null);
  const requestSeq = useRef(0);
  const debugRef = useRef(debug);
  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  const load = useCallback(async (settings: DebugSettings) => {
    const seq = ++requestSeq.current;
    setStatus('loading');
    setErrorMessage(null);
    // Per-persona sidecar state (celebrations, SIP pause) loads with the user.
    try {
      const [seenRaw, sipRaw] = await Promise.all([
        AsyncStorage.getItem(`blink.seen.${settings.personaId}`),
        AsyncStorage.getItem(`blink.sip.${settings.personaId}`),
      ]);
      if (seq === requestSeq.current) {
        setSeenMilestones(seenRaw ? JSON.parse(seenRaw) : []);
        const until = sipRaw ? Number(sipRaw) : null;
        setSipPausedUntil(until && until > Date.now() ? until : null);
      }
    } catch {
      // Sidecar state is best-effort.
    }
    try {
      const state = await fetchUserState(settings);
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      setUser(state);
      setLoadedAt(Date.now());
      setIsStale(false);
      setStatus('ready');
      if (settings.failNext) {
        // failNext auto-resets after firing once; reflect that in stored settings
        const reset = { ...settings, failNext: false };
        setDebug(reset);
        saveDebugSettings(reset);
      }
    } catch (e) {
      if (seq !== requestSeq.current) return;
      if (e instanceof OfflineError) {
        if (e.cached) {
          setUser(e.cached);
          setLoadedAt(Date.now());
          setIsStale(true);
          setStatus('offline');
        } else {
          setUser(null);
          setIsStale(false);
          setStatus('offline');
        }
        return;
      }
      // failNext fired: reset the flag so retry succeeds.
      const reset = { ...settings, failNext: false };
      setDebug(reset);
      saveDebugSettings(reset);
      setErrorMessage(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadDebugSettings().then((s) => {
      setDebug(s);
      load(s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    load(debugRef.current);
  }, [load]);

  const updateDebug = useCallback(
    (patch: Partial<DebugSettings>) => {
      const next = { ...debugRef.current, ...patch };
      setDebug(next);
      saveDebugSettings(next);
      load(next);
    },
    [load],
  );

  const setPersona = useCallback((id: PersonaId) => updateDebug({ personaId: id }), [updateDebug]);

  const markCelebrated = useCallback((ids: string[]) => {
    setSeenMilestones((prev) => {
      const next = [...new Set([...prev, ...ids])];
      AsyncStorage.setItem(`blink.seen.${debugRef.current.personaId}`, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const pauseSip = useCallback((days: number) => {
    const until = Date.now() + days * 24 * 3600 * 1000;
    setSipPausedUntil(until);
    AsyncStorage.setItem(`blink.sip.${debugRef.current.personaId}`, String(until)).catch(() => {});
  }, []);

  const resumeSip = useCallback(() => {
    setSipPausedUntil(null);
    AsyncStorage.removeItem(`blink.sip.${debugRef.current.personaId}`).catch(() => {});
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      status,
      user,
      loadedAt,
      errorMessage,
      isStale,
      debug,
      reducedMotion,
      seenMilestones,
      sipPausedUntil,
      refresh,
      setPersona,
      updateDebug,
      markCelebrated,
      pauseSip,
      resumeSip,
    }),
    [status, user, loadedAt, errorMessage, isStale, debug, reducedMotion, seenMilestones, sipPausedUntil, refresh, setPersona, updateDebug, markCelebrated, pauseSip, resumeSip],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
