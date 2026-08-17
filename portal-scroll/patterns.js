// portal-scroll/patterns.js
//
// ============================================================================
// STANDALONE PORTAL — a deliberate FORK, frozen 2026-08-16.
//
// WHY THIS DIRECTORY EXISTS: the scroll-driven Portal built on 2026-08-16
// (vertical list, one question focused at a time showing a stack of 3 content
// cards, size driven continuously by scroll position with a flat "plateau"
// rest zone) is being kept for continued refinement OUT of the master
// 5-pattern comparison file. The master `/index.html` is moving to a simpler
// Portal entry point (Figma 206:9177) because the scroll-driven version is
// hard to land; this fork preserves the harder version so that work isn't
// lost and can be iterated independently.
//
// HOW IT RELATES TO THE MASTER COPY: `../patterns.js`, `../styles.css`,
// `../content.js` and `../index.html` were copied here BYTE-IDENTICAL first,
// then only the minimum was changed to make this Portal-only. So
// `diff ../patterns.js patterns.js` shows exactly what diverged, and will
// keep showing that as Portal is refined here. Refining Portal in this
// directory must NEVER require editing the master copy — that separation is
// the whole point.
//
// WHAT WAS CHANGED FROM THE MASTER COPY (all in render/renderPatternView):
//   · render() ignores the hash and always renders Portal — no menu, no routing
//   · the back-link is dropped (it pointed at the 5-pattern menu, which
//     doesn't exist here)
//   · syncSwitcher() is not called (the 5-way switcher is comparison chrome)
// The other four renderers, renderMenu and the switcher implementation are
// left in place but inert, so the diff against master stays small and legible.
//
// The full design history of this Portal — every measured number, the two
// latent bugs found while building the plateau, and which levers do what —
// is in the master ../CLAUDE.md, not duplicated here.
// ============================================================================
//
// Vanilla JS, no build step, no framework — reads window.CONTENT (content.js).

(function () {
	'use strict';

	var CONTENT = window.CONTENT;

	var PATTERNS = [
		{ id: 'carousel', label: 'Carousel' },
		{ id: 'tabs', label: 'Tabs' },
		{ id: 'accordion', label: 'Accordion' },
		{ id: 'swipe', label: 'Card Swipe' },
		{ id: 'portal', label: 'Portal' }
	];

	// Only `portal` reads this now. Patterns 1–4 render one card of each content
	// kind, so their count is inherently 3 and is defined by CARD_ORDERS below.
	// Kept rather than deleted because it's the documented Figma-sourced figure
	// (qMKFOJCaalehqHh2j8CUCF, node 196:13252).
	var CARD_COUNTS = { portal: 3 };

	// The three content-card kinds (Figma node 199:4522) and the order each
	// question presents them in.
	//
	// A TABLE, not Math.random(), for the same reason BAR_WIDTHS is one: rows
	// shouldn't look mechanically cloned down the page, but the layout has to be
	// stable. Real randomness would mean every screenshot differs, and — worse for
	// a comparison harness — a reviewer flipping between Carousel and Tabs would be
	// comparing different content instead of different interactions.
	//
	// Indexed by the question's position, so question n gets the same order in
	// every pattern. Five entries covers the Accordion's five questions without a
	// repeat.
	var CARD_ORDERS = [
		['excerpt', 'video', 'summary'],
		['video', 'summary', 'excerpt'],
		['summary', 'excerpt', 'video'],
		['excerpt', 'summary', 'video'],
		['video', 'excerpt', 'summary']
	];

	function cardOrder(index) {
		return CARD_ORDERS[index % CARD_ORDERS.length];
	}

	function escapeHTML(str) {
		var div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	// ---------- Appear cascade ----------
	//
	// Stamps --i on each element so a single CSS keyframe (.rise-in in
	// styles.css) drives the whole staggered entrance. Deliberately dumb: all
	// the timing lives in tokens, so there is exactly one place to retune it
	// and no pattern can drift from the others.
	//
	// Setting a custom property is a style recalc — fine here, because this runs
	// ONCE per mount. This is not the inheritable-CSS-var perf trap, which is
	// about updating a var on a parent every frame of a drag.
	//
	// Returns the next free index, so callers can cascade two collections in one
	// continuous sequence.
	function cascade(elements, startIndex) {
		var i = startIndex || 0;
		Array.prototype.forEach.call(elements, function (el) {
			if (!el) return;
			el.style.setProperty('--i', i++);
			el.classList.add('rise-in');
			clearOnFinish(el, 'rise-in');
		});
		return i;
	}

	// Strips an entrance class once it has played. Neither reason is cosmetic:
	//
	//  · `animation-fill-mode: both` keeps PINNING opacity and transform to the
	//    keyframe's end values for as long as the class is on the element — where
	//    it silently outranks any later CSS touching either property. A hover
	//    transform added to .swipe-group six months from now would simply not
	//    work, with nothing obvious to point at.
	//  · It also releases the compositor layer the animation created, which
	//    restores normal text rasterisation. (Measured against HEAD: leaving it
	//    on shifted ~0.2% of pixels by at most 16/255 — invisible, but free.)
	//
	// Guarded on e.target because animationend BUBBLES: a descendant animation
	// added later must not strip its ancestor's class mid-flight.
	function clearOnFinish(el, className) {
		el.addEventListener('animationend', function handler(e) {
			if (e.target !== el) return;
			el.classList.remove(className);
			el.style.removeProperty('--i');
			el.removeEventListener('animationend', handler);
		});
	}

	// ---------- Icons ----------
	//
	// Inline SVG rather than text glyphs. The previous '⌄' was a modifier
	// letter, not a chevron — it sat below the baseline and read as a typo, and
	// '→' / '‹' inherited whatever optical weight the system font happened to
	// give. These are stroked, currentColor, and optically consistent.

	var ICON_PATHS = {
		'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
		'chevron-left': '<path d="m15 18-6-6 6-6"/>',
		'chevron-down': '<path d="m6 9 6 6 6-6"/>',
		image: '<rect width="18" height="18" x="3" y="3" rx="2"/>' +
			'<circle cx="9" cy="9" r="2"/>' +
			'<path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
		play: '<path d="M9 5.5v13l10.5-6.5z"/>'
	};

	// `filled` is for the play mark, which is a solid triangle in the Figma rather
	// than an outline. Keeping the stroke on as well as the fill is what rounds its
	// corners, via stroke-linejoin — otherwise the tip is a hard spike.
	function icon(name, size, filled) {
		return (
			'<svg width="' + (size || 16) + '" height="' + (size || 16) + '" ' +
			'viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') + '" ' +
			'stroke="currentColor" ' +
			'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ' +
			'aria-hidden="true">' + ICON_PATHS[name] + '</svg>'
		);
	}

	// Deterministic (not random) so screenshots stay stable between runs, but
	// varied enough that a row or deck doesn't look mechanically cloned.
	var BAR_WIDTHS = [
		['100%', '72%', '38%'],
		['92%', '58%', '44%'],
		['100%', '84%', '34%']
	];

	function imgWellHTML() {
		return '<div class="ph-img">' + icon('image', 28) + '</div>';
	}

	// ---------- Content cards ----------
	//
	// Three kinds from Figma node 199:4522. Same box, different insides:
	//   summary — photo glyph, then headline + 2 lines pinned to the base
	//   video   — play mark, then 2 lines pinned to the base
	//   excerpt — headline, avatar + byline, then a quote rule beside 8 lines
	//
	// `variant` only drives bar-width variation, reusing the existing BAR_WIDTHS
	// table so a row of three doesn't read as cloned.

	function lineHTML(width) {
		return '<div class="card-bar" style="width:' + width + '"></div>';
	}

	function cardHTML(kind, variant) {
		var w = BAR_WIDTHS[variant % BAR_WIDTHS.length];
		var inner;

		if (kind === 'video') {
			inner =
				'<div class="card-glyph">' + icon('play', 96, true) + '</div>' +
				'<div class="card-foot">' + lineHTML(w[0]) + lineHTML(w[1]) + '</div>';
		} else if (kind === 'excerpt') {
			// Eight lines, the last one short so it reads as the end of a paragraph
			// rather than a block that got cut off.
			var lines = '';
			for (var i = 0; i < 8; i++) lines += lineHTML(i === 7 ? w[2] : '100%');
			inner =
				'<div class="card-bar card-bar--head" style="width:' + w[0] + '"></div>' +
				'<div class="card-byline"><div class="card-avatar"></div>' +
				'<div class="card-bar"></div></div>' +
				'<div class="card-quote"><div class="card-rule"></div>' +
				'<div class="card-body">' + lines + '</div></div>';
		} else {
			inner =
				'<div class="card-glyph">' + icon('image', 96) + '</div>' +
				'<div class="card-foot">' +
				'<div class="card-bar card-bar--head" style="width:' + w[1] + '"></div>' +
				lineHTML(w[0]) + lineHTML('100%') +
				'</div>';
		}

		return '<div class="card card--' + kind + '">' + inner + '</div>';
	}

	// One row per question, carrying all three kinds in this question's order.
	function cardRowHTML(index) {
		var cards = cardOrder(index).map(function (kind, i) {
			return cardHTML(kind, index + i);
		}).join('');
		return '<div class="cards-row">' + cards + '</div>';
	}

	// Filled card skeleton — swipe deck / portal strip, where a card reads as a
	// physical object rather than a thumbnail. Two bars instead of three: these
	// cards are taller and narrower, and a third bar crowds them.
	function phCardInnerHTML(variant) {
		var w = BAR_WIDTHS[variant % BAR_WIDTHS.length];
		return (
			imgWellHTML() +
			'<div class="ph-bar" style="width:' + w[0] + '"></div>' +
			'<div class="ph-bar ph-bar--meta" style="width:' + w[2] + '"></div>'
		);
	}

	// isCascadeUnit: whether THIS element is the thing that should stagger in.
	// True for the carousel, where each .direction is a top-level group. False
	// for tabs, where the cascading unit is the .tab-content wrapper — marking
	// both would nest one entrance animation inside another.
	// `index` is the question's position, which selects its card order — so the
	// same question shows the same three cards in the same order in every pattern.
	function directionHTML(direction, index, isCascadeUnit) {
		return (
			'<div class="direction' + (isCascadeUnit ? ' cascade-item' : '') + '">' +
			'<p class="q-title">' + escapeHTML(direction.question) + '</p>' +
			cardRowHTML(index) +
			'</div>'
		);
	}

	// ---------- Carousel: every direction open, stacked vertically ----------

	function renderCarousel(main, directions) {
		main.innerHTML = directions
			.map(function (d, i) { return directionHTML(d, i, true); })
			.join('');
	}

	// ---------- Tabs: strip of labels, one active direction shown below ----------

	// The strip and the content are built ONCE and kept alive; only .active and
	// the content's innerHTML change. The old version rebuilt both on every tap,
	// which cost three things:
	//
	//   1. It destroyed the tapped button mid-:active, cutting off the press
	//      feedback the moment the user pressed — the one bit of motion the file
	//      already had.
	//   2. It reset .tab-strip's scrollLeft to 0. The strip is overflow-x:auto
	//      and at 390px the last tab sits off-screen, so tapping it scrolled the
	//      row and the rebuild immediately snapped it back to the start.
	//   3. It made the content swap unanimatable — there was no persistent node
	//      to animate, and the strip flickered along with the content.
	//
	// Keeping the strip also means the active pill's fill transitions for free
	// via the shared pill-row rule's existing background-color transition.
	//
	// Pills carry the question IN FULL (2026-08-16, Lindsey's call). They used to
	// truncate to the first three words, which read as an abbreviation of a
	// question rather than a question, and quietly hid the pattern's real
	// constraint: at 390px a long question makes a pill wider than the strip. The
	// truncation was concealing that, and concealing it is the opposite of what a
	// stress-test prototype is for.
	function renderTabs(main, directions) {
		var active = 0;

		var wrap = document.createElement('div');
		main.appendChild(wrap);

		var strip = document.createElement('div');
		strip.className = 'tab-strip cascade-item';
		strip.innerHTML = directions
			.map(function (d, i) {
				return (
					'<button class="tab' + (i === active ? ' active' : '') +
					'" data-i="' + i + '">' +
					escapeHTML(d.question) +
					'</button>'
				);
			})
			.join('');
		wrap.appendChild(strip);

		var content = document.createElement('div');
		content.className = 'tab-content cascade-item';
		wrap.appendChild(content);

		// .tab-content is the one node that re-animates in place, so its cleanup
		// is registered once here rather than per paint — otherwise every tab tap
		// would stack another listener.
		content.addEventListener('animationend', function (e) {
			if (e.target === content) content.classList.remove('swap-in');
		});

		function paintContent(animate) {
			// Cards only, no question heading: the active pill IS the question
			// (Figma 199:5046), so repeating it here said the same thing twice.
			content.innerHTML = cardRowHTML(active);
			if (!animate) return;
			// Restarting a keyframe on a node that PERSISTS needs the class
			// removed, a reflow forced to register the removal, then re-added —
			// otherwise both mutations coalesce into one frame and nothing
			// replays. Same remove→reflow→re-add pattern the sibling
			// understand-and-latest-news prototype uses for its flash ring.
			//
			// rise-in comes off too: tapping a tab DURING the mount cascade would
			// otherwise leave two entrance animations fighting over opacity and
			// transform on the same element.
			content.classList.remove('swap-in', 'rise-in');
			void content.offsetWidth;
			content.classList.add('swap-in');
		}

		strip.addEventListener('click', function (e) {
			var btn = e.target.closest('.tab');
			if (!btn) return;
			var i = Number(btn.dataset.i);
			// Re-tapping the open tab shouldn't replay the animation.
			if (i === active) return;
			active = i;
			Array.prototype.forEach.call(strip.querySelectorAll('.tab'), function (b, bi) {
				b.classList.toggle('active', bi === active);
			});
			paintContent(true);
		});

		// First paint rides the mount cascade on .tab-content, so it must not
		// also run the swap animation.
		paintContent(false);
	}

	// ---------- Accordion: one open at a time ----------

	// Every body is ALWAYS in the DOM now, opened and closed purely by class, so
	// CSS can animate the height (see .acc-body-outer in styles.css). The old
	// version rebuilt all five items on every toggle and omitted closed bodies
	// entirely — which left a collapse with no node to animate, and threw away
	// and recreated all five items' placeholder DOM on every single tap.
	//
	// The .acc-body-outer wrapper exists only to carry the animating grid row;
	// .acc-body is the element that gets clipped.
	function renderAccordion(main, directions) {
		var openIndex = 0;

		var wrap = document.createElement('div');
		// .acc-list carries the gutter, because the grey moved onto .acc-item and
		// would otherwise bleed into it (see styles.css).
		wrap.className = 'acc-list';
		main.appendChild(wrap);

		wrap.innerHTML = directions
			.map(function (d, i) {
				var isOpen = i === openIndex;
				return (
					'<div class="acc-item cascade-item' + (isOpen ? ' open' : '') + '">' +
					'<button class="acc-header" data-i="' + i + '"' +
					' aria-expanded="' + isOpen + '">' +
					'<span>' + escapeHTML(d.question) + '</span>' +
					'<span class="chevron">' + icon('chevron-down') + '</span>' +
					'</button>' +
					'<div class="acc-body-outer">' +
					'<div class="acc-body">' + cardRowHTML(i) + '</div>' +
					'</div>' +
					'</div>'
				);
			})
			.join('');

		var items = wrap.querySelectorAll('.acc-item');

		wrap.addEventListener('click', function (e) {
			var btn = e.target.closest('.acc-header');
			if (!btn) return;
			var tapped = Number(btn.dataset.i);
			openIndex = openIndex === tapped ? -1 : tapped;
			// Toggling every item in one pass means the closing panel and the
			// opening one animate simultaneously, which is what reads as a single
			// movement rather than a collapse followed by an expand.
			Array.prototype.forEach.call(items, function (item, i) {
				var isOpen = i === openIndex;
				item.classList.toggle('open', isOpen);
				item.querySelector('.acc-header').setAttribute('aria-expanded', String(isOpen));
			});
		});
	}

	// ---------- Card Swipe: drag-to-cycle deck per direction ----------

	// `kinds` is this question's card order, so the deck cycles through the same
	// three content kinds the other patterns lay out in a row.
	function createDeck(kinds, variant, withHint) {
		var deck = document.createElement('div');
		deck.className = 'deck';

		var count = kinds.length;
		var cards = [];
		kinds.forEach(function (kind, i) {
			var c = document.createElement('div');
			c.className = 'deck-card';
			// A real card, not a separate skeleton: cardHTML returns the outer
			// .card element, so unwrap it into the positioned .deck-card.
			c.innerHTML = cardHTML(kind, variant + i);
			var inner = c.firstChild;
			c.className = 'deck-card ' + inner.className;
			c.innerHTML = inner.innerHTML;
			deck.appendChild(c);
			cards.push(c);
		});

		// Depth comes from offset + scale + the card's own shadow, NOT from
		// fading opacity: the cards share a fill that's barely off white, so
		// fading them made the stack disappear entirely rather than recede.
		//
		// Offsets right AND down (Figma 199:5357). It used to offset straight down,
		// which read as a shorter card rather than a stack. The scale is what insets
		// the top and bottom, so translateY only needs to be small — enough to break
		// the symmetry, not enough to push the back card below the front one.
		function layout() {
			cards.forEach(function (el, idx) {
				el.style.zIndex = String(count - idx);
				el.style.opacity = '1';
				el.style.transform =
					'translate(' + idx * 16 + 'px, ' + idx * 6 + 'px) ' +
					'scale(' + (1 - idx * 0.035) + ')';
			});
		}
		layout();

		var dragEl = null, startX = 0, currentX = 0, dragging = false;
		var THRESHOLD = 60;

		deck.addEventListener('pointerdown', function (e) {
			var card = e.target.closest('.deck-card');
			if (!card || card !== cards[0]) return;
			dragEl = card;
			dragging = true;
			startX = e.clientX;
			currentX = 0;
			dragEl.classList.add('dragging');
			try { dragEl.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
		});

		deck.addEventListener('pointermove', function (e) {
			if (!dragging || !dragEl) return;
			currentX = e.clientX - startX;
			dragEl.style.transform =
				'translateX(' + currentX + 'px) rotate(' + currentX / 18 + 'deg)';
		});

		function endDrag() {
			if (!dragging || !dragEl) return;
			dragging = false;
			var el = dragEl;
			dragEl = null;
			el.classList.remove('dragging');

			if (Math.abs(currentX) > THRESHOLD) {
				var dir = currentX > 0 ? 1 : -1;
				el.style.transform =
					'translateX(' + dir * 480 + 'px) rotate(' + dir * 24 + 'deg)';
				el.style.opacity = '0';
				setTimeout(function () {
					cards.push(cards.shift());
					layout();
				}, 220);
			} else {
				layout();
			}
			currentX = 0;
		}

		deck.addEventListener('pointerup', endDrag);
		deck.addEventListener('pointercancel', endDrag);
		deck.addEventListener('lostpointercapture', endDrag);

		var extras = '';
		if (withHint) extras = '<p class="deck-hint">Drag to cycle</p>';

		return { el: deck, extrasHTML: extras };
	}

	function renderSwipe(main, directions) {
		directions.forEach(function (d, i) {
			var group = document.createElement('div');
			group.className = 'swipe-group cascade-item';
			group.innerHTML = '<p class="q-title">' + escapeHTML(d.question) + '</p>';

			var deck = createDeck(cardOrder(i), i, i === 0);
			group.appendChild(deck.el);
			if (deck.extrasHTML) group.insertAdjacentHTML('beforeend', deck.extrasHTML);

			main.appendChild(group);
		});
	}

	// ---------- Portal: vertical list, scroll-driven focus resize ----------
	//
	// Figma 199:5483 / 201:6178: exactly one question is "focused" (shows the
	// big depth-stacked card preview) at a time, and which one tracks scroll
	// position CONTINUOUSLY — see startPortalFocus below for the mechanism.

	// Rebuilt AGAIN 2026-08-16, against a closer study of Figma node
	// 201:6340's actual rendered pixels (not the raw node tree — see the
	// numbers below). The previous version scaled the whole front card down
	// small to fit the available height, which read as "strange" — a
	// miniature, not a real card. What Figma actually does: the front card
	// is close to FULL natural width (measured 300 of 350 content px — 85.7%
	// — same ballpark as the Swipe deck's own 88% convention) at its normal
	// 355:473 ratio, so title/avatar/byline render at a legible, un-shrunk
	// size. It's simply TALLER than the visible row and gets CROPPED — only
	// title+avatar+byline show (measured ~124px of a ~400px-tall card);
	// the body-paragraph lines never appear. The two cards behind are
	// narrower, at the SAME full aspect ratio, and only their own ~16-18px
	// top slivers peek above the front card — not because they're short,
	// but because the front card's opaque fill covers the rest of them.
	// This means neither JS nor CSS needs to compute or cap any card's
	// height at all: aspect-ratio handles it, and cropping happens for
	// free via .portal-group's own overflow:hidden at whatever the ROW's
	// current live height is (100 to 292px) — which is also why, unlike
	// the last version, this one needs no explicit .portal-stack overflow:
	// clipping at .portal-stack's own fixed height would freeze the reveal
	// at one size instead of tracking the row.
	// FRONT_TOP moved 40 -> 60 after the outer-gutter fix (styles.css
	// .portal-group) narrowed this row's content box, which made every
	// current question wrap its title to 2 lines instead of 1 — pushing
	// .portal-stack's own start further down and shrinking how much of the
	// front card fit before the crop line, to where a sliver of
	// .card-rule (the divider marking where body-paragraph lines start)
	// was poking through. The fix is NOT more row height — that moves the
	// CROP LINE down and reveals MORE (tried first, made it worse:
	// measured the rule sliver grow from 15px to 31px). What's needed is
	// moving the CARD down within the same fixed crop window, which
	// reveals an EARLIER portion of the card (still title+avatar+byline)
	// and pushes the later portion (the rule, then body text) further out
	// of view. Iterated empirically against live measurements rather than
	// re-deriving by hand: at 60, the rule sits 5px past its own top
	// before the crop (hidden, small buffer) and the avatar keeps 15px of
	// clearance (comfortable, matches the same ballpark as before).
	var PORTAL_STACK_FRONT_WIDTH_PCT = 85; // % of .portal-stack's own width
	var PORTAL_STACK_SCALE_STEP = 0.88;    // width multiplier per idx going back
	var PORTAL_STACK_TOP_STEP = 18;        // px each subsequent card sits higher
	var PORTAL_STACK_FRONT_TOP = 60;       // px headroom above the front card,
	                                        // for the 2 peeking cards above it

	function portalStackHTML(kinds, variant) {
		var count = kinds.length;
		var html = '';
		kinds.forEach(function (kind, idx) {
			var wrap = document.createElement('div');
			wrap.innerHTML = cardHTML(kind, variant + idx);
			var inner = wrap.firstChild;
			var widthPct = PORTAL_STACK_FRONT_WIDTH_PCT * Math.pow(PORTAL_STACK_SCALE_STEP, idx);
			inner.classList.add('portal-stack-card');
			inner.style.zIndex = String(count - idx);
			inner.style.left = '50%';
			inner.style.top = (PORTAL_STACK_FRONT_TOP - idx * PORTAL_STACK_TOP_STEP) + 'px';
			inner.style.width = widthPct + '%';
			inner.style.transform = 'translateX(-50%)';
			html += inner.outerHTML;
		});
		return html;
	}

	function renderPortal(main, directions) {
		main.innerHTML = directions
			.map(function (d, i) {
				return (
					'<div class="portal-group cascade-item">' +
					'<p class="q-title">' + escapeHTML(d.question) + '</p>' +
					'<div class="portal-stack">' + portalStackHTML(cardOrder(i), i) + '</div>' +
					'</div>'
				);
			})
			.join('') +
			// Without this, the last question can never reach --focus:1 on a
			// real phone: the natural document height barely exceeds the
			// viewport (measured ~65-110px of scroll room for 5 short
			// questions), nowhere near enough to sweep focus across all of
			// them. This reserves deliberate extra scroll distance so it can —
			// Lindsey's explicit call, not a hack: don't retune PORTAL_FALLOFF
			// or row heights to compensate, they're correct as measured.
			// Portal-only; every other pattern's scroll length is unaffected.
			'<div class="portal-scroll-spacer" aria-hidden="true"></div>';
		startPortalFocus(main);
	}

	// Reuses the SAME scroll+rAF idiom as the card-row velocity lag below,
	// rather than a CSS transition or `animation-timeline: view()`: the
	// effect is continuous and CROSS-ROW (one row's growth is coupled to its
	// neighbor's shrink), which a single element's view-progress timeline
	// can't express — considered and rejected for that reason, not an
	// oversight.
	//
	// Runs as a plain continuous rAF loop rather than the lag effect's
	// start-on-scroll/stop-on-settle discipline: that discipline exists
	// because the lag effect could be running across many card-rows on four
	// other patterns simultaneously. Here there's at most one route (`#/portal`)
	// and ~4 rows, so reading/writing a handful of rects every frame while
	// mounted is cheap — but it still has to stop on navigating away (see
	// stopPortalFocus, called unconditionally at the top of render() below).
	// Collapsed/expanded row heights (100px/292px) live only in styles.css's
	// .portal-group height calc(), not duplicated here as JS constants —
	// this loop never needs to know them, it only ever reads LIVE rects.
	var PORTAL_FALLOFF = 150; // px — how far from the focus line a row still
	                          // reads as partially open.

	// Width of the flat REST ZONE at the centre of the falloff, as a fraction
	// of PORTAL_FALLOFF (0 = the original pure linear ramp, no rest at all;
	// 0.9 = almost entirely rest with a very abrupt handoff). Read ONCE per
	// mount from the --portal-plateau custom property in styles.css rather
	// than hardcoded here, for two reasons: it keeps this tuned number next
	// to every other tuned number in styles.css, and it lets a throwaway
	// comparison harness inject different values per iframe (via a plain
	// style tag) without editing either source file. Read once, never in
	// portalTick — getComputedStyle every frame would be a style recalc per
	// frame, the exact trap cascade()'s own comment warns about.
	var PORTAL_PLATEAU_FALLBACK = 0.55;
	var PORTAL_PLATEAU_MAX = 0.95; // guard: 1.0 would divide by zero below
	var portalPlateau = PORTAL_PLATEAU_FALLBACK;

	function readPortalPlateau() {
		var raw = getComputedStyle(document.documentElement)
			.getPropertyValue('--portal-plateau');
		var v = parseFloat(raw);
		// NaN when the property is absent or malformed — fall back rather than
		// poisoning every subsequent focus value with NaN.
		if (isNaN(v)) v = PORTAL_PLATEAU_FALLBACK;
		return Math.max(0, Math.min(PORTAL_PLATEAU_MAX, v));
	}

	var portalRows = null; // live NodeList of .portal-group, or null when unmounted
	var portalMain = null;
	var portalRAF = null;
	var portalFocusOffset = 0; // px, captured at mount — see startPortalFocus

	// Whichever element is NOT scrolled content: .app-shell itself, but only
	// when IT is the one with scrollable overflow (desktop, clipped inside
	// .device); at phone width .app-shell has no overflow of its own (the
	// window scrolls instead), so the fallback is the viewport's own top
	// (0). Detecting via scrollHeight > clientHeight rather than a
	// breakpoint check, so this doesn't silently break if the CSS breakpoint
	// ever moves.
	function portalScrollBoundaryTop() {
		var shell = portalMain && portalMain.closest('.app-shell');
		if (shell && shell.scrollHeight > shell.clientHeight) {
			return shell.getBoundingClientRect().top;
		}
		return 0;
	}

	// Current scroll offset of whichever element is actually doing the
	// scrolling — the same phone/desktop fork portalScrollBoundaryTop()
	// makes, so the two always agree about which element that is.
	function portalScrollTop() {
		var shell = portalMain && portalMain.closest('.app-shell');
		if (shell && shell.scrollHeight > shell.clientHeight) {
			return shell.scrollTop;
		}
		return window.pageYOffset || document.documentElement.scrollTop || 0;
	}

	// The focus line is a FIXED viewport coordinate — like a real carousel's
	// "pick-up point," a fixed spot on screen that content scrolls past —
	// not something remeasured live from .pattern-main. That was the first,
	// wrong attempt: .pattern-main is inside the scrolling content in BOTH
	// layouts (phone width: the window scrolls and main moves with it;
	// desktop: .app-shell scrolls internally and main is its child), so
	// anchoring to it made every row's distance from the "line" constant
	// across the whole scroll range — both sides of the subtraction were
	// moving together. portalFocusOffset is instead captured ONCE at mount
	// in startPortalFocus, relative to portalScrollBoundaryTop(), and held
	// fixed for the rest of the session.
	function portalFocusLine() {
		return portalScrollBoundaryTop() + portalFocusOffset;
	}

	function portalTick() {
		if (!portalRows) return;
		var focusY = portalFocusLine();
		for (var i = 0; i < portalRows.length; i++) {
			var row = portalRows[i];
			var r = row.getBoundingClientRect();
			// Distance from the row's TOP edge, not its center. A row's top
			// only moves because of rows ABOVE it changing height — never its
			// own — so growth can't feed back on itself. Center-based distance
			// was tried first and is wrong: as a pinned-at-top row grows
			// downward, its center recedes from a focus line near the top,
			// capping its own proximity well short of 1 (measured: 0.332
			// equilibrium instead of reaching 1).
			// t: normalized distance, 0 at the focus line, 1 at the falloff edge.
			var t = Math.abs(r.top - focusY) / PORTAL_FALLOFF;
			// The LAST row holds open once it has arrived, instead of closing
			// again as you keep scrolling past it. Two reasons, both real:
			//  · UX: without this, scrolling to the very bottom of the page
			//    visibly CLOSES the final card, so the end of the list reads
			//    as empty — the one card you just scrolled all the way to
			//    reach is the one that shuts.
			//  · Robustness: it decouples correctness from the spacer being
			//    exactly the right height. Before this, whether the last card
			//    ever reached focus 1 depended on max-scroll landing precisely
			//    inside its peak window, which was NOT monotonic in spacer
			//    height — measured a 500px spacer working and 700px failing.
			//    Now any sufficiently tall spacer works and extra height is
			//    harmless, so the spacer only has to be "enough", not "exact".
			// Scrolling down moves content up, so r.top DEcreases; r.top at or
			// below focusY means this row has reached the line or gone past it.
			if (i === portalRows.length - 1 && r.top <= focusY) t = 0;
			// PLATEAU is a flat REST ZONE: while t <= plateau, focus pins to
			// exactly 1 and scrolling does not resize the card at all. Past it,
			// focus ramps to 0 across the remaining (1 - plateau), which is
			// necessarily STEEPER than a plain linear falloff — that's the
			// point. A pure ramp (the first version: 1 - t) had no flat region
			// anywhere, so every single pixel of scroll changed every card's
			// size and no card was ever at rest — measured: 10px of scroll
			// moved focus 1.00 -> 0.93. Lindsey's read was that this felt
			// mushy, with no "lock in place" moment; mathematically there
			// wasn't one to feel. This mapping is what creates the
			// hold -> fast handoff -> hold rhythm.
			// At t == plateau this evaluates to exactly 1, so the two
			// segments meet continuously — no jump at the seam.
			var proximity = Math.max(0, Math.min(1, (1 - t) / (1 - portalPlateau)));
			row.style.setProperty('--focus', proximity.toFixed(3));
		}
		portalRAF = requestAnimationFrame(portalTick);
	}

	// Captures the focus line's fixed offset — called on the first rAF
	// frame after mount, again once the first row's OWN entrance animation
	// finishes, and again on resize (main's position relative to the scroll
	// boundary can shift, e.g. crossing the phone/desktop breakpoint changes
	// whether .app-shell scrolls internally at all). Two separate timing
	// bugs made this need two separate call sites, not one:
	//   1. Calling it synchronously in the same script tick as the DOM
	//      insertion above caught .app-shell on desktop BEFORE the browser's
	//      first layout pass had resolved its desktop CSS (scrollHeight
	//      briefly read <= clientHeight, so portalScrollBoundaryTop()
	//      wrongly fell back to the phone-width branch). Deferring to the
	//      next rAF frame fixes this.
	//   2. Even on that next frame, the first row is still mid-.rise-in — the
	//      cascade's own translateY(--rise) hasn't resolved to none yet
	//      (staggered by --stagger * --i, so it hasn't even STARTED for a
	//      few frames) — so an early read permanently mislocks the resting
	//      focus line a few px below where Figma actually has it. Waiting
	//      for that row's animationend (the same signal clearOnFinish
	//      already uses to know an entrance has settled) and re-capturing
	//      fixes this; .portal-group.rise-in's transition (styles.css) is
	//      what makes that one correction ease instead of pop.
	function capturePortalFocusOffset() {
		if (!portalRows || !portalRows[0]) return;
		// + portalScrollTop() makes this SCROLL-INDEPENDENT, and that term is
		// load-bearing, not defensive. What this wants to record is "where
		// row 0's top sits when scroll is at 0" — a fixed pick-up point. The
		// rect alone only equals that while the page happens to be scrolled
		// to the top, which is not guaranteed: capture also runs on resize
		// and on the first row's animationend, and a browser can restore a
		// non-zero scroll position when returning to this route. Measured the
		// failure directly: re-mounting while scrolled to y=690 captured an
		// offset of -539 instead of 151, which pins the focus line off-screen
		// and leaves row 0 reporting focus 1.000 while it isn't even visible.
		portalFocusOffset = portalRows[0].getBoundingClientRect().top
			- portalScrollBoundaryTop() + portalScrollTop();
	}

	function startPortalFocus(main) {
		portalMain = main;
		portalRows = main.querySelectorAll('.portal-group');
		portalPlateau = readPortalPlateau();
		if (prefersReducedMotion()) {
			// Static fallback: first question expanded, rest collapsed, no
			// listener, no rAF — same shape the lag effect falls back to.
			Array.prototype.forEach.call(portalRows, function (row, i) {
				row.style.setProperty('--focus', i === 0 ? '1' : '0');
			});
			return;
		}
		var firstRow = portalRows[0];
		if (firstRow) {
			firstRow.addEventListener('animationend', function handler(e) {
				if (e.target !== firstRow) return;
				firstRow.removeEventListener('animationend', handler);
				capturePortalFocusOffset();
			});
		}
		if (portalRAF == null) {
			portalRAF = requestAnimationFrame(function () {
				capturePortalFocusOffset();
				portalTick();
			});
		}
	}

	function stopPortalFocus() {
		if (portalRAF != null) { cancelAnimationFrame(portalRAF); portalRAF = null; }
		portalRows = null;
		portalMain = null;
	}

	var RENDERERS = {
		carousel: renderCarousel,
		tabs: renderTabs,
		accordion: renderAccordion,
		swipe: renderSwipe,
		portal: renderPortal
	};

	// ---------- Shell: menu + pattern view + switcher ----------

	function renderMenu(shell) {
		shell.innerHTML =
			'<div class="menu">' +
			'<p class="menu-eyebrow">' + escapeHTML(CONTENT.topic) + '</p>' +
			'<h1 class="menu-title">Ways in</h1>' +
			PATTERNS.map(function (p) {
				return (
					'<a class="menu-item" href="#/' + p.id + '">' +
					'<span class="menu-item-name">' + p.label + '</span>' +
					'<span class="menu-item-arrow">' + icon('arrow-right') + '</span>' +
					'</a>'
				);
			}).join('') +
			'</div>';

		// One continuous sequence: eyebrow, title, then the five items. Two calls
		// rather than one querySelectorAll because document order across two
		// different selectors isn't something to rely on for timing.
		var next = cascade(shell.querySelectorAll('.menu-eyebrow, .menu-title'), 0);
		cascade(shell.querySelectorAll('.menu-item'), next);
	}

	// The header carries the THEME name, identically on all five screens — not the
	// pattern's own name, which used to sit here. Which pattern you're looking at
	// is the switcher's job; naming it inside the frame made every screen read as
	// a labelled specimen instead of a product screen. The old uppercase topic
	// eyebrow is gone for the same reason: the theme is now the title, so
	// repeating it above the title was saying one thing twice.
	//
	// The back chevron carries a visible label naming its destination, which is
	// verbatim the menu's own H1 ("Ways in") — a back label that doesn't match the
	// page you land on is worse than no label. Deliberately NO aria-label: the
	// visible text is the accessible name, and an aria-label would override it,
	// leaving voice-control users saying "tap Ways in" with nothing to match.
	// ---------- Switcher ----------
	//
	// Built ONCE and kept alive across navigations. That's not tidiness, it's the
	// requirement: the indicator can only travel between segments if it's the same
	// DOM node before and after the route change. render() used to wipe all of
	// #app on every hashchange, which rebuilt the switcher with the new segment
	// already active — nothing to animate from. render() now replaces only the
	// .device subtree so this node survives.
	var switcherEl = null;

	function buildSwitcher() {
		if (switcherEl) return switcherEl;
		var nav = document.createElement('nav');
		nav.className = 'switcher';
		nav.innerHTML =
			'<div class="switcher-scroll"><div class="switcher-inner">' +
			// Decorative: it's the fill behind whichever label is active, and the
			// labels themselves carry the meaning.
			'<span class="switcher-thumb" aria-hidden="true"></span>' +
			PATTERNS.map(function (p) {
				return '<a class="switcher-btn" href="#/' + p.id + '">' + p.label + '</a>';
			}).join('') +
			'</div></div>';
		switcherEl = nav;
		return nav;
	}

	// Moves the indicator onto the active segment. The five segments are five
	// different widths, so both position and width come from measurement — CSS
	// can't size an absolutely positioned element to its nth sibling.
	//
	// animate=false strips .ready, writes, forces a reflow, then re-adds it, so
	// the new geometry is already committed before transitions come back on.
	// Same remove -> reflow -> re-add idiom as .swap-in in renderTabs. Without it
	// the indicator would slide in from the track's left edge on every arrival.
	function positionThumb(nav, animate) {
		if (!nav) return;
		var thumb = nav.querySelector('.switcher-thumb');
		var active = nav.querySelector('.switcher-btn.active');
		var inner = nav.querySelector('.switcher-inner');
		if (!thumb || !active || !inner) return;
		if (!animate) thumb.classList.remove('ready');
		// Rects, not offsetLeft/offsetWidth: those round to whole pixels, and the
		// segment boxes are fractional, so the indicator landed up to a subpixel off
		// its segment — visible as a hairline of track showing along one edge, worst
		// on the last segment where the rounding has accumulated.
		//
		// Subtracting inner's own rect keeps this in inner's coordinate space, which
		// is what the absolutely-positioned thumb is offset from. It's also
		// scroll-independent (inner IS the scrolled content, so both rects shift
		// together) and immune to .switcher's translateX(-50%) for the same reason.
		var ir = inner.getBoundingClientRect();
		var ar = active.getBoundingClientRect();
		thumb.style.width = ar.width + 'px';
		thumb.style.transform = 'translateX(' + (ar.left - ir.left) + 'px)';
		if (!animate) {
			void thumb.offsetWidth;
			thumb.classList.add('ready');
		}
	}

	function syncSwitcher(app, id) {
		var nav = buildSwitcher();
		// Detached means we're arriving from the menu (or first load), which should
		// NOT slide — there's no previous segment to travel from.
		var freshMount = nav.parentNode !== app;
		if (freshMount) app.appendChild(nav);

		var btns = nav.querySelectorAll('.switcher-btn');
		Array.prototype.forEach.call(btns, function (b, i) {
			b.classList.toggle('active', PATTERNS[i].id === id);
		});

		// Keep the active segment in view when arriving by deep link — with 5
		// segments the last two sit outside the track at phone width.
		//
		// Measured from rects, NOT offsetLeft, deliberately. offsetLeft is relative
		// to whatever the nearest POSITIONED ancestor happens to be, and adding
		// .switcher-inner silently moved that from .switcher to .switcher-inner —
		// which changed this sum by 24px (.switcher's 20px gutter + the track's 4px
		// padding) without anything here looking wrong. The old inflated figure was
		// pushing the active segment ~24px left of centre. Rects are immune to that
		// class of mistake: the difference between two of them is the real onscreen
		// distance, whatever the structure above does next.
		var scroller = nav.querySelector('.switcher-scroll');
		var active = nav.querySelector('.switcher-btn.active');
		if (active && scroller.scrollWidth > scroller.clientWidth) {
			var sr = scroller.getBoundingClientRect();
			var ar = active.getBoundingClientRect();
			scroller.scrollLeft = Math.max(
				0,
				scroller.scrollLeft + (ar.left - sr.left) - (sr.width - ar.width) / 2
			);
		}

		positionThumb(nav, !freshMount);
	}

	function unmountSwitcher() {
		if (switcherEl && switcherEl.parentNode) {
			switcherEl.parentNode.removeChild(switcherEl);
		}
	}

	function renderPatternView(shell, app, id) {
		shell.innerHTML =
			// No back-link in the standalone build: it pointed at the 5-pattern
			// menu ("Ways in"), which does not exist here, and a back affordance
			// that goes nowhere is worse than none. The theme name is kept as
			// the screen title, exactly as in the master copy.
			'<header class="pattern-header">' +
			'<span class="screen-title">' + escapeHTML(CONTENT.topic) + '</span>' +
			'</header>' +
			'<main class="pattern-main"></main>';

		// The switcher is a SIBLING of .app-shell, not a child: the desktop device
		// frame clips its shell with overflow, and the switcher has to escape that
		// to sit out on the field below the phone. It's mounted and updated by
		// syncSwitcher below rather than built here, because it has to outlive this
		// function — see the comment on switcherEl.
		var main = shell.querySelector('.pattern-main');
		var directions = CONTENT.patterns[id].directions;
		RENDERERS[id](main, directions);

		// Tier 1: the header. Tier 2: whatever the renderer marked as a top-level
		// group. Every renderer opts in by putting `cascade-item` in a class
		// string it was already building, so the shell doesn't need to know any
		// pattern's DOM shape — and adding a sixth pattern later gets the
		// entrance for free.
		//
		// The switcher is deliberately NOT cascaded. It's harness chrome (per the
		// M2 decision), so animating it on every route change draws the eye to
		// the frame rather than the experiment. It's also load-bearing on three
		// transforms a cascade would fight: `translateX(-50%)` for centering at
		// phone width, the indicator's own translateX, and the offsetLeft /
		// clientWidth measurements syncSwitcher depends on.
		var next = cascade([shell.querySelector('.pattern-header')], 0);
		cascade(main.querySelectorAll('.cascade-item'), next);

		// syncSwitcher(app, id) intentionally NOT called in the standalone
		// build: the 5-way switcher is harness chrome for comparing patterns,
		// and there is only one pattern here.
	}

	function render() {
		var app = document.getElementById('app');
		var hash = location.hash.replace(/^#\/?/, '');

		// Unconditional, harmless no-op when it wasn't running: every route
		// change tears down the previous .device subtree below, so Portal's
		// rAF loop has to stop here rather than only when navigating AWAY
		// from Portal specifically — otherwise leaving Portal for Portal
		// (impossible via the switcher, but reachable by re-clicking the same
		// menu link) would leak a second loop.
		stopPortalFocus();

		// .device is a passthrough at phone width and becomes the frame on
		// desktop; it also owns the home indicator, which must not scroll with
		// the shell's content.
		var device = document.createElement('div');
		device.className = 'device';

		var shell = document.createElement('div');
		shell.className = 'app-shell';
		device.appendChild(shell);

		// Replace ONLY the .device subtree, not all of #app. #app's other child is
		// the persistent switcher, and a CSS transition can't be relied on across a
		// detach and re-attach — so destroying it here would kill the indicator's
		// travel even though the variable still pointed at a live node.
		var oldDevice = app.querySelector('.device');
		if (oldDevice) app.removeChild(oldDevice);
		app.insertBefore(device, app.firstChild);

		// STANDALONE PORTAL BUILD — this copy is Portal-only, so there is no
		// menu, no switcher, and no routing: every load renders Portal
		// regardless of the hash. See the header comment at the top of this
		// file for why this directory exists as a frozen fork.
		// The other four renderers, renderMenu, and the whole switcher
		// implementation are deliberately left in place rather than deleted —
		// they're inert here (nothing calls them), and keeping them means this
		// file stays a clean `diff` against the master copy it was forked
		// from, which is what makes it possible to see exactly what diverged
		// while Portal is refined independently.
		renderPatternView(shell, app, 'portal');
	}

	window.addEventListener('hashchange', render);

	// Segment offsets move with the viewport (the desktop track centres, the phone
	// track's width changes), and nothing else re-renders on resize — without this
	// the indicator would sit under the wrong segment after a rotate or a window
	// drag. Snaps rather than slides, so it doesn't chase a drag-resize.
	window.addEventListener('resize', function () {
		if (switcherEl && switcherEl.parentNode) positionThumb(switcherEl, false);
		// Same reasoning as positionThumb above: a resize can cross the
		// phone/desktop breakpoint, which changes whether .app-shell scrolls
		// internally at all — portalScrollBoundaryTop()'s answer changes, so
		// the captured offset has to be recomputed, not just reused.
		if (portalRows) capturePortalFocusOffset();
	});

	// ---------- Card-row velocity lag ----------
	//
	// Reference: reference/Animation/HorizontalSwipe.mp4. Watched frame-by-frame
	// (30 frames at 24fps around one swipe, then the settle at native 60fps) rather
	// than eyeballed. Two measurements drove every constant below and every
	// modelling choice:
	//
	//   · Card height was 614px in EVERY frame — no scale, no vertical offset, no
	//     rotation. This is a horizontal-only effect.
	//   · The gap between adjacent cards stretches from 521px at rest to 551px at
	//     peak speed (+5.8%) and CLOSES BACK to 521 — monotonically, confirmed at
	//     60fps (551→542→536→533→530→526→523→521, stop). It never dips below
	//     521 and returns. That rules out a spring: a spring would need deliberate
	//     critical damping to avoid overshooting, and the measurement says there
	//     ISN'T any to avoid.
	//
	// So this is a velocity LOW-PASS FILTER, not a spring integrator. A low-pass
	// filter can't overshoot, and its steady-state output is proportional to input
	// velocity — both are exactly what was measured. Converting the reference's
	// peak lag (30px in an 800px render, card pitch 521px) into our card pitch
	// (308 + 12 gutter = 320px, scale factor 0.614) and expressing it as a TIME
	// rather than a distance (since the effect is velocity-proportional, a time
	// constant is the only version that stays correct at any scroll speed):
	//
	//   peak velocity  1762 px/s (video) -> 1082 px/s (ours)
	//   peak lag         30px    (video) ->   18.4px  (ours)
	//   LAG_PER_CARD = 18.4 / 1082 = 0.017s — each card trails the one ahead of it
	//   by ~17ms of travel.
	//
	// Deliberately left native: momentum, scroll-snap, keyboard, trackpad, and
	// scrollbar semantics are all still the browser's. The reference itself paces
	// over ~900ms with an ease-in-out, which a released finger-flick can't
	// reproduce (a fling only decelerates; the reference accelerates first) — taking
	// that over would mean rebuilding momentum/keyboard/accessibility from scratch,
	// which is out of scope here. Native scroll-driven CSS (animation-timeline)
	// could not have done ANY of this regardless: that API is position-driven, and
	// this effect is velocity-driven.
	var LAG_PER_CARD = 0.017; // seconds — derived above, not tuned by feel
	// Time constant, not a fixed per-frame coefficient — see lagStep for why.
	// 0.1026s is not a round number: it's chosen so alpha = 1 - e^(-dt/τ) equals
	// exactly 0.15 at a 60fps dt (16.67ms), preserving the originally-tuned
	// responsiveness while fixing dt-jitter sensitivity, rather than silently also
	// changing how snappy the filter feels.
	var VEL_TAU = 0.1026;
	var MIN_DT = 1 / 240;     // floor on dt, in seconds — see comment below
	var LAG_CAP = 40;         // px — ceiling so a hard flick can't fling a card

	var lagRows = []; // rows currently tracked; only ones that have actually scrolled
	var lagRAF = null;

	function lagStep(now, row) {
		if (row._lagLastT == null) { row._lagLastT = now; return; }
		var dt = (now - row._lagLastT) / 1000;
		row._lagLastT = now;
		if (dt <= 0) return;

		var dx = row.scrollLeft - row._lagPrevScroll;
		row._lagPrevScroll = row.scrollLeft;
		// instVel = dx/dt blows up whenever two scroll events land unusually close
		// together — the same dx over a tinier dt reads as a much bigger velocity,
		// with nothing in a FIXED per-frame smoothing coefficient to compensate
		// (a constant coefficient implicitly assumes ~60fps/16ms frames). Found via
		// a synthetic-scroll test that exposed a ~4px wiggle in the lag output with
		// no matching event in the real scrollLeft trace — traced to exactly this.
		// Two corrections, both standard for a dt-driven low-pass:
		//   1. Floor dt at 1/240s so a freak sub-frame gap can't be divided by
		//      near-zero.
		//   2. Derive the smoothing coefficient FROM dt each frame
		//      (alpha = 1 - e^(-dt/τ)) instead of using a fixed constant, so the
		//      filter's effective bandwidth is the same whether frames land 8ms or
		//      33ms apart.
		if (dt < MIN_DT) dt = MIN_DT;
		var instVel = dx / dt;
		var alpha = 1 - Math.exp(-dt / VEL_TAU);
		row._lagVel += (instVel - row._lagVel) * alpha;

		var cards = row._lagCards;
		var settled = Math.abs(row._lagVel) < 1 && Math.abs(dx) < 0.5;
		for (var i = 0; i < cards.length; i++) {
			// Index from the LEADING edge in the direction of travel, not a fixed
			// end — otherwise travel one way spreads the cards (correct) and the
			// other way compresses them (18px of lag against a 12px gutter would
			// overlap). This flip is a discontinuity in `i`, but it's multiplied by
			// vel, and reversing direction means passing through vel≈0 first, so
			// the jump lands where the multiplier is nil.
			var idx = row._lagVel >= 0 ? i : (cards.length - 1 - i);
			var offset = settled ? 0 : Math.max(-LAG_CAP, Math.min(LAG_CAP, row._lagVel * LAG_PER_CARD * idx));
			cards[i].style.transform = offset ? 'translateX(' + offset + 'px)' : '';
		}
		row._lagSettled = settled;
	}

	function lagTick() {
		var now = performance.now();
		var stillMoving = false;
		for (var i = 0; i < lagRows.length; i++) {
			lagStep(now, lagRows[i]);
			if (!lagRows[i]._lagSettled) stillMoving = true;
		}
		if (stillMoving) {
			lagRAF = requestAnimationFrame(lagTick);
		} else {
			// Every row is at rest with its transforms already cleared by lagStep
			// (settled forces offset to 0) — stop the loop rather than run it
			// forever at zero cost, so this can never become a battery drain.
			lagRAF = null;
			lagRows = [];
		}
	}

	function onCardsRowScroll(row) {
		if (row._lagCards == null) {
			row._lagCards = row.querySelectorAll(':scope > .card');
			row._lagPrevScroll = row.scrollLeft;
			row._lagVel = 0;
			row._lagLastT = null;
		}
		if (lagRows.indexOf(row) === -1) lagRows.push(row);
		if (lagRAF == null) lagRAF = requestAnimationFrame(lagTick);
	}

	// One document-level listener in the CAPTURE phase, not one per row. `scroll`
	// does not bubble, but it IS dispatched during capture — so a single listener
	// here reaches every .cards-row that exists now AND every one a later render
	// creates (e.g. renderTabs rebuilding .tab-content), with nothing to attach or
	// clean up per row.
	if (!prefersReducedMotion()) {
		document.addEventListener('scroll', function (e) {
			var row = e.target;
			if (row.classList && row.classList.contains('cards-row')) onCardsRowScroll(row);
		}, true);
	}

	function prefersReducedMotion() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	render();
})();
