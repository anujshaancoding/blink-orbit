# Blink Orbit

**A living daily ritual that makes BlinkMoney's Save → Grow → Borrow loop visible, honest, and shareable.**

Built for the BlinkMoney Frontend Engineering Assignment · React Native (Expo SDK 57) · TypeScript

---

## Why this feature

Community research across the micro-savings and LAMF categories surfaced a pattern:

- **Every gamified-money app in this space died or got sued for gamifying the money itself.** Jar's reward-heavy referrals are cited in a police FIR; Deciml froze user funds; Fello's prize-pool economics collapsed. What survived is gamifying the *act* of saving (streaks, goals, progress) — never spins or mystery rewards.
- **Trust is the category's open wound.** Jar users discovered ~5–6% silently lost to GST + spread. The most-upvoted community request is essentially: *"show me what I actually earned, the honest way."* Nobody ships that dashboard.
- **LAMF — BlinkMoney's moat — is nearly unknown**, and where it's known it's feared: surprise forced liquidations, "9.5%" loans that effectively cost 16.4%, invisible interest accrual, unpledge trap-doors.
- **What Indian Gen Z shares is verified flexes**: real return screenshots and journey stories (the entire reason Zerodha built Verified P&L).

Blink Orbit is one coherent answer: **gamified honesty**. It moves four of the five assignment outcomes:

| Outcome | How |
|---|---|
| Wealth gamification | The orb + Borrow Power ring make the loop physical: every ₹ saved visibly grows tomorrow's borrowing power |
| Engagement | The daily pulse ("While you slept · +₹14.20") + save streak give a reason to *return and act*, not just open |
| Virality | The Blink Card — a verified-style milestone card with real XIRR vs FD, watermarked and dated |
| Referral | Every shared card carries a referral deep link |

## The experience

**Orbit (home)** — your wealth as a living system, rendered in Skia: a breathing core (portfolio), five asset satellites orbiting at allocation-scaled speeds, and the **Borrow Power ring** that closes as you approach the ₹50K credit-line unlock. Tap the orb — or **pull it down like a slingshot** (rubber-band resistance, haptic arm past the threshold, release to launch into Borrow). Tap any asset chip for a **per-asset drill-down** with a 30-day sparkline. Below: the daily pulse card (what your money earned on its own — shown honestly in red on down days), the **monthly Rewind teaser**, the save streak (14-day dot history; a broken streak is framed around compounding, never shame), the **next-milestone tracker**, and self-serve **SIP management**.

**Milestones** — portfolio (₹1K → ₹1Cr) and streak (7d → 365d) milestones with a full-screen celebration (confetti burst, haptic, one at a time) whose primary action is *share the proof* — pride is the referral engine. Achievements never un-achieve: streak milestones use your best run, and a broken streak revokes nothing.

**Rewind** — a tap-through, auto-advancing 30-day story (Instagram-story grammar: progress bars, tap zones): days shown up, money earned while you lived your life, MVP asset, an honest "life happened" slide on withdrawal months, current streak, and a closing FD comparison that hands you the share card.

**Squad** — save with friends, ranked by exactly one metric: **consistency** (days saved out of 30) — never amount, so a ₹21/day student outranks a ₹2,001/day whale who skips. This is the research rule made concrete: social pressure on the habit, not the money. Day-0 users get the invite empty state; the invite *is* your Blink Card, not a referral bribe.

**Referral landing** — `blinkorbit://r/CODE` deep links open a personalized invite ("Priya saves daily"), with garbled codes degrading to a generic invite. The CTA drops the visitor into the Day-0 experience. Deliberately no signup bonus: "if the product needs a bribe, it isn't working."

**SIP control** — the single documented BlinkMoney complaint is "raise a ticket and wait two days to touch your SIP." Here: pause 7/14/30 days in two taps, resume in one, no human in the loop, and the streak pauses instead of breaking — honest system, honest rules.

**Truth** — the anti-hidden-spread screen. Your real XIRR computed from actual cash flows (bisection solver, unit-tested), benchmarked against FD / inflation / savings account with animated bars; an honest ledger (in / out / worth / earned); and an all-in cost card that names the fund expense ratio most apps hide.

**Borrow** — progress-to-unlock with an ETA at your SIP rate (no pretend credit below the floor); a **live interest meter** ticking per second with paise precision on active draws; the **draw sandbox** — drag a hypothetical draw and feel the cost (₹/day, ₹/month, vs a 16% personal loan) before ever committing, in explicit "when you unlock" framing for locked users; the **crash simulator** — drag a market drop from 0 to −40% and see exactly where margin call (−15%) and forced sale (−20%) trigger against *your* numbers, including the precise top-up that restores the ratio; and the fine print (unpledge takes 2–4 days) surfaced upfront instead of in a PDF.

**Blink Card (share)** — renders a branded milestone card (day N, portfolio, real XIRR vs FD, streak) to a PNG via `react-native-view-shot` and hands it to the native share sheet. Deliberately labeled "XIRR computed from actual cash flows · not a projected return" — credibility is the flex.

**Demo controls** — five personas (Day-0, steady saver, lapsed streak, rough month with a withdrawal, ₹1Cr+ whale with an active draw), latency presets, fail-next-request, and offline mode. Every loading/empty/error/success state is reproducible live, not claimed in screenshots.

## Run it

```bash
npm install
npx expo start        # scan the QR with Expo Go (Android/iOS), SDK 57
npm test              # 34 unit tests on the financial/streak/format logic
npx tsc --noEmit      # strict typecheck
npx expo lint         # eslint incl. React Compiler rules — clean
```

No backend needed: the mock API layer simulates latency, failures, and an offline cache.

## Architecture

```
src/
  app/                  expo-router: (tabs)/{index,truth,borrow,squad} + share/debug/sip/rewind
                        modals + asset/[asset] drill-down + r/[code] referral landing
  components/
    orbit/              Skia orb, ring, satellites + slingshot hero composition
    pulse/              daily pulse card, streak card
    celebrate/          milestone celebration overlay (confetti), next-milestone card
    ui/                 AppText, Card, PressableScale, CountUp, Skeleton, BlinkSlider, state views
  data/                 types, seeded persona generator, squads, mock API, store (context)
  lib/                  pure logic: finance (XIRR/LAMF/crash sim), dates (streaks), milestones,
                        rewind aggregation, format (INR)
  theme/                design tokens derived from blinkmoney.in (forest greens + lime, Space Grotesk/Mono)
```

Principles:
- **Pure logic lives in `lib/`** — every financial number on screen comes from a unit-tested function.
- **One motion system** — Reanimated 4 on the UI thread; a single clock drives the orbit; springs and durations come from shared tokens.
- **Personas are seeded** (mulberry32) — histories look organic but are reproducible demo-to-demo.
- **React Compiler enabled**; lint runs its purity rules (no `Date.now()` in render — the store exposes a canonical `loadedAt`).

## Edge cases handled

Money & formatting
1. Indian digit grouping everywhere (₹12,34,567 — never 1,234,567).
2. Lakh/crore compaction so a ₹1Cr+ portfolio never overflows the orb or the share card (whale persona stress-tests this).
3. Negative amounts use a true minus, outside the ₹ sign (−₹1,240); down days render red — never hidden.
4. Paise shown only where precision matters (live interest meter); rounded elsewhere.
5. `NaN`/`Infinity` guarded to "—" so a bad payload can never render "₹NaN".
6. XIRR has no solution for brand-new users / all-negative flows → renders "—" with an explanation, not a fake 0%.

Streaks & time
7. Streaks count local calendar days, not 24-hour windows — an 11:59 PM save and a 12:01 AM save are consecutive days (unit-tested).
8. A streak stays alive if yesterday was saved but today's auto-debit hasn't run yet (it lands ~7 AM).
9. Duplicate same-day saves are deduplicated.
10. Broken streaks show the best run and reframe toward compounding — no loss-aversion dark patterns.
11. Month/year boundaries in streak runs are unit-tested.

Borrow / LAMF honesty
12. No pretend credit: borrow power is ₹0 below the ₹50K floor — the UI sells progress toward unlocking, not a lie.
13. Crash simulator states are exact: safe below −15%, margin call at −15%, forced sale at −20%, with the top-up amount that restores the LTV ratio (unit-tested against the ratio identity).
14. With no active draw, the simulator says the truth: no crash can force a sale; the SIP just buys cheaper.
15. Interest accrual is ACT/365, clamps negative clock skew to 0, and ticks per second only while the screen is mounted (interval cleaned up).
16. Unpledge delay (2–4 days) is stated upfront — the #1 documented LAMF complaint is discovering this late.

Network & states
17. Loading skeletons for all three screens (pulse animation, static under Reduce Motion).
18. Error state: friendly copy that explicitly says funds are unaffected + one-tap retry; the injected failure auto-heals so retry demonstrably works.
19. Offline with cache: stale snapshot + persistent "last synced" banner. Offline without cache: dedicated empty state.
20. Stale-response race: a sequence counter drops superseded fetches (rapid persona switching can't interleave).
21. Pull-to-refresh on the home screen.

Sharing & virality
22. Double-tap guard on share (capture + share sheet can take a second).
23. `Sharing.isAvailableAsync()` checked — graceful fallback message when no share target exists.
24. Share-sheet cancellation is not treated as an error.
25. Day-0 users get a "the habit starts tonight" card — no fake numbers to flex.
26. Referral codes are sanitized: `PRIYA51` → "Priya"; garbled/empty codes degrade to a generic invite, never an error screen.

Milestones, Rewind & Squad
27. Achievements never un-achieve: streak milestones use the best-ever run, so a broken streak revokes nothing (unit-tested).
28. Celebration backfill: on first load, only the newest achieved milestone celebrates; older ones are marked silently — no modal spam after persona switches or app reinstalls.
29. Celebrated-milestone state persists per persona (AsyncStorage), so re-opening the app never re-celebrates.
30. Rewind slides are data-driven: a month with zero saves gets a single honest "quiet month" slide; a withdrawal month gets a "life happened" slide instead of silence; the streak slide disappears at zero.
31. Rewind auto-advance pauses under Reduce Motion (tap-only), and tapping back/forward always works mid-timer.
32. Squad ranks by consistency only; ties break by streak. The whale persona proves amount doesn't buy rank.
33. Unknown asset ids in the drill-down route (stale links, wrong persona) get a graceful "not in your orbit" state.

Slingshot & sliders
34. The slingshot uses rubber-band physics with an asymptotic cap — the orb can never be dragged off-screen; horizontal pans fail over to the scroll view.
35. Arming past the release threshold fires exactly one haptic tick (edge-triggered, not per-frame).
36. Reduce Motion disables the slingshot entirely; tap navigation and the accessibility hint adapt.
37. Both sliders (crash, draw) are shared `BlinkSlider` instances: UI-thread pan, discrete snapping, threshold markers, and screen-reader increment/decrement actions.
38. Draw sandbox clamps to a fully-drawn credit line (offers repay framing instead of a dead slider) and prices ₹0 honestly: "an unused credit line is free, forever."

SIP pause
39. Pause state persists per persona and auto-expires: a pause set for 7 days ago reads as running, not stuck.
40. Pausing affects future debits only — the copy states explicitly that invested money keeps compounding and withdrawals stay available.

Accessibility & layout
41. System Reduce Motion honored globally: orbit freezes, count-ups snap, skeletons stop pulsing, confetti is skipped, press-scale becomes opacity (visible in the demo panel).
42. Font scaling supported, capped at 1.4× so number-dense rows degrade to ellipsis, never clipped overlaps.
43. Every slider is screen-reader adjustable (`accessibilityRole="adjustable"` with increment/decrement actions); the orb, streak dots, and squad rows carry full descriptive labels.
44. Orb clamps between 260–360px so it works from small phones to tablets; safe-area insets respected on notched devices.
45. Haptics are contextual (success vs warning on the pulse; selection ticks on sliders; edge-triggered arm on the slingshot) and never fire in loops.

Known limits (honest ones)
- Expo Go is the demo vehicle; a store build would use a dev client/EAS.
- Persona data is generated, not fetched — the mock API boundary is where a real backend plugs in.
- Light theme is intentionally out of scope: the brand's surfaces are dark green; the app commits to it.

## What I'd build next

Server-verified share cards (Zerodha-style signatures so the flex is cryptographically honest), real squad backends with invites and joint milestones, push notifications for the daily pulse moment, and margin-call push alerts wired to the same crash-simulator math users already trust.
