# CLAUDE.md — topic-explore-patterns

Working doc for picking this project back up across disconnected sessions.
For what this repo *is* and how to run/edit it, see `README.md` — this file
is current state + conventions + the milestone list, so it doesn't repeat
that.

## Current state

- Shipped and deployed: 5 interaction patterns (Carousel, Tabs, Accordion,
  Card Swipe, Portal), grey cards, real placeholder question copy.
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

## Milestones

Ordered. Each has a short scope and, where one exists, an explicit open
question to resolve at kickoff — these are deliberately *not* resolved here.

- [ ] **M1 — Motion baseline.** Every existing interaction gets an eased,
  intentional transition instead of today's instant/default behavior:
  accordion expand/collapse has *no* height animation currently, tab-content
  switches are an instant swap, switcher navigation between patterns is a
  hard re-render. No new patterns, no visual redesign — get the existing
  shell feeling considered before building anything new on top of it.

- [ ] **M2 — Shell usability pass.** The bottom switcher (5 items in a
  ~64px bar at 390–440px width) and the menu list are cramped — visible in
  the build session's own verification screenshots. Bigger touch targets,
  roomier menu. *Open question:* does 5-way switching even belong in a
  persistent bottom bar, or does it want a different shape entirely? Decide,
  don't just add padding.

- [ ] **M3 — Visual system refresh.** Replace the ad hoc grey-box CSS
  values with a small deliberate system: a clean sans-serif, a type scale, a
  spacing scale, a neutral palette. Not required to be NYT's system. *Open
  question:* typeface + palette candidates, to propose at kickoff rather
  than commit to now. Cards stay grey in spirit — this is about the chrome
  around them.

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
  re-specified.

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
