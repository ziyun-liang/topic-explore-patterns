# CLAUDE.md — topic-explore-patterns

Working doc for picking this project back up across disconnected sessions.
For what this repo *is* and how to run/edit it, see `README.md` — this file
is current state + conventions + the milestone list, so it doesn't repeat
that.

## Current state

- Shipped and deployed: 5 interaction patterns (Carousel, Tabs, Accordion,
  Card Swipe, Portal), grey cards, real placeholder question copy.
- **Motion baseline done (M1).** Nothing cuts any more: content cascades in on
  mount (two-tier — header, then question-groups), the accordion animates its
  height, and tab content re-enters instead of swapping. All five patterns share
  one primitive and one set of tokens — see M1 for why that's load-bearing.
  Verified pixel-identical to pre-motion in every settled state, so the M3
  visual system is provably untouched.
- **Visual system done (M3).** The governing rule is **grey fill means
  tappable** — content sits on white and is separated by space alone. That's
  what let every hairline border go. Four greys, four type sizes (30/19/15/12),
  one radius family (12/20/999), system sans only, no webfont. Shadow-only
  device frame on desktop ≥900px (no bezel). Don't reintroduce `1px solid`
  anywhere; if something reads as mush the fix is more space.
- Live at `https://ziyun-liang.github.io/topic-explore-patterns/`, current as of
  commit `0d01365`. Verified against the **deployed** URL, not just localhost
  (Playwright at 390×844 and 1440×900, zero console errors).
- **Outstanding: never checked on a real phone.** Press feedback, switcher
  scroll momentum, and now the whole M1 motion layer — cascade rhythm, accordion
  height feel, whether rapid switcher tapping stutters — can't be verified from a
  screenshot. Do this before treating any feel-dependent work as done.
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

## Findings

What the prototype has actually told us about the patterns. This is the output;
everything else is scaffolding.

- **Tabs cannot carry a real question at phone width.** Established 2026-08-16 by
  putting the full question in each pill instead of a 3-word truncation. Measured
  at 390px (strip visible width 390px):

  | pill | width | vs screen |
  |---|---|---|
  | Are teachers worried about A.I.’s impact? | 322px | 83% |
  | How are young people feeling about A.I.? | 322px | 83% |
  | How can graduates prepare for the A.I. economy? | 382px | 98% |
  | How do A.I. companies make money from the education sector? | **482px** | **124%** |

  Total strip width 1573px — **4× the viewport**. The longest question makes a
  pill wider than the phone.

  **This overflow is deliberate and must not be "fixed".** Lindsey's explicit
  call: the truncation was *hiding* the constraint, and hiding it is the opposite
  of what a stress-test prototype is for. A future session that trims the labels
  to make the strip tidy destroys the finding.

  **Amended later the same day:** the duplicate question heading below the strip
  is now **gone** (Figma 199:5046 shows cards directly under the pills). So the
  question exists in exactly one place — a pill wider than the screen — which
  *sharpens* the finding rather than softening it: reading the current question
  now genuinely requires scrolling the strip. The earlier note here said the
  heading stayed "so the question is always readable"; that is no longer true and
  is no longer the intent.

  Two escape hatches exist if this ever needs to become usable rather than
  evidential, both considered and rejected for now: let pills wrap to 2 lines
  (radius would move 999px → 20px, and it converges visually on the Portal
  pattern, which is itself interesting); or author explicit short labels per
  question, decoupling pill text from copy.

## Working conventions

- **Visual/craft work: invoke `/lowfi-craft` first.** It was extracted *from*
  this repo's M3 refresh (2026-08-16), so it encodes this project's own visual
  system — the audit, the grey-fill rule, the placeholder recipe, and the traps
  that cost time here. `~/.claude/skills/lowfi-craft/`. Run its `audit.js` in the
  console before and after any visual change: target is **smallest gap between
  adjacent font sizes ≥ 1.2×**, 0 borders, 0 serif nodes, ≤3 radii + pill.
  Counts, not impressions. Note it explicitly overrides `frontend-design` /
  `ui-ux-pro-max` here — their advice to pick a characterful display face and a
  signature element is correct for finished UI and wrong at this fidelity.
- **Animation/craft work:** invoke `/emil-design-eng` for taste and judgment
  on the polish itself. **Extend M1's primitive rather than inventing new
  motion** — the tokens in `styles.css`'s `:root` and `.rise-in` / `.swap-in`
  are the whole vocabulary, and the point is that all five patterns share it
  (see M1). Retune the tokens; don't add a second easing or a per-pattern
  duration.

  When writing motion code that the primitive genuinely can't express, invoke
  the relevant `/gsap-*` skill(s) — `gsap-core` / `gsap-timeline` for basics and
  sequencing, `gsap-plugins` for `Draggable`/`Inertia` (swipe-deck momentum) and
  `Flip` (card → full-screen expand), `gsap-performance` before calling any
  motion work done. GSAP is the leading candidate for M4 specifically because it
  CDN-loads with no build step — matches this repo's zero-dependency convention
  (the same way the earlier `understand-intents` exploration CDN-loads D3). Not
  a locked-in decision until M4 actually happens, and M1 shipped without it
  precisely to keep that decision open.
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

- [x] **M1 — Motion baseline.** Done 2026-08-16 (same day as M3). All three
  instant transitions fixed, plus a universal appear cascade. The kickoff
  question — "animating these may mean keeping nodes alive rather than
  rebuilding" — was answered **yes, for both**: that restructure *was* the work,
  and the CSS is small. See the session log entry for detail and the two
  regressions found on the way.

  **The governing rule, and it's not negotiable:** motion is **identical across
  all five patterns**. One primitive, one set of tokens, no per-pattern tuning.
  This prototype's job is a head-to-head comparison, so a more charming
  entrance on one pattern buys a preference for the wrong reason. Same
  reasoning as M2's switcher call. If you're tempted to give one pattern its
  own timing, that's the thing to resist.

- [~] **M2 — Shell usability pass.** *Switcher half is done* (folded into M3,
  2026-08-16). The open question — does 5-way switching belong in a persistent
  bottom bar — is **answered: no.** The switcher is *harness* chrome, not
  product chrome; a bottom tab bar reads as app navigation and contaminates the
  pattern being evaluated. It lifts out of the phone entirely on desktop
  (≥900px) and sits on the field below the frame. Menu rows also went from 55px
  to ~76px tall.

  *Updated later on 2026-08-16:* it was a scrollable **pill row** sharing its CSS
  with the tab strip. It's now a **segmented toggle** — see the session log for
  why. The two controls must stay visually distinct.

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

  **M1 shipped in vanilla CSS on purpose, so this decision stays open.** Pulling
  GSAP in at M1 would have pre-empted M4 and bought nothing: a keyframe cascade
  and a `grid-template-rows` height are CSS's strong suit, and they run off the
  main thread. What M1 did *not* solve is the case that would actually justify a
  library — interruptible, velocity-aware, gesture-driven motion (`Draggable` /
  `Inertia` for the swipe deck, `Flip` for card→full-screen in M5). Judge M4 on
  that, not on entrances.

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

- **Tab strip has no accessible selected-state.** Noticed 2026-08-16 during M1.
  The accordion got `aria-expanded` while its markup was being rewritten — that
  attribute is unambiguously correct for a disclosure, so it was a free win. The
  tab strip is *not* the same call, and was deliberately left alone: which state
  is announced depends on what these controls actually are. `role="tablist"` /
  `role="tab"` / `aria-selected` / `role="tabpanel"` is the correct pattern if
  they're tabs, and it drags in `aria-controls` id wiring plus arrow-key
  navigation. `aria-pressed` on plain buttons is the lighter, defensible option
  if we call this a segmented control (it shares its CSS with the switcher, which
  argues for that reading). That's a design decision, not a drive-by fix. Note
  the active tab is currently distinguished by **colour alone**, which is also a
  WCAG 1.4.1 question worth settling at the same time.
- **Simulated async loading (skeleton → content).** Raised 2026-08-16 while
  scoping M1 and deliberately left out of it. There is nothing async in this
  prototype — the grey cards are permanent lo-fi *content*, not a loading state
  — so this would mean *faking* a load: pulse/shimmer placeholders for
  ~600–900ms, then the cascade. Worth considering because the real product does
  load async and that's a genuine design problem (the sibling
  `understand-and-latest-news` exploration hit it), but it makes every pattern
  slower to review, which is a real cost in a comparison harness. Decide
  *after* feeling the cascade on a phone. Don't fold it into another milestone
  silently — it needs its own scope and its own opinion about what the fake
  delay is teaching us.

## Session log

- **2026-08-15** — Shell built: 5 patterns, hash routing, grey cards + real
  question copy. Deployed to `ziyun-liang.github.io/topic-explore-patterns`.
  Verified on localhost + live URL via Playwright (390×844, zero errors).
  This `CLAUDE.md` created to track the next phase (craft/animation/visual
  polish) across sessions.

- **2026-08-16** — **M3 done + M2's switcher question resolved.** Diagnosed the
  reference images in `reference/Low-fi-style/`: they make *fewer* decisions and
  execute each generously, where the old CSS made more at smaller amplitude (8
  type sizes, 5 greys with 3 indistinguishable, 6 radii, three separator
  mechanisms at once, two typefaces). **Precise metric, established later while
  extracting the skill:** total span barely discriminates — the old 8-size scale
  spanned 2.3× and the new 4-size one spans 2.5×. What separates them is the
  *smallest gap between adjacent sizes*: **1.05× before** (`10.5` and `11` were
  doing the same job) **vs 1.25× after**. Any two neighbours within ~1.15× means
  one is dead weight. Shipped:
  - Georgia removed everywhere. It was a bad Cheltenham stand-in (warmer,
    rounder — read "2010 blog") and its `font-weight: 500` never even applied.
    `styles.css`'s header now marks the explicit type-deferral point.
  - All 8 hairline borders deleted; `--line` removed so it can't creep back.
  - Placeholders redesigned — photo glyph + pill-rounded bars with
    deterministic width variation. This was the biggest win: the placeholder is
    ~80% of the pixels, so a flat rectangle made everything else read as crude.
  - Menu/accordion/tab/switcher became filled grey blocks with white
    arrow-in-circle affordances (Ref 4). Text glyphs `⌄ → ‹` → inline SVG.
  - Device frame on desktop, no extra DOM, home indicator on a scrim. (Shipped
    with a 10px black bezel ring; removed later the same day — see below.)
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
  - **Deployed.** Commit `0d01365` pushed to `main`; GitHub Pages is classic
    branch-based (`source: {branch: main, path: /}`) so main is the only branch
    that moves the live URL — don't branch for changes meant to go live. Verified
    by loading the deployed URL in a browser, not just trusting the build status.
  - **Extracted `/lowfi-craft`** (`~/.claude/skills/lowfi-craft/`) from this
    work — SKILL.md + `audit.js` + `starter.css`, whose token block diffs
    byte-identical against `styles.css`. Writing it corrected the type-scale
    metric recorded above. The skill's GREEN is unverified by design: we know it
    names the right failures, not that it changes a fresh agent's behaviour.
    Dogfood it on the next visual pass and the audit numbers will settle it.

- **2026-08-16 (later same day) — M1 done.** Universal appear cascade + all
  three instant transitions. Vanilla CSS, no dependency, no build step (see M4
  for why that was deliberate).
  - **The primitive:** one `@keyframes rise-in`, one `.rise-in` class, and a
    `--i` index custom property stamped by `cascade()` in `patterns.js`. All
    timing lives in tokens (`--dur-enter` 280ms, `--stagger` 40ms, `--rise` 8px),
    so there's exactly one place to retune and no pattern can drift. Renderers
    opt in by putting `cascade-item` in a class string they already build — a
    sixth pattern would get the entrance for free.
  - **Two-tier, not three.** Groups stagger; cards arrive *with* their group.
    The group is the unit each pattern organises, so that's what the motion
    expresses. Worst case (5-item accordion) totals ~440ms.
  - **Tabs and accordion both had to stop rebuilding.** That restructure was
    the actual work. `renderTabs` now builds the strip once and only moves
    `.active`; `renderAccordion` keeps every body in the DOM and toggles a
    class. Both are net simplifications — the old accordion threw away and
    recreated all five items' placeholder DOM on every single tap.
  - **Accordion height uses `grid-template-rows: 0fr → 1fr`**, so no JS height
    measurement. Needs Chrome 117+ / Safari 17.4+ / FF 120+; older browsers
    snap, which is what it replaced.
  - **Two latent bugs found and fixed on the way, both worth not rediscovering:**
    1. **`padding` on a collapsing grid item cannot collapse.** First attempt put
       `padding: 20px 0 8px` on `.acc-body` itself; `min-height: 0` lets the
       *content* shrink to zero but padding is always laid out, so
       `grid-template-rows` floored at **28px** instead of 0 and every closed
       panel kept a 28px ghost — which pushed the last accordion item down 56px
       and clipped it under the switcher. Measured, not guessed. Fix: the inset
       lives on `.acc-body .cards-row`, inside the `overflow: hidden` box, where
       it can be clipped away.
    2. **The old `renderTabs` reset `.tab-strip`'s `scrollLeft` to 0** on every
       tap, because it rebuilt the strip. At 390px the 4th tab is off-screen, so
       tapping it scrolled the row and the rebuild immediately snapped it back.
       Confirmed against HEAD (60 → 0, strip node replaced) vs now (60 → 60,
       same node). Rebuilding also destroyed the tapped button mid-`:active`,
       killing the press feedback M3 shipped.
  - **Entrance classes are stripped on `animationend`,** and that is not
    cosmetic: `animation-fill-mode: both` keeps *pinning* opacity and transform
    to the keyframe's end values while the class is on the element, silently
    outranking any later CSS touching either property. A hover transform added
    to `.swipe-group` later would just not work. Removing it also releases the
    compositor layer, which is what made the settled frames go pixel-identical.
  - **Tab height question (deferred in the plan) — answered, no fix needed.**
    All four tab questions wrap to exactly 2 lines at 390px and `.tab-content`
    is **288px for every tab, 0px spread**. No layout jump on tab change, so no
    `min-height`. If `content.js`'s tab copy ever changes, re-measure.
  - **Verified:** lowfi-craft `audit.js` numbers unchanged (4 type sizes, minStep
    1.25×, 0 borders, 0 serif); **all 12 settled frames pixel-identical to
    pre-motion** (6 routes × 390×844 and 1440×900); 922 layout boxes compared
    against HEAD with only the intended `.cards-row` padding move differing;
    8/8 behaviour tests (stagger measured mid-flight, accordion open+close
    interpolating simultaneously, tab swap + strip persistence, no replay on
    re-tapping the active tab, reduced-motion fade-only); 0 console errors.
  - **Still not verified on a real phone** — same standing gap as M3, and it
    matters more now. Cascade rhythm, accordion height feel, and whether rapid
    switcher tapping stutters are exactly what a screenshot cannot show.

- **2026-08-16 (third pass) — pattern header simplified.** Lindsey's sketch. The
  header now reads: a back row (chevron circle + the label **"Ways in"**), then
  the theme name as the title. Three deliberate calls behind it:
  - **All five screens show the same title** (`AI education impact`, from
    `CONTENT.topic`) and the pattern's own name is gone from inside the frame.
    Which pattern you're in is the **switcher's** job — naming it in the header
    made every screen read as a labelled specimen rather than a product screen.
    Same argument as M2's switcher call. **Don't put the pattern name back**
    without reopening that decision.
  - **The uppercase topic eyebrow is gone.** Once the theme *is* the title, an
    eyebrow above it was saying the same thing twice. Note this drops those
    routes from 4 type sizes to 3 (30/19/15 — only `#/swipe` still uses 12px, via
    `.deck-hint`, and `#/` via `.menu-eyebrow`). That's fine: the audit target is
    3–4 sizes and minStep went 1.25× → **1.27×**, i.e. slightly tighter. The
    scale still *defines* four; individual screens just don't all use four.
  - **The back label is verbatim the menu's own H1.** A back label that doesn't
    match the page you land on is worse than no label, so these two strings are
    coupled: **rename one and you must rename the other.** ("All entry points"
    was considered and would have meant renaming the menu H1 too.)
  - The whole row is the link, not just the circle — tap target went 36×36 →
    **113×36**. This bends "grey fill means tappable" since the label has no
    fill; it's an intentional exception (that rule exists to stop *content* from
    reading as tappable, and a back label isn't content), commented as such in
    `styles.css`. Press feedback scales from `left center` so the circle holds
    still and only the label compresses.
  - No `aria-label` on the back link, on purpose: the visible "Ways in" is the
    accessible name, and an aria-label would override it — leaving a
    voice-control user saying "tap Ways in" with nothing to match.
  - `.pattern-name` was renamed `.screen-title`, since it no longer holds a
    pattern name and the old name would actively mislead.
  - Verified: 7/7 behaviour tests still pass, audit within targets, 0 console
    errors, back link lands on `#/` whose H1 is exactly "Ways in".

- **2026-08-16 (fourth pass) — new question copy + Tabs shows full questions.**
  - Theme renamed `A.I. education impact` (periods, matching the questions and
    NYT house style). All five question strings replaced. Counts and structure
    untouched at Lindsey's request — still one pool of 5, first-N per pattern
    (3/4/5/3/4), still physically duplicated across the per-pattern arrays.
  - Two of the five arrived in the embedded form with a question mark ("How
    graduates can prepare…?"); corrected to the direct form ("How **can**
    graduates prepare…?", "How **do** A.I. companies make money…?") so all five
    are actually questions. Apostrophe is the typographic `’`, both for house
    style and because a straight `'` would terminate the single-quoted strings.
  - **`shortLabel` deleted.** Tabs pills now carry the full question. See
    **Findings** for what that revealed and why the resulting overflow is
    deliberate. Copy is no longer constrained to open with distinct first-3-words,
    which is a real freeing-up — but it now drives pill width directly instead.
  - **The tab-height question flipped and got fixed.** The M1 pass measured 0px
    spread; the new copy made it **25px** (short questions wrap to 1 line, long
    ones to 2), so the cards jumped mid-swap — a layout shift and a fade at once.
    `.tab-content .q-title` now reserves two lines via `min-height: 2.7em`
    (2 × the 1.35 line-height, tracking `--t-title` rather than hardcoding 51px).
    Re-measured: all four tabs hold the cards at y=284, **spread 0px**.
    *This will need re-checking on any future copy change* — it's a function of
    the copy, not a permanent property.
  - Note the eyebrow removal earlier in the day already took most routes to 3
    type sizes; that holds (30/19/15, minStep 1.27×). Audit still within targets,
    7/7 behaviour tests, 0 console errors.

- **2026-08-16 (fifth pass) — switcher became a segmented toggle.** Lindsey's
  sketch, and her reasoning: the switcher and the Tabs strip were the same pill
  shape on the same screen, so people would confuse them.
  - **The shared CSS rule was split, on purpose.** Its old comment said "the tab
    strip and the switcher are the same control shape, so they share one rule and
    can't drift apart" — that sharing *was* the bug. Two controls with an
    identical shape read as the same kind of thing, and these aren't: the tab
    strip is the pattern under test, the switcher navigates the harness. **They
    are now deliberately different shapes. Don't re-merge the rules.**
  - **One grey track, active segment lifted out in white,** segments abutting
    (`gap: 0` — the track does the grouping, and gaps would pull it back toward
    reading as separate pills). The white-on-grey move is this file's existing
    vocabulary, not a new invention: same trick as `.menu-item-arrow`.
  - **Typography is untouched** — 15px/500 on both controls, per Lindsey. Only
    the container differs. `.tab`'s rule now says so explicitly so nobody
    "harmonises" them later.
  - **The breakpoints differ, and that's deliberate.** Phone: grey track, white
    active. Desktop: **white** track, dark active. A grey track can't be used on
    the desktop field — `--g-1` #f1f1f1 against `--field` #e6e6e6 is 11/255
    apart, exactly the indistinguishable-greys problem M3 removed. Out there
    white reads as "object" and grey as "ground", which is already how the phone
    frame works, so the track goes white and the active segment takes the dark
    end. The rule spanning both is **"the active segment takes the far end of the
    ramp from its own track"**, not a fixed colour.
  - **No edge mask on the switcher, unlike `.tab-strip`.** A toggle needs crisp
    rounded ends; fading the track's own edges would dissolve the boundary that
    makes it one control. The border-radius clips the scrolling segments instead.
  - **Inactive segments get a fill on press.** With no fill of their own the
    shared `scale(0.97)` moved only the text, which is nearly no feedback.
  - Verified: active segment still scrolls fully into view on deep link
    (`#/portal` → track scrollLeft 126, segment inset 5px from the right edge);
    7/7 behaviour tests; audit within targets — and distinct greys per screen
    actually dropped 5 → 4 on most routes, since inactive segments are now
    transparent.

- **2026-08-16 (sixth pass) — the switcher indicator slides.** Lindsey asked whether
  the white pill could travel between segments rather than cut.
  - **The switcher now PERSISTS across navigations, and that was the whole job.**
    `render()` used to do `app.innerHTML = ''` on every `hashchange`, and
    `renderPatternView` built a fresh `<nav class="switcher">` each time — so
    tapping a segment destroyed the control and rebuilt it with the new segment
    already active. Nothing to animate from. `render()` now replaces **only the
    `.device` subtree** (`app.querySelector('.device')` → remove →
    `insertBefore(device, app.firstChild)`), leaving the switcher node untouched.
    A CSS transition can't be relied on across a detach and re-attach, so keeping
    the node in the DOM is load-bearing, not tidiness. **Don't reintroduce
    `app.innerHTML = ''`.**
  - Same root-cause fix as M1's tab strip: stop rebuilding, keep the node, toggle a
    class. `buildSwitcher` / `positionThumb` / `syncSwitcher` in `patterns.js`.
  - On the menu route the switcher is unmounted, so returning to a pattern is a
    fresh mount → no slide. Slide happens only between patterns, which is right.
  - **No library.** GSAP `Flip` solves the rebuild case generically and is the M4
    candidate, but using it here would pre-empt M4 (same reasoning as M1). View
    Transitions would be ~3 lines but snapshots the whole document, cross-fading the
    entire page and fighting M1's "cascade is the transition" decision.
  - `--dur-slide: 240ms`. Transition is gated behind a `.ready` class so the first
    placement lands silently — without the gate the indicator slides in from the
    track's left edge on every arrival.
  - **`width` is animated, against this file's transform/opacity-only discipline.**
    Deliberate and commented: one contentless element, and animating `scaleX`
    instead stretches the 999px radius into ellipses at the pill's ends.
  - **Two bugs found on the way, both worth not rediscovering:**
    1. **`offsetLeft` is relative to the nearest POSITIONED ancestor, and adding
       `.switcher-inner` silently moved that.** It went from `.switcher` (which was
       contributing its own 20px gutter + the track's 4px padding) to
       `.switcher-inner` — a **24px** change in a sum that looked untouched. That
       exposed the *old* scroll-centring as the wrong one: Accordion was sitting at
       insets L101/R142, i.e. **41px off centre**. The maths now measures from
       `getBoundingClientRect()`, which is immune to that whole class of mistake.
       Accordion is now L121/R122; Card Swipe and Portal clamp at end-of-scroll,
       which is correct.
    2. **`offsetWidth`/`offsetLeft` round to whole pixels and the segment boxes are
       fractional** — Portal's real box is 390.078 × 77.422. Rounding left the
       indicator ~0.84px narrow, which at 2× DPR showed as nearly a full device
       pixel of dark edge along the segment. Rects fixed it: measured delta is now
       exactly 0.000/0.000.
  - **A correction to my own verification plan:** it asserted the settled frames
    would be *pixel-identical*, on the logic that the indicator replaces the active
    segment's fill at the same place. That was too strong — a `transform`-positioned
    element composites with subpixel antialiasing and can't byte-match a statically
    laid-out background. The realistic invariant is: diffs confined to the switcher
    region, tiny, and `maxDelta` low enough to be AA rather than misalignment.
    Final state: 8 of 12 frames byte-identical; the other 4 differ by ~340px at
    `maxDelta` ≤ 95 (AA), plus the deliberate centring change on the three phone
    routes that scroll.
  - Verified: 7/7 new indicator tests (geometry matches the segment on all 5 routes
    at both breakpoints; slides with width interpolating 98→80→77; does NOT slide on
    deep link or from the menu; reduced motion jumps with `transitionDuration: 0s`;
    resize realigns) + the existing 7/7 behaviour suite + audit within targets + 0
    console errors.
  - **240ms is unverified on a real phone.** This is the control you touch most, and
    whether the travel feels right is exactly what a screenshot can't show.

- **2026-08-16 (seventh pass) — three content-card styles.** Figma node `199:4522`
  plus per-pattern sketches (Carousel `199:4653`, Tabs `199:5046`, Accordion
  `199:5146`, Card Swipe `199:5357`). The single square-image-plus-three-bars card
  is replaced by **Excerpt / Video / Summary**, much larger, three per question in a
  horizontally scrolling row. **Portal is deliberately untouched.**
  - **The Figma was already using this project's ramp.** Sampled from the render
    rather than assumed: card `#e2e2e2` = `--g-2` exactly, bars/glyph/rule
    `#c4c4c4` = `--g-4` exactly, accordion panel `#f5f5f5` ≈ `--g-1`. So **no new
    greys and no ramp change** — but the ramp is now used **one step deeper than M3
    named it**: `--g-2` went from "placeholder well" to "card surface", `--g-4` from
    "photo-glyph stroke" to "bars". The grey-fill-means-tappable rule survives,
    because a content card is tappable. `--g-3` (the lighter meta bar) is now unused
    outside Portal.
  - **`aspect-ratio: 355 / 473`, not flex stretch.** The plan originally said
    stretch; that was wrong, because the swipe deck's cards are
    `position: absolute; inset: 0` where stretch cannot apply — it would have forced
    two different height mechanisms. Aspect-ratio gives one rule for rows *and* deck,
    reproduces the Figma shape exactly (measured 0.751 everywhere), and makes all
    three kinds the same size whatever their content. `overflow: hidden` is the
    safety net.
  - **Bar weights come from the Figma, not `.ph-bar`** — 25px headline / 16px line,
    versus `.ph-bar`'s 9px, which was sized for a ~170px thumbnail and reads as dust
    in a card this size. `.ph-bar` is untouched because Portal still uses it.
  - **Order is a TABLE, not `Math.random()`.** Lindsey asked for randomised order;
    real randomness would break the convention `BAR_WIDTHS` already documents, make
    every screenshot unstable, and — worse in a comparison harness — leave a reviewer
    flipping between Carousel and Tabs comparing *different content*. `CARD_ORDERS`
    is indexed by question position, so question *n* shows the same three cards in
    the same order in every pattern, and the Accordion's five questions get five
    distinct orders. Verified.
  - **Accordion is now ONE grey block** wrapping header and cards. The grey moved
    from `.acc-header` to `.acc-item`; the gutter moved from `.acc-item` to a new
    `.acc-list` (leaving it on the item would bleed the fill into the gutter);
    `.acc-header` went transparent and gained `:active { background: var(--g-2) }`,
    because with no fill of its own the shared `scale(0.97)` moved only the text —
    the same problem the switcher's segments had. `overflow: hidden` on `.acc-item`
    clips the card row at the panel edge. The resulting ladder — panel `--g-1`, card
    `--g-2`, bars `--g-4` — is three visible steps.
  - **Deck** is full-width and left-aligned at the gutter (was 62%/248px centred),
    and now offsets **right and down** per the sketch. Depth is still offset + scale
    + shadow with `opacity: 1` throughout — do not reintroduce opacity fading, per M3.
  - **Two bugs found on the way, both measured:**
    1. **`scroll-snap` ate the gutter.** The snapport defaults to the *padding box*,
       whose left edge is the border edge, so `scroll-snap-align: start` targeted
       x=0 and mandatory snapping scrolled the row 20px to get there — the first
       card sat flush against the screen edge despite `padding-left: 20px`.
       `scroll-padding-inline: var(--gutter)` fixes it; `.tab-strip` already carried
       that line for the same reason and I'd omitted it.
    2. **`.tab-content` had no padding for the row's bleed to cancel.** It used to
       hold a `.direction`, which brought its own gutter; holding the row directly,
       the negative margin overshot both screen edges — a **430px-wide row with
       343px cards** in a 390px viewport, against 390/308 everywhere else.
  - **Deleted:** `cardsRowHTML`, `barsHTML`, the flat `.card` rules, and
    `.tab-content .q-title { min-height: 2.7em }` (dead with the heading, and the
    25px jump it prevented can't recur now every card is a fixed aspect-ratio).
    `CARD_COUNTS` is now read only by Portal.
  - **Verified:** card fills/bar heights/avatar/rule/glyph positions all match the
    Figma within ~2%; geometry identical across the four patterns (308×410 at 390px,
    ratio 0.751); no horizontal page overflow; **Portal pixel-identical at both
    breakpoints (`maxDelta=0`) — it's the control proving the change didn't leak**;
    deck still drags and cycles; 8/8 behaviour suite (incl. a new "question appears
    once" check) + 7/7 indicator suite; audit clean with radii actually *down* (the
    `--r-md` image well is gone from these cards).
  - **Not yet on a real phone.** Bar weights and card size are the things to judge
    there.
  - **Follow-up the same day — the excerpt card was too heavy** (Lindsey, ref Figma
    `201:5664`). Cause was the stretch: `.card-quote` had `flex: 1` and `.card-body`
    used `justify-content: space-between`, so the eight lines fanned out across every
    available pixel and the block ran from the byline to the bottom padding with no
    air. Now natural height, `justify-content: center` on `.card--excerpt`, and a
    fixed 10px line gap matching the Figma's 26px pitch. Air above and below went
    **20px → 49px**, and the text block is exactly 198px like the Figma.

    **Residual worth knowing:** content is 76% of card height against the Figma's
    68%. That's because the card is 13% shorter than the Figma's 473px while keeping
    its absolute part sizes (25/16px bars, 50px avatar), so the parts are
    proportionally ~15% heavier. If more air is ever wanted, the cheap lever is
    **dropping one excerpt line** (8 → 7), which lands at 70% with 61/62px air —
    essentially the Figma proportion — rather than rescaling every part.

    **Then horizontal, same day.** `.card--excerpt` also got
    `padding-inline: var(--s-7)` — 32px against the other two kinds' 20px. Chosen by
    measurement, not feel: the Figma puts the rule at x=34 and the text block at
    68→316 in a 355 card, i.e. **19.2%–89.0%** of the card width; 32px lands ours at
    **16.9%–89.6%**, where `--s-6` (24px) would only reach 14.3%–92.2%. Horizontal
    only — `justify-content: center` already gives 49px of vertical air, so the block
    padding is not what governs it, and the fixed bar heights mean this couldn't
    disturb the vertical fix (re-measured: content 313, air 49/49, text block 198,
    all unchanged).

    **Deliberately excerpt-only**, so the three cards in a row have different
    internal insets (32 vs 20) while sharing an outer edge. Summary and Video hold a
    glyph and 2–3 bars — they aren't dense, and padding them would shrink their bars
    for nothing. Reopen only if the inset mismatch turns out to read badly on a
    device.

- **Next session** — M1 and M3 are both done and deployed. The open work is
  M2's two deferred responsive bugs, then M4 (framework decision — read M4's
  note about what M1 deliberately left unsolved). **Before treating M1 as
  finished, open the live URL on a real phone.**
