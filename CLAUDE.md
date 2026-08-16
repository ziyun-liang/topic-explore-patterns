# CLAUDE.md — topic-explore-patterns

Working doc for picking this project back up across disconnected sessions.
For what this repo *is* and how to run/edit it, see `README.md` — this file
is current state + conventions + the milestone list, so it doesn't repeat
that.

## Current state

- Shipped and deployed: 5 interaction patterns (Carousel, Tabs, Accordion,
  Card Swipe, Portal), grey cards, real placeholder question copy.
- **Visual system done (M3).** The governing rule is **grey fill means
  tappable** — content sits on white and is separated by space alone. That's
  what let every hairline border go. Four greys, four type sizes (30/19/15/12),
  one radius family (12/20/999), system sans only, no webfont. Device frame on
  desktop ≥900px. Don't reintroduce `1px solid` anywhere; if something reads as
  mush the fix is more space.
- Live at `https://ziyun-liang.github.io/topic-explore-patterns/` — verified
  on localhost and on the live URL (Playwright at 390×844, zero console
  errors).
- Zero build step, zero dependencies. Plain `index.html` / `styles.css` /
  `content.js` / `patterns.js`. Hash routing (`#/carousel` etc.), pinned
  bottom switcher.
- `content.js` is the one hand-edited data file — question copy per pattern.
  Card counts per pattern are fixed (matching the source Figma sketch),
  wired in `patterns.js`'s `CARD_COUNTS`, not content-driven.
- This repo (`ziyun-liang/topic-explore-patterns`, public) is the source of
  truth while iterating. Fold-in path to napp-100's `understand-intents`
  prototype is fully scoped in `README.md`'s "Path to hi-fi" section — not
  repeated here.

## Working conventions

- **Animation/craft work:** invoke `/emil-design-eng` for taste and judgment
  on the polish itself. When writing actual motion code, invoke the relevant
  `/gsap-*` skill(s) — `gsap-core` / `gsap-timeline` for basics and
  sequencing, `gsap-plugins` for `Draggable`/`Inertia` (swipe-deck momentum)
  and `Flip` (card → full-screen expand), `gsap-performance` before calling
  any motion work done. GSAP is the leading candidate for M4 specifically
  because it CDN-loads with no build step — matches this repo's
  zero-dependency convention (the same way the earlier `understand-intents`
  exploration CDN-loads D3). Not a locked-in decision until M4 actually
  happens.
- **Verify visually before calling a craft change done:** serve locally
  (`python3 -m http.server`), screenshot at phone width (390×844) — same
  Playwright check used to verify the original shell. For anything
  feel-dependent (drag, momentum, expand transitions), open the real
  deployed URL on an actual phone — a static screenshot can't show that.
- `content.js` stays the one hand-edited data file. Never hardcode question
  copy into `patterns.js`.
- Default to zero build step / vanilla JS+CSS. Most animation libraries
  worth considering here (GSAP included) CDN-load without a bundler. If a
  milestone genuinely needs one, flag it explicitly before adding — don't
  let it happen as a side effect of picking a library.
- **Reference material:** video clips of motion Lindsey wants analyzed go in
  `reference/` (gitignored — this repo is public, and reference clips of
  other products' motion shouldn't be published in it). Point at files
  there directly rather than pasting links.
- **Real NYT content:** video/image assets staged ahead of M6 go in
  `assets/` (also gitignored — public repo, proprietary editorial content,
  same reasoning as the font decision above). This is separate from
  `reference/`: `reference/` is research input that never appears in the
  prototype itself; `assets/` is real content headed for the eventual hi-fi
  swap.

## Milestones

Ordered. Each has a short scope and, where one exists, an explicit open
question to resolve at kickoff — these are deliberately *not* resolved here.

- [ ] **M1 — Motion baseline.** Every existing interaction gets an eased,
  intentional transition instead of today's instant/default behavior:
  accordion expand/collapse has *no* height animation currently, tab-content
  switches are an instant swap, switcher navigation between patterns is a
  hard re-render. No new patterns, no visual redesign — get the existing
  shell feeling considered before building anything new on top of it.

- [~] **M2 — Shell usability pass.** *Switcher half is done* (folded into M3,
  2026-08-16). The open question — does 5-way switching belong in a persistent
  bottom bar — is **answered: no.** The switcher is *harness* chrome, not
  product chrome; a bottom tab bar reads as app navigation and contaminates the
  pattern being evaluated. It's now a horizontally scrollable pill row that
  lifts out of the phone entirely on desktop (≥900px) and sits on the field
  below the frame. Menu rows also went from 55px to ~76px tall.

  *Still open — two responsive bugs found 2026-08-16 and consciously deferred*
  (Lindsey's call: "pause on this change first"). Both measured, don't
  rediscover them:
  1. **Landscape phone letterboxes.** A landscape iPhone is 932px wide, so it
     passes the `@media (min-width: 900px)` frame gate, but it's only 430px
     tall — `height: min(844px, 100vh - 150px)` collapses the frame to **280px**.
     The gate tests *width* when what it means is "is this a desktop browser."
     Fix would be `and (min-height: 700px) and (pointer: fine)` — a touchscreen
     fails `pointer: fine` at any width. Less urgent since the bezel came out: a
     squashed white card degrades far more gracefully than a squashed black ring.
  2. **Tablet portrait has no ground.** Below 900px there's no frame, so the
     440px column floats on pure white with nothing marking its edges (768px
     iPad portrait verified). The pre-M3 CSS had a `1px solid` outline here;
     it was correctly deleted but never replaced. Fix would be a tinted field +
     soft shadow on the column — same language as the desktop frame, no bezel.

- [x] **M3 — Visual system refresh.** Done 2026-08-16. See the session log
  entry for what shipped and the governing rule.

- [ ] **M4 — Motion research → framework decision.** Lindsey drops
  reference videos into `reference/`; a session watches them, names 2–3
  concrete candidate approaches (GSAP `Draggable`/`Inertia`/`Flip` per the
  conventions above; Motion One and the native Web Animations API are
  zero-dependency alternatives worth naming too), and the milestone ends
  with a **chosen** approach — not just a research writeup that never
  converts to a decision.

- [ ] **M5 — Pattern variants exploration.** Build the two named ideas:
  (a) Card Swipe becomes an in-place horizontal carousel rather than
  dismiss-and-cycle; (b) tap or swipe expands a card into an immersive
  full-screen view. Deliberately sequenced *after* M4 — building these twice
  (once naive, once in whatever framework M4 picks) wastes the polish work.
  *Open question:* do these replace their existing pattern, or ship as a
  toggleable alternate alongside it?

- [ ] **M6 — Real content + fold into napp-100.** Already fully scoped in
  `README.md`'s "Path to hi-fi" section. Listed here only for ordering — not
  re-specified. Real assets can be staged early in `assets/` (gitignored,
  see conventions above) ahead of this milestone actually starting.

## Backlog

Unscheduled ideas mentioned in passing — add here rather than losing them,
promote into a milestone once there's enough shape to act on.

*(empty — nothing yet that doesn't already map to a milestone above)*

## Session log

- **2026-08-15** — Shell built: 5 patterns, hash routing, grey cards + real
  question copy. Deployed to `ziyun-liang.github.io/topic-explore-patterns`.
  Verified on localhost + live URL via Playwright (390×844, zero errors).
  This `CLAUDE.md` created to track the next phase (craft/animation/visual
  polish) across sessions.

- **2026-08-16** — **M3 done + M2's switcher question resolved.** Diagnosed the
  reference images in `reference/Low-fi-style/`: they make *fewer* decisions and
  execute each generously, where the old CSS made more at smaller amplitude (8
  type sizes in a 14px range, 5 greys with 3 indistinguishable, 6 radii, three
  separator mechanisms at once, two typefaces). Shipped:
  - Georgia removed everywhere. It was a bad Cheltenham stand-in (warmer,
    rounder — read "2010 blog") and its `font-weight: 500` never even applied.
    `styles.css`'s header now marks the explicit type-deferral point.
  - All 8 hairline borders deleted; `--line` removed so it can't creep back.
  - Placeholders redesigned — photo glyph + pill-rounded bars with
    deterministic width variation. This was the biggest win: the placeholder is
    ~80% of the pixels, so a flat rectangle made everything else read as crude.
  - Menu/accordion/tab/switcher became filled grey blocks with white
    arrow-in-circle affordances (Ref 4). Text glyphs `⌄ → ‹` → inline SVG.
  - Device frame on desktop (bezel = a spread shadow, no extra DOM), home
    indicator on a scrim.
  - Press feedback (`scale(0.97)` @ 160ms) + `--ease-out` token defined for M1.
  - **Two latent bugs found and fixed while in there:** (1) Portal's
    `flex: 0 0 70%` was resolving against a content box shrunk by the strip's
    own `padding-right: 30%`, so cards were ~49% of the window and the "peek"
    had collapsed into a cropped 2-up — runway is now a margin on the last card.
    (2) The swipe deck was invisible because opacity-fading near-white cards on
    white erases them; depth now comes from offset + scale + shadow.
  - `shortLabel` went 4 words → 3; four-word tab labels ate 60% of the strip.
  - Verified via Playwright at 390×844 and 1440×900: 0 hairlines, 0 serif,
    exactly 4 type sizes, one radius family, 0 console errors, swipe drag and
    portal snap still working. **Not yet verified on a real phone** — press
    feedback and switcher scroll feel need a device.
  - **Later same day — bezel removed.** The desktop frame's `0 0 0 10px #1a1a1a`
    ring was the only hard high-contrast edge left in the file, i.e. exactly
    what the hairline borders had been doing. Replaced with a 3-layer drop
    shadow (contact / mid / ambient — a single wide blur leaves the edge
    undefined and reads as a smudge). `--bezel` token deleted. The 44px radius
    now carries the entire "this is a phone" read, so **don't reduce it.**
    Verified phone width is byte-identical across all 6 routes.
