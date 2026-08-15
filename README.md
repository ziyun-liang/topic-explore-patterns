# Topic exploration — interaction patterns

Low-fi, phone-testable prototype of five ways to present "directions into a
topic" for the Understand Intent program. Grey boxes, real question copy.
Origin: Figma sketch `qMKFOJCaalehqHh2j8CUCF`, node `196:13252` ("UX low-fi"
section) — Carousel, Tabs, Accordion, Card Swipe, Portal.

No build step, no framework, no dependencies. Open `index.html` directly or
serve the folder with any static server.

## Structure

| File | What |
|---|---|
| `index.html` | shell, loads `content.js` then `patterns.js` |
| `content.js` | **edit this** — topic name + per-pattern question copy |
| `styles.css` | shared tokens/layout + per-pattern styles |
| `patterns.js` | hash router, menu, switcher, the 5 renderers |

## Editing content

Everything visible-as-text lives in `content.js`. Card art stays grey by
design (this phase isn't testing content, it's testing navigation shape) —
only question copy is real, because question length/wording is exactly what
each pattern's tabs/rows/labels need to be stress-tested against.

Counts per pattern are fixed to match the Figma sketch (Carousel 3, Tabs 4,
Accordion 5, Card Swipe 3, Portal 4) and are wired as plain arrays, so
changing a count is editing `content.js`'s array length for that pattern —
`patterns.js` doesn't hardcode counts of directions anywhere, only cards-per-
direction (`CARD_COUNTS` at the top of the file), which come from the Figma
metadata rather than the text content.

## Navigation

Hash-based: `#/`, `#/carousel`, `#/tabs`, `#/accordion`, `#/swipe`,
`#/portal`. The menu (`#/`) lists all five; inside any pattern, a pinned
bottom switcher flips between them without leaving the page. Every pattern
has a real, shareable, reload-safe URL.

## Running locally

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Fonts (deliberately not shipped here)

This build uses the system font stack (`-apple-system`, Georgia for
question text) — no NYT `.otf` files ship in this public repo. The existing
Topic Intent exploration
(`user-intents-design/topic-intent/explorations/understand-and-latest-news-on-one-page.html`)
already has the real `@font-face` block solved (`NYTCheltenham` /
`NYTFranklin` / `NYTImperial`); porting it in is the first step of the
hi-fi upgrade below.

## Path to hi-fi / folding into napp-100

This repo is the source of truth while iterating on phone. When it's ready
to graduate:

1. Copy this folder's files into
   `napp-100/prototypes/react/understand-intents/static/topic-patterns/`
   (name TBD).
2. Add one entry to that prototype's `App.tsx` `SUB_PROTOTYPES` array:
   `{ id: 'topic-patterns', name: '…', entryPoint: 'index.html' }` — it
   already hosts one prior static-HTML exploration exactly this way.
3. Swap the font stack for the real `@font-face` block (above).
4. Swap `content.js`'s placeholder questions + grey cards for real fetched
   data, following the draft → tweak → lock workflow already defined in
   `user-intents-design/topic-intent/docs/05-prototype-spec.md` §8 (samizdat
   fetch script → hand-picked clusters → locked JSON).

Only relative paths are used throughout, so no path rewrites are needed at
fold-in time.
