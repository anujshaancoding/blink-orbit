# Submission Kit — Blink Orbit

Everything you need for the Google Form, in paste-ready form.

---

## One-liner

> **Blink Orbit** — a living daily ritual that makes BlinkMoney's Save → Grow → Borrow loop visible, honest, and shareable. Gamified honesty: every fintech that gamified the *money* died or got sued; this gamifies the *habit* and makes credibility the flex.

## Short write-up (paste into the form)

I researched what actually kills apps in this category before building. Jar's users discovered ~5–6% silently lost to spreads; Deciml froze funds; Fello's prize-pool gamification collapsed; Jar's reward-heavy referrals are cited in a police FIR. Meanwhile BlinkMoney's real moat — a credit line that grows as you save — is a product category (LAMF) most Indians don't know exists, and where they do, they fear surprise liquidations and hidden interest.

Blink Orbit is one coherent answer: **gamify the act of saving, never the money, and make honesty the product.**

- **The Orbit**: your portfolio as a living Skia-rendered system — a breathing core, five asset satellites, and a Borrow Power ring that visibly closes as you approach the ₹50K credit-line unlock. Pull the orb down like a slingshot to feel your borrow power.
- **The Ritual**: a daily pulse ("While you slept · +₹14.20" — shown honestly in red on down days), calendar-day save streaks, milestone celebrations whose primary CTA is sharing, and a monthly Rewind story.
- **The Truth**: real XIRR from actual cash flows benchmarked against FD/inflation, an all-in cost card, a crash simulator showing exactly what happens to a pledge at −15%/−20%, a live per-second interest meter, and a draw sandbox that prices borrowing before you commit.
- **The Loop**: verified-style share cards with dated real numbers and referral deep links; squads ranked purely by consistency (days saved / 30) so ₹21/day beats a skipping whale; self-serve SIP pause — the exact complaint in BlinkMoney's own Play Store reviews.

It moves four of the five outcomes (wealth gamification, engagement, virality, referral) with one narrative. Fully working: mock API with latency/failure/offline injection, five demo personas reachable from an in-app panel, 45 documented edge cases, 41 unit tests, React Compiler enabled, reduced-motion accessible. Tested live on an Android emulator.

## What to demo in the video (~3 min script)

1. **Open on Steady Saver** — orb breathing, satellites orbiting, ring at ~37%. Pull the orb (slingshot) → release into Borrow.
2. **Borrow tab** — drag the crash simulator past −15% and −20% (watch the status change), drag the draw sandbox, mention the fine print.
3. **Truth tab** — XIRR bars animate vs FD/inflation; point at the cost card.
4. **Demo controls** — switch to **Day-0** (empty states), then **Crore Club** (crore formatting, live interest meter ticking), then flip **Fail next request** (error state + retry heals), then **Offline** (stale banner).
5. **Milestone celebration** fires on persona switch → "Share the proof" → native share sheet with the card.
6. **Rewind** from the home teaser — tap through the story.
7. **Squad tab** — point out ranking is days-saved, not amount.
8. Quick flash of `npm test` (41 passing) and the README edge-case list.

## Submission steps

1. **Push to GitHub** (2 min):
   ```bash
   cd blink-orbit
   gh repo create blink-orbit --private --source . --push
   # or: create empty repo on github.com, then
   # git remote add origin git@github.com:<you>/blink-orbit.git && git push -u origin main
   ```
   If the reviewers need access to a private repo, either make it public or add them as collaborators.

2. **Record the demo** (10–15 min): emulator or physical phone via `npx expo start`. macOS screen-record the emulator window (⌘⇧5), or on a phone use Android's built-in screen recorder. Upload to Google Drive (link-visible) or YouTube unlisted.

3. **Optional APK** (~20 min, needs an Expo account):
   ```bash
   npx eas init && npx eas build -p android --profile preview
   ```
   Skip if time is tight — the repo + video carry the submission.

4. **Fill the form**: https://forms.gle/kHsNC4NkPN9hCfc69
   - Repo link, video link, (APK link), the write-up above.
   - Deadline: **15 Aug, 11:59 PM.**

5. Questions → mridul.mathur@blinkmoney.in
