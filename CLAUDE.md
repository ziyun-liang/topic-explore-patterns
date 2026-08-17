# CLAUDE.md — topic-explore-patterns

Working doc for picking this project back up across disconnected sessions.
For what this repo *is* and how to run/edit it, see `README.md` — this file
is current state + conventions + the milestone list, so it doesn't repeat
that.

## Current state

- Shipped and deployed: 5 interaction patterns (Carousel, Tabs, Accordion,
  Card Swipe, Portal) on the mocked theme **A.I. education impact**, with real
  placeholder question copy.
- **Motion baseline done (M1).** Nothing cuts any more: content cascades in on
  mount (two-tier — header, then question-groups), the accordion animates its
  height, and tab content re-enters instead of swapping. All five patterns share
  one primitive and one set of tokens — see M1 for why that's load-bearing.
  Verified pixel-identical to pre-motion in every settled state, so the M3
  visual system is provably untouched.
- **Visual system done (M3).** The governing rule is **grey fill means
  tappable** — content sits on white and is separated by space alone. That's
  what let every hairline border go. Four greys, a four-size type scale
  (30/19/15/12) of which any one screen uses three, one radius family
  (12/20/999), system sans only, no webfont. Shadow-only device frame on desktop
  ≥900px (no bezel). Don't reintroduce `1px solid` anywhere; if something reads
  as mush the fix is more space.
- **Pattern screens share one header.** Back arrow + the label **"Ways in"**,
  then the theme name as the title — identical on all five, because the pattern
  you're in is identified by the switcher, not the header. No eyebrow tag. The
  label matches the menu's own H1 *verbatim* on purpose; if you rename one,
  rename both (see the session log for why).
- **The switcher is a segmented toggle, not pills.** Grey track, white thumb that
  *slides* between segments (240ms, `--ease-out`) — deliberately unlike the Tabs
  pills so the two aren't confused. The switcher DOM persists across route
  changes; only the `.device` subtree is replaced. See M1 and the session log for
  the two traps here (`app.innerHTML = ''`, and `offsetLeft` rounding).
- **Content cards come in three styles** — summary, video, excerpt — one 88%-wide
  card per view in a horizontally snap-scrolling row, on patterns 1–4. Order
  varies per question from a fixed `CARD_ORDERS` table (not `Math.random()`, so
  screenshots stay comparable). Master Portal renders none of these — just a
  two-square thumbnail affordance (see below); `portal-scroll/`'s fork still
  crops real cards into its depth stack.
- **Portal rebuilt again 2026-08-16, later the same day** — the scroll-driven
  focus-resize mechanism (described in full under `portal-scroll/` below) was
  extracted out to preserve it, and master's `#/portal` was replaced with a
  much simpler **fully static list** (Figma 206:9177). Lindsey's call: the
  scroll-driven version was hard to land and worth continuing separately,
  but the master 5-pattern comparison file needed an easy, working entry
  point now, with the tap→expand vertical feed (Figma 199:4068) explicitly
  left for "later stage" once a card is tapped.
  Each row (`.portal-group`) is a fixed 144px grey box: the question on the
  left using the exact SHARED `.q-title` rule every other pattern uses (19px
  /500/-0.01em) — **not** a Portal-specific size, confirmed by direct
  comparison against Carousel's own `.q-title` computed style after an
  earlier draft mistakenly shipped a smaller custom class — and a
  `.portal-thumb` affordance on the right: two same-size 80×80 squares
  hinting at a card stack behind the question, deliberately NOT a
  miniaturized real content card (that was tried in the scroll-driven
  version and read as a strange shrunken artefact, see below). The back
  square is the front's own colour one step down the grey ramp (`--g-4` vs
  `--g-2`) and rotated **7deg clockwise** — worth remembering if this ever
  needs re-measuring from Figma: the node reported an axis-aligned bounding
  box of "89.0038 × 89.0038," which looks like a bigger square but isn't —
  it's the rotated bbox of an 80×80 square (`80×(cos7°+sin7°) ≈ 89.15`),
  confirmed independently by least-squares fitting the *middle* of two
  rendered edges (not corner-to-corner, which the rounded corners bias
  toward a falsely steep ~11°). `.portal-thumb`'s 110×100 container is sized
  to the tight union of both squares' actual bounds, not a round number —
  see the comment above `.portal-thumb` in `styles.css` if this needs
  touching again.
  Outer gutter matches the shared `--gutter` token via `margin-inline` on
  `.portal-group` — this exact bug (rows going full-bleed, touching the
  viewport edges with zero left/right padding) has now shipped and been
  caught by eye TWICE across the two Portal builds; check for it explicitly
  any time `.portal-group`'s box model changes.
  Portal still has **5 questions** (unchanged from the scroll-driven build —
  reuses Accordion's exact 5th question, see `content.js`'s header comment).
  **Tap does nothing yet on any row** — deliberately deferred, same as
  before.
- **The card rows have velocity lag.** Each card trails the one before it by
  ~17ms of travel, so a swipe stretches the row and closes it again instead of
  moving as one plane. The constant is *derived* from
  `reference/Animation/HorizontalSwipe.mp4`, not tuned by feel — measurements and
  the reasoning are in M4's findings and the session log. Native scroll is
  retained; no library.
- Live at `https://ziyun-liang.github.io/topic-explore-patterns/`, current as of
  commit `704599c` (2026-08-16, the static Portal). Verified against the
  **deployed** URL, not just localhost: Playwright at 390×844 and 1440×900,
  all five routes, zero console errors, Portal's five rows each showing the
  rotated two-square thumbnail and the shared 19px `.q-title`. The fork is
  deployed too and works — `/portal-scroll/` serves 5 rows, 15 real stack
  cards and its spacer, zero console errors.
- **Outstanding: never checked on a real phone.** Everything feel-dependent is
  unverified — press feedback, switcher scroll momentum, the M1 cascade rhythm
  and accordion height, the 240ms thumb slide, the new card size and bar weights,
  and above all the 17ms lag (it's subtle by design, and main-thread transforms
  during iOS momentum scrolling are the one thing that could jank). Do this
  before treating any of it as done.
- Zero build step, zero dependencies. Plain `index.html` / `styles.css` /
  `content.js` / `patterns.js`. Hash routing (`#/carousel` etc.), pinned
  bottom switcher.
- **`portal-scroll/` is a deliberate FORK, not a duplicate — don't "clean it
  up" by merging it back.** Created 2026-08-16 to preserve the scroll-driven
  Portal (vertical list, one question focused at a time, size driven
  continuously by scroll with a plateau rest zone) so it can keep being
  refined *outside* the master 5-pattern comparison file. Lindsey's call: the
  scroll-driven version is hard to land, so the master `index.html` moves to a
  simpler Portal entry point (Figma 206:9177) while the harder version lives
  on here.
  The four files were copied **byte-identical** first, then only three things
  were changed in the fork (all in `render`/`renderPatternView`): always
  render Portal regardless of hash, drop the back-link, don't call
  `syncSwitcher`. **Refining Portal in that folder must never require editing
  the master copy** — that separation is the entire point. Reachable at
  `/portal-scroll/` (its own `index.html`); the other four renderers and the
  switcher code are left inert in the fork on purpose, to keep the fork
  readable as a variant of the same file rather than a rewrite.

  **Don't expect `diff patterns.js portal-scroll/patterns.js` to be small any
  more.** It was three hunks at the moment of forking, but master was then
  rebuilt to the static Portal in the same session, so the two files now
  differ by ~430 lines (styles.css ~351; content.js is still identical). The
  fork is the OLDER, richer Portal and master is the newer, simpler one — so
  read that diff as "two different Portals," not as "the fork's local
  changes." If you need the fork's own history, the three render changes above
  are the only edits ever made to it by hand.

  **What's preserved here, condensed** (full derivations were in this file's
  history before the extraction, if any of this ever needs re-deriving from
  scratch):
  - One question "focused" at a time (depth-stacked preview of its 3 real
    content cards), everyone else a plain collapsed row; which one is
    focused tracks scroll position CONTINUOUSLY via the same scroll+rAF
    idiom as the card-row velocity lag. Height only changes, width is fixed
    — a deliberate departure from `PortalSwiping.mp4`, which scales both.
  - The card stack is centered (not corner-diagonal) and the front card is a
    REAL full-size card (~86% of row width, matching `--g-2` exactly) that
    gets CROPPED by the row's own height, not scaled down — growing the row
    reveals more of the SAME card, it does not shrink a miniature.
    Expanded row height is **292px**, arrived at via two additive
    corrections (avatar clearance, then title top padding) — re-derive from
    those two corrections, not from a fresh guess, if it drifts again.
  - Question text is centered both axes, which needed `--focus`-blending
    `.portal-stack`'s height AND `.q-title`'s margin-bottom to 0 at
    `--focus:0` — anything with a fixed height/margin that doesn't blend
    with `--focus` becomes an invisible source of centering drift as the
    row resizes.
  - The scroll→size mapping has a **plateau** (flat rest zone) so cards
    visibly "lock in place" instead of resizing on every pixel of scroll:
    `t = |row.top - focusLine| / PORTAL_FALLOFF; focus =
    clamp01((1-t)/(1-plateau))`. **Plateau = 0.55**, chosen by Lindsey from
    a 4-way live comparison (each card holds fully open for ~80–90px of
    scroll at this value; 0.75 held longer but caused a 0→1 jump within
    10px). Known accepted side effect: a ~15px scroll window where combined
    stack opacity dips to ~0.32 mid-handoff — measured, shown to Lindsey,
    left as-is.
  - `.portal-scroll-spacer` (500px, after the last row) deliberately
    reserves extra scroll room — the natural document only gave ~65–110px,
    nowhere near enough to sweep focus across all 5 questions. Don't "fix"
    insufficient scroll room by retuning `PORTAL_FALLOFF` or row heights
    instead.
  - Two real bugs, both latent in the mechanism itself: (1) the focus line's
    capture assumed scroll was at the top, corrupting it on remount at any
    other scroll position — fixed by folding in `portalScrollTop()`; (2) the
    last card closed again once scrolled past it — fixed by clamping
    `t = 0` for the last row once `r.top <= focusY`.
  - Never verified on a real phone.

  **KNOWN BUG, measured and NOT yet fixed — the 500px spacer only works at
  844px viewport height.** Found 2026-08-16 by an adversarial review of the
  plateau work, then re-measured independently before recording it here (the
  review's two agents disagreed about which devices were affected, and the
  more pessimistic one was right). The last row's hold-open clamp is gated on
  `r.top <= focusY`, which is only reachable if max scroll can carry that row
  up to the focus line. On the **phone branch** (viewport < 900px wide, where
  the window itself scrolls) `maxScroll = documentHeight - viewportHeight`, so
  every extra CSS pixel of viewport height eats a pixel of scroll range — and
  `.portal-scroll-spacer` is a flat 500px chosen at 390×844. Above roughly
  948px of viewport height the reachable bottom lands mid-ramp, `--focus`
  pins at 0 and the last question can NEVER open. The **desktop branch** is
  immune, because `.device { height: min(844px, 100vh - 150px) }` caps the
  scrollport — so extra viewport height can't eat scroll range there.
  Measured peak `--focus` per row over a full real-wheel scroll:

  | viewport | branch | per-row peak focus | verdict |
  |---|---|---|---|
  | 390×844 (primary target) | phone | 1 · 1 · 1 · 1 · 1 | ok |
  | 440×944 | phone | 1 · 1 · 1 · 1 · **0.18** | seam |
  | 440×956 (iPhone 16 Pro Max) | phone | 1 · 1 · 1 · 1 · **0** | broken |
  | 390×1000 | phone | 1 · 1 · 1 · 1 · **0** | broken |
  | 768×1024 (iPad mini) | phone | 1 · 1 · 1 · **0.84** · **0** | broken |
  | 810×1080 (iPad 10.2) | phone | 1 · 1 · 1 · **0.01** · **0** | broken |
  | 899×1400 | phone | 1 · **0** · **0** · **0** · **0** | broken |
  | 900×1100 (one px wider) | desktop | 1 · 1 · 1 · 1 · 1 | ok |

  That 899 vs 900 pair is the proof: same content, one pixel of width, and
  crossing into the framed desktop branch fixes it outright.
  **The fix is a taller spacer — `1200px` was measured to make every row
  reach 1.000 across all eight viewports above, including 899×1400.** 900px
  fixes everything except 899×1400. Deliberately left UNAPPLIED so the push
  stays scoped to the day's design work; it's a one-value change to
  `.portal-scroll-spacer` in `portal-scroll/styles.css` whenever this fork is
  picked back up. Do NOT instead retune `PORTAL_FALLOFF`, the plateau, or row
  heights — the behaviour is monotonic in spacer height and nothing else here
  is wrong.
  The review also raised a second "major" finding — scroll juddering
  backwards near the bottom — but verification established it's the SAME
  root cause, not an independent bug: backward scroll frames occur if and
  only if the reachable bottom lands mid-ramp, i.e. exactly when the last
  row fails to reach 1. It was scrollTop re-clamping, not Chrome scroll
  anchoring (disabling `overflow-anchor` changed nothing). Fixing the spacer
  fixes both. 7 of the review's 9 findings were refuted on verification.
- `content.js` is the one hand-edited data file — question copy per pattern, and
  the theme name. Question *counts* per pattern are fixed to match the source
  Figma sketch, with one deliberate exception: Carousel 3, Tabs 4, Accordion 5,
  Swipe 3, **Portal 5** (reuses Accordion's 5th question — see `content.js`'s
  header comment). `patterns.js` no longer has a `CARD_COUNTS` constant —
  removed along with the rest of the scroll-driven Portal renderer when master
  moved to the static list above. Patterns 1–4 each render **three** cards per
  question (one of each content kind, one visible at a time in the
  snap-scrolling row), so their count is implied by `CARD_ORDERS` rather than
  declared anywhere; master Portal renders none at all (just the two-square
  thumbnail affordance).
- **One cleanup owed, deliberately deferred: a dead `ph-*` card-skeleton
  cluster.** Surfaced 2026-08-16 by a pre-push review and confirmed by
  measurement, not by reading: `.ph-card`, `.ph-card .ph-img` and the
  `.ph-bar*` rules in `styles.css`, plus `phCardInnerHTML` and `imgWellHTML`
  in `patterns.js`, are now ALL dead in master. The chain: `imgWellHTML` is
  called only by `phCardInnerHTML`, which was called only by the old
  scroll-snap Portal strip, which today's static rebuild removed. Verified by
  counting elements in the live DOM on all five routes — `.ph-card`,
  `.ph-bar` and `.ph-img` are each **0 on every route**, so nothing renders
  from any of it. (`BAR_WIDTHS` is NOT dead — `cardHTML` still reads it. The
  swipe deck is NOT affected — it has its own `.deck-card`.)
  Left in place on purpose rather than swept into the same push as the design
  work: it changes zero rendered pixels, so deleting it at wrap time would
  have been a nonzero-risk change for no visible benefit. Remove it as ONE
  commit with a re-render check across all five routes afterwards, not
  piecemeal — the CSS and the two JS functions are only safe to delete
  together. The `.ph-card` rule carries a matching comment marking it
  orphaned so nobody reads it as live in the meantime.
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
- **The single highest-value check in this repo: settled frames must be
  pixel-identical.** Screenshot all 12 states (5 patterns + menu, × 390×844 and
  1440×900) before and after, and pixel-diff them — `maxDelta` must be **0** for
  anything you didn't intend to move. It has caught three real bugs that looked
  fine by eye: a 28px accordion ghost, a layer-promotion AA shift, and proof the
  velocity lag leaks nothing at rest. It also works in reverse — leave one pattern
  untouched as a **control** (Portal, for the card change) and a `maxDelta = 0`
  there proves the change didn't leak. Non-zero is a *result*, not a failure:
  `maxDelta = 30` was exactly the card-fill-vs-bar-fill delta that proved the
  excerpt change moved only bars.
- **Verification scripts live in `/private/tmp`, never in the repo.** This repo is
  public and ships as GitHub Pages; test harnesses aren't part of the artifact.
  Rebuild them per session (they're short) rather than committing them. The
  Playwright ones from 2026-08-16 — `tep-check` (audit + screenshots),
  `tep-pixdiff`, `tep-geom`, `tep-behavior` (8 checks), `tep-thumb` (7),
  `tep-lag2`/`tep-lag3` — are described in the session log if you need to
  reconstruct one.
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

  **Measure them, don't eyeball them.** `/video-to-anim` + `ffmpeg` frame
  extraction, then track actual geometry: frame-differencing to find the motion
  window, hue-segmentation to isolate a moving element's bounding box, full-height
  gutter detection for spacing between elements. That's how
  `HorizontalSwipe.mp4` yielded a *derived* constant (17ms/card) instead of a
  tuned-by-feel one, and how it disproved the "spring/elastic" reading of its own
  motion. Extract frames to `/tmp`, not the repo.
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

- [~] **M4 — Motion research → framework decision.** Lindsey drops
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

  **Progress 2026-08-16 — one of five videos watched (`HorizontalSwipe.mp4`), and
  it settled three things.** Don't re-litigate these; do re-test them if the
  remaining videos ask for something different:
  1. **CSS scroll-driven animations are ruled out for velocity effects.**
     `animation-timeline` is *position*-driven; velocity lag is *velocity*-driven.
     This is a capability limit, not a preference — the reason the card-row lag is
     a rAF loop.
  2. **GSAP earns nothing while native scroll is retained.** A
     velocity-proportional per-card offset is ~25 lines. GSAP's actual leverage is
     `Draggable`/`Inertia` *owning the gesture*, and Lindsey chose to keep native
     scroll — so that value stays unspent rather than disproven. It comes back on
     the table the moment we take over the gesture (M5's card→full-screen is the
     likely trigger, where `Flip` is also still unexamined).
  3. **Licensing is no longer a factor either way** — GSAP is now 100% free,
     Inertia included (verified 2026-08-16).

  Also worth carrying forward: a **low-pass velocity filter cannot overshoot**,
  which is why it beat a spring for this case — the reference settles
  monotonically, so a spring would have needed deliberate critical damping to
  suppress a bounce that isn't in the source material. If a later video *does*
  show real overshoot, that's the moment a spring integrator earns its place.

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
- **Portal tap-to-expand-into-feed.** Deferred on purpose, explicitly
  described by Lindsey as "later stage" work (see Current State) — tapping
  a row's thumbnail should expand into a full vertical feed of real-size
  content cards (Figma 199:4068), matching what patterns 1–4 currently just
  scroll to inline. Needs its own design pass: a Flip-style card→full-screen
  transition (GSAP's `Flip` is the standing candidate per M4, still
  unexamined), and — now that master Portal is a static list rather than one
  focused row — a decision on whether every row expands the same way or
  only some do. Don't add tap behavior to Portal piecemeal without this —
  the two pieces need to feel like one gesture. Applies to master's static
  list; `portal-scroll/`'s fork has its own separate version of this same
  deferred item, scoped to its focused-row mechanism instead.
- ~~**Portal's scroll headroom is thin at real phone height.**~~ Resolved,
  but only inside `portal-scroll/` — master's static-list Portal has no
  scroll mechanism at all, so this no longer applies there. The fork's fix
  ended up being BOTH of the two options this note originally proposed, not
  either/or: a 5th question was added (content.js's documented exception to
  the per-pattern count convention) AND a deliberate `.portal-scroll-spacer`
  was added after it — the extra question alone still wasn't enough scroll
  distance to reach every card's focus peak. See `portal-scroll/`'s bullet
  in Current State for the measured numbers.

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
  - **All five screens show the same title** (from `CONTENT.topic` — reworded to
    `A.I. education impact` later the same day) and the pattern's own name is
    gone from inside the frame.
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
    in a card this size. `.ph-bar` was left untouched at the time because Portal
    still emitted it. (No longer true as of the 2026-08-16 static Portal rebuild —
    the whole `.ph-*` family is now orphaned; see the cleanup note in Current
    state. Doesn't change this decision, which was about bar weight.)
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

- **2026-08-16 (eighth pass) — velocity lag on the card rows.** Lindsey: swiping the
  content-card rows felt like "the same group, move all together," wanted physics —
  spring/elastic. Studied `reference/Animation/HorizontalSwipe.mp4` by extracting
  frames and tracking geometry rather than eyeballing it (per `/video-to-anim`).
  - **The reference has no bounce.** Segmenting the blue card by hue: its height was
    exactly 614px in *every* frame — horizontal-only, no scale/rotate/vertical
    offset. The gap between adjacent cards stretched 521px (rest) → 551px (peak,
    +5.8%) and, confirmed at native 60fps, closed back to 521 **monotonically** —
    551→542→536→533→530→526→523→521, stop. Never dipped below and returned. So
    "spring/elastic" was the wrong description of what's actually in the video;
    built a **velocity low-pass filter** instead — it can't overshoot, and its
    steady-state output is proportional to input velocity, which is exactly what
    was measured. A spring would need deliberate critical damping to suppress a
    bounce that isn't there.
  - **`LAG_PER_CARD = 0.017` is derived, not tuned.** Video card pitch 521px in an
    800px render → scale factor 0.614 against our 320px pitch (308 card + 12
    gutter). Peak velocity 1762 px/s → 1082 px/s ours; peak lag 30px → 18.4px ours.
    Since the effect is velocity-proportional, the constant has to be a **time**:
    18.4 / 1082 = 0.017s — each card trails the one ahead of it by ~17ms of travel.
  - **Native scroll stays native**, per Lindsey's call. Momentum, scroll-snap,
    keyboard, trackpad, scrollbar semantics — none of it was touched. The
    reference's own pacing (accelerates *then* decelerates over ~900ms) can't be
    reproduced by a finger-flick anyway, since a release only decelerates; that
    clip is a programmatic/auto-advance transition. Judged good enough on the
    phone rather than rebuilding momentum from scratch to chase it.
  - **A real M4 data point:** CSS scroll-driven animations (`animation-timeline`)
    could not have done any of this — that API is *position*-driven and this
    effect is *velocity*-driven. Ruled out on evidence, not taste. GSAP earned
    nothing here either: the effect is a ~30-line rAF loop, and its actual value
    (`Draggable`/`Inertia`) would only matter if the gesture itself were taken
    over, which it wasn't. (GSAP is now 100% free including Inertia — not a factor
    either way, but worth recording since M4 hasn't happened yet.)
  - **Implementation:** one document-level `scroll` listener in the **capture**
    phase — `scroll` doesn't bubble but does fire during capture, so one listener
    covers every `.cards-row` including ones a later render creates (e.g.
    `renderTabs` rebuilding `.tab-content`), with nothing to attach or clean up
    per row. A single rAF loop runs only while some row is moving and stops
    itself once every tracked row settles, clearing transforms so nothing is left
    pinned. Scoped to `.cards-row > .card`, which excludes the swipe deck (its
    own transforms) and Portal's strip entirely.
  - **The index flips with scroll direction**, and that's deliberate: with a fixed
    index, one direction spreads the cards (correct) and the other compresses
    them (an 18px lag against a 12px gutter would overlap). Indexing from
    whichever card leads makes it spread both ways. The flip is a discontinuity
    in the index, but it's multiplied by velocity, and reversing direction means
    passing through velocity ≈ 0 first — so the jump lands exactly where the
    multiplier is nil.
  - **A real bug found and fixed during verification, via a proper raw-vs-filtered
    comparison rather than guessing:** the naive `instVel = dx/dt` with a *fixed*
    per-frame smoothing coefficient implicitly assumes ~60fps. On a frame with an
    unusually small `dt`, the same `dx` reads as a much larger velocity with
    nothing to compensate — surfaced as a ~2-11px wiggle in the lag output with no
    matching event in the raw `scrollLeft` trace. Fixed with the standard
    correction: floor `dt` at 1/240s, and derive the smoothing coefficient FROM
    `dt` each frame (`alpha = 1 - e^(-dt/τ)`, `τ = 0.1026s`) instead of using a
    constant — chosen so `alpha` equals the original `0.15` exactly at 60fps,
    preserving the tuned responsiveness while fixing the frame-rate sensitivity.
    Cut the unexplained wiggle from 8–11px to under 2px.
  - **A second, separate wiggle is real and left in, on purpose.** Driving the row
    with a synthetic multi-step wheel gesture and watching raw `scrollLeft`
    directly showed **Chromium's own momentum+snap settle can overshoot its snap
    point and correct** (measured: 491→300→320, reversing direction on its own).
    The filter faithfully reflects that, because that's the design — suppressing
    it would mean the filter stops tracking real velocity. Verified this doesn't
    generalise into self-inflicted ringing: same test shows the filter produces at
    most 1-2 extra direction changes beyond what the raw scroll itself has, and
    the largest is ~2px against an 18–40px primary effect.
  - **Verified:** all 12 settled frames pixel-identical (`maxDelta = 0` — lag is
    zero at rest, so this is the strongest available proof nothing leaked); gap
    stretch/return reproduced under a real wheel gesture (not direct `scrollLeft`
    assignment — see the note below); no self-generated ringing; transforms clear
    to `none` on settle and the rAF loop actually stops; deck and Portal never
    receive a transform from this code; reduced motion applies zero transforms; a
    row created after a tab switch still lags (proving the capture-phase listener
    covers it); 8/8 behaviour suite, 7/7 indicator suite, audit unchanged, 0
    console errors.
  - **Testing note worth keeping:** driving `.cards-row` via direct `scrollLeft`
    assignment is **invalid** for verification here — `scroll-snap-type: x
    mandatory` clamps every direct assignment to the nearest snap point
    *instantly* (confirmed: setting 50 snaps to 0, setting 300 snaps to 320, on
    both Carousel and Tabs identically). A frame-by-frame ramp produces one
    discrete jump, not a continuous scroll. Use `page.mouse.wheel()` — a real
    gesture isn't re-snapped mid-flight, only once it settles.
  - **Not yet on a real phone, and it matters more than usual here.** 17ms of lag
    is subtle by design, and main-thread transforms during iOS momentum scrolling
    are the one thing that could jank. If it does, that's the finding — and the
    argument for taking over the gesture after all (which is where `Draggable`/
    `Inertia` would finally earn their place).

- **2026-08-16 (ninth pass, next session) — Portal built twice, then split
  into two files.** Started from Figma 199:5483/201:6178 plus reference video
  `PortalSwiping.mp4`: rebuilt Portal from its original horizontal
  scroll-snap strip into a vertical list with a scroll-driven focus resize
  (one question focused with a 3-card depth stack, others collapsed,
  continuous with real page scroll — Lindsey's explicit call over
  scroll-jacking). That build went through several rounds of visual
  correction against closer Figma frames (201:6336, 201:6340, 204:7942), then
  a "tik tik tik" pause request that led to a plateau/rest-zone mapping
  (0.55, chosen from a live 4-way comparison), then a scroll-room spacer so
  all 5 questions were reachable on a real phone. Once that was working,
  Lindsey decided the scroll-driven mechanism was hard to land for the
  master comparison file and asked to **extract it before changing anything
  else** — copied byte-identical to `portal-scroll/` first, verified, only
  then was master's `#/portal` replaced with a much simpler fully static
  list (Figma 206:9177). Two corrections followed against a screenshot
  Lindsey attached: the static list's question text had drifted to its own
  smaller custom class instead of the shared `.q-title` (fixed, confirmed
  matching Carousel's computed style exactly), and the thumbnail's back
  square was drawn as a plain larger upright square instead of a same-size
  square rotated ~7° (fixed, confirmed against least-squares-fit Figma edge
  angles). Full detail on both builds lives in Current State above — the
  static list under "Portal rebuilt again," the scroll-driven mechanism
  under `portal-scroll/`. **None of it has been felt on a real phone.**

  Read first if a fix touches these, because each hides a trap that already cost
  time once: the switcher (persistent DOM — never reintroduce
  `app.innerHTML = ''`; use `getBoundingClientRect()`, not `offsetLeft`, for the
  thumb); the accordion (padding on a collapsing grid item can't collapse);
  `.cards-row` (`scroll-padding-inline` is what makes the gutter survive
  scroll-snap; direct `scrollLeft` is invalid for testing it); any cascade
  work (`animation-fill-mode: both` pins state, so the class must be stripped
  on `animationend`); and Portal specifically (outer-gutter loss on
  `.portal-group` box-model changes — shipped twice already; anything with a
  fixed height/margin inside a row whose height moves must blend with
  `--focus` in the fork, or with nothing at all now that master is static).

  Then the standing queue: M2's two deferred responsive bugs → M4 (four
  reference videos still unwatched; three findings already settled, don't
  re-litigate them) → M5. The backlog items and everything feel-dependent
  above still explicitly want a phone session before they're decided.

- **NEXT SESSION IS DECIDED: Portal's immersive tap animation.** Lindsey
  closed 2026-08-16 with "tomorrow, I will start building Portal immersive
  animation, when click on the card" — so **start there**, not on the
  standing queue above and not on `portal-scroll/`.

  What that means concretely, and the context that's already settled so it
  doesn't get re-litigated:
  - **Target is MASTER's static Portal**, the 5-row list at `#/portal` —
    not the `portal-scroll/` fork. The whole reason master moved to a static
    list was to make this the interesting part: an easy entry point, with the
    real work in what happens on tap. The fork's known spacer bug above is
    NOT on the path for this and shouldn't block it.
  - **The destination is Figma 199:4068** — tapping a row expands into a full
    vertical feed of real-size content cards, i.e. the same content patterns
    1–4 reach by scrolling inline. Read that frame before designing anything.
  - **Nothing is wired yet.** Every row is inert by design: no click handler,
    no `role`, no `tabindex`, no `:active` state, no cursor change. The
    `.portal-thumb` pair is `aria-hidden` decorative, and the question text is
    the row's accessible name — so when the row becomes interactive, the
    tappable element needs a real accessible name and keyboard activation, not
    just a click listener on a `<div>`.
  - **GSAP's `Flip` is the standing candidate** for the card→full-screen
    transition (recorded under M4, still unexamined). It is NOT a decision —
    this file's discipline is that a library has to earn its place against a
    hand-rolled version, and two effects so far (the velocity lag, the
    switcher slide) were both judged not to need one. View Transitions were
    already ruled out for the switcher because they snapshot the whole
    document, which fights M1's "the cascade IS the transition" decision;
    worth re-checking whether that objection still applies to a single-element
    expand, since it might not.
  - **Open question to settle with Lindsey first, not to assume:** does the
    expanded feed replace the row in place (list stays, one row grows), or
    does it take over the screen as a new view (needs a way back, and a
    decision about whether the switcher stays visible)? Those lead to very
    different transitions. Ask before building.
  - Zero build step, zero dependencies is still the constraint — if `Flip`
    wins, that's a real trade-off to raise explicitly, not to slip in.
