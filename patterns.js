// patterns.js
//
// Vanilla JS, no build step, no framework — reads window.CONTENT (content.js)
// and renders one of five interaction shells: carousel, tabs, accordion,
// swipe, portal. Navigation between the 5 patterns is hash-based (#/carousel
// etc.) so every pattern is a real, reload-safe, shareable link, and the
// pinned bottom switcher just rewrites the hash.

(function () {
	'use strict';

	var CONTENT = window.CONTENT;

	var PATTERNS = [
		{ id: 'carousel', label: 'Carousel' },
		{ id: 'tabs', label: 'Tabs' },
		{ id: 'accordion', label: 'Accordion' },
		{ id: 'swipe', label: 'Stacking Card' },
		{ id: 'portal', label: 'Portal' }
	];

	// CARD_COUNTS is GONE as of 2026-08-16. It existed to tell Portal how many
	// cards to put in its stack, and Portal was its only remaining reader; the
	// static Portal (Figma 206:9177) draws two plain decorative squares
	// instead, so nothing consumes a per-pattern card count any more. Patterns
	// 1–4 render one card of each content kind, so their count is inherently 3
	// and comes from CARD_ORDERS below. The documented Figma-sourced counts
	// live in content.js's header comment, which is where they belong.
	// (portal-scroll/, the forked scroll-driven Portal, still has its own copy.)

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
	// `stack` marks it as a Stacking Card row: same markup and same scroll
	// pipeline as the plain carousel, but the shared scroll handler additionally
	// collapses it into a depth stack at rest (see writeTransforms / initStackRow).
	function cardRowHTML(index, stack) {
		var cards = cardOrder(index).map(function (kind, i) {
			return cardHTML(kind, index + i);
		}).join('');
		return '<div class="cards-row' + (stack ? ' cards-row--stack' : '') + '">' +
			cards + '</div>';
	}

	// Filled card skeleton — a card that reads as a physical object rather than
	// a thumbnail. Two bars instead of three: these cards are taller and
	// narrower, and a third bar crowds them.
	//
	// DEAD as of 2026-08-16 — nothing calls this. Its only caller was the old
	// scroll-snap Portal strip, which the static Portal rebuild removed. (The
	// swipe deck was never a consumer despite what this comment used to claim:
	// it builds `.deck-card` around cardHTML(), not this.) imgWellHTML below is
	// transitively dead with it, as are the .ph-card / .ph-img / .ph-bar rules
	// in styles.css. Delete all of it together, with a re-render check across
	// the five routes afterwards — see CLAUDE.md's cleanup note.
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

	// ---------- Stacking Card: a carousel row that rests as a depth stack -------
	//
	// Renamed from "Card Swipe" (the visible label in PATTERNS; the route id
	// stays `swipe` so deep links and screenshots don't break). The old build was
	// a drag-to-dismiss/cycle deck; this is M5(a) — an in-place horizontal
	// carousel. Each question is the SAME `.cards-row` the Carousel uses, so it
	// inherits scroll-snap and the velocity-lag "swipe" animation for free. The
	// only addition is a rest state: the shared .cards-row scroll pipeline
	// (writeTransforms below) collapses the 2nd/3rd cards into a depth stack
	// behind the 1st when the row is scrolled to the start, and scrubs them out
	// into their slots as you swipe. Reversible; scroll back to the start and it
	// re-stacks. See initStackRow for the mount-time rest state.
	function renderSwipe(main, directions) {
		directions.forEach(function (d, i) {
			var group = document.createElement('div');
			group.className = 'swipe-group cascade-item';
			group.innerHTML =
				'<p class="q-title">' + escapeHTML(d.question) + '</p>' +
				cardRowHTML(i, true) +
				(i === 0 ? '<p class="deck-hint">Swipe to browse</p>' : '');
			main.appendChild(group);
			// Apply the stacked rest state now: no scroll event fires on mount, so
			// without this the row would flash unstacked and only stack on first
			// touch. Runs after append so the cards have measurable layout offsets.
			initStackRow(group.querySelector('.cards-row--stack'));
		});
	}

	// ---------- Portal: static list, question + card-stack affordance ----------
	//
	// REBUILT 2026-08-16 against Figma 206:9177, replacing a scroll-driven
	// version (vertical list, one row focused at a time, size driven
	// continuously by scroll through a flat "plateau" rest zone). That version
	// is NOT deleted — it lives on in `portal-scroll/` as a deliberate fork so
	// it can keep being refined outside this 5-pattern comparison file. See
	// CLAUDE.md; do not try to reconstruct it from git history.
	//
	// Lindsey's call, and the reasoning matters: the scroll-driven version was
	// hard to land, so Portal's entry point here becomes deliberately EASIER —
	// a plain static list where every row is identical and nothing moves. The
	// interesting work moves to what happens when you TAP a row (expanding into
	// the full vertical content feed, Figma 199:4068), which is its own later
	// milestone. So this renderer is intentionally the simplest of the five:
	// no rAF loop, no scroll listener, no measurement, no state at all.
	//
	// Every row is the same 144px tall regardless of whether its question wraps
	// to two or three lines (measured across all five rows in 206:9177 — all
	// 144). The card-stack thumbnail on the right is what carries the "portal"
	// idea now: two plain rounded squares, hinting there is a stack of content
	// behind this question, without miniaturising a real card (a shrunk real
	// card was tried in the previous version and read as strange).
	function renderPortal(main, directions) {
		main.innerHTML = directions
			.map(function (d, i) {
				// A real <button>, not a <div>: the row is now tappable (it
				// expands into the full content feed, see openFeed below), so it
				// needs a genuine accessible name (the question text) and native
				// keyboard activation. A <button> fires click on Enter/Space for
				// free, so there's no separate keydown handler to maintain.
				return (
					'<button type="button" class="portal-group cascade-item" data-i="' + i + '">' +
					// .q-title, the SHARED question style every other pattern
					// uses — not a Portal-specific class. Lindsey's explicit
					// correction: Portal's questions must be the same
					// typographic size/style as Carousel/Tabs/Accordion/Swipe,
					// because in a head-to-head comparison harness a different
					// type size is a variable that shouldn't be varying. An
					// earlier version of this row used its own smaller 15px
					// class; don't reintroduce that.
					'<span class="q-title">' + escapeHTML(d.question) + '</span>' +
					// Decorative only — the question text is the accessible name of
					// the row, and announcing two empty boxes would add nothing.
					'<span class="portal-thumb" aria-hidden="true">' +
					'<span class="portal-thumb-back"></span>' +
					'<span class="portal-thumb-front"></span>' +
					'</span>' +
					'</button>'
				);
			})
			.join('');

		// One delegated listener rather than five: tapping (or keyboard-
		// activating) a row expands it into the full-screen feed.
		main.addEventListener('click', function (e) {
			var row = e.target.closest('.portal-group');
			if (!row || !main.contains(row)) return;
			openFeed(main, directions, row, Number(row.dataset.i));
		});
	}

	// ---------- Portal immersive expand (tap a row -> full-screen feed) ----------
	//
	// The tapped grey row GROWS from its own rect to fill the screen (a literal
	// iOS-widget box-morph), its contents cross-fading into a vertical feed of
	// full-size content cards. Built on the native View Transitions API: the
	// browser captures the row's box (old) and the feed's box (new), then animates
	// position/size/border-radius between them on the compositor — no manual FLIP
	// maths, no rAF loop. Two shared elements are named:
	//   · portal-hero  — the row box  -> the feed container (grows, radius 20->0)
	//   · portal-title — the row .q-title -> the feed .feed-title (travels up)
	//
	// Because the ::view-transition pseudo-tree renders in a viewport-level top
	// layer that is NOT clipped by the desktop .device frame (overflow:hidden), the
	// full box-morph is used only at phone width (<900px, the real feel-target).
	// On desktop it would escape the phone frame, so there we fall back to a plain
	// contained transition on .portal-feed (a normal descendant of .device, so it
	// stays inside the frame). Where startViewTransition is unsupported, the feed
	// simply opens with no morph — fully functional either way.
	var feedState = null;

	function isDesktopFrame() {
		return window.matchMedia('(min-width: 900px)').matches;
	}

	function setVTName(el, name) { if (el) el.style.viewTransitionName = name; }

	// Places the feed's box exactly over the tapped row — the FIRST/INVERT half of
	// a FLIP. Animating from here to identity grows the grey box out to fill the
	// frame (and reverse on close). transform-origin 0 0 keeps the translate+scale
	// a straight box map; radius starts at the row's 20px and lands at the feed's 0.
	function setFlipToRow(feedEl, device, rowEl) {
		var dr = device.getBoundingClientRect();
		var rr = rowEl.getBoundingClientRect();
		var sx = Math.max(rr.width / dr.width, 0.0001);
		var sy = Math.max(rr.height / dr.height, 0.0001);
		feedEl.style.transformOrigin = '0 0';
		feedEl.style.transform =
			'translate(' + (rr.left - dr.left) + 'px,' + (rr.top - dr.top) + 'px) ' +
			'scale(' + sx + ',' + sy + ')';
		feedEl.style.borderRadius = '20px';
	}

	function buildFeedEl(directions, index) {
		var d = directions[index];
		var cards = cardOrder(index).map(function (kind, i) {
			return cardHTML(kind, index + i);
		}).join('');
		var feed = document.createElement('div');
		feed.className = 'portal-feed';
		// role/aria: it's a transient view over the list; label it by its title.
		feed.setAttribute('role', 'group');
		feed.innerHTML =
			'<div class="feed-header">' +
			'<button type="button" class="feed-back" aria-label="Back">' +
			icon('chevron-left', 20) + '</button>' +
			'<h2 class="feed-title">' + escapeHTML(d.question) + '</h2>' +
			// Two decorative meta bars (a dek / byline placeholder), matching the
			// reference. Decorative, so aria-hidden.
			'<div class="feed-meta" aria-hidden="true">' +
			'<span class="feed-meta-bar"></span>' +
			'<span class="feed-meta-bar"></span>' +
			'</div>' +
			'</div>' +
			// NOT .cards-row: the horizontal velocity-lag scroll listener is scoped
			// to .cards-row, and this is a vertical feed that must never be caught
			// by it.
			'<div class="feed-list">' + cards + '</div>';
		return feed;
	}

	function openFeed(main, directions, rowEl, index) {
		if (feedState) return; // already open / mid-transition
		var device = main.closest('.device');
		var feedEl = buildFeedEl(directions, index);
		var rowTitle = rowEl.querySelector('.q-title');

		feedState = {
			device: device, main: main, rowEl: rowEl, feedEl: feedEl,
			keyHandler: null, closing: false
		};

		function mount() {
			device.appendChild(feedEl);
			if (switcherEl) switcherEl.classList.add('is-hidden');
			document.documentElement.classList.add('feed-open');
		}

		function afterOpen() {
			var back = feedEl.querySelector('.feed-back');
			back.addEventListener('click', function () { closeFeed(); });
			var keyHandler = function (e) {
				if (e.key === 'Escape') { e.preventDefault(); closeFeed(); }
			};
			document.addEventListener('keydown', keyHandler);
			feedState.keyHandler = keyHandler;
			// Move focus into the feed so keyboard users land on the way out.
			back.focus();
		}

		if (!isDesktopFrame() && typeof document.startViewTransition === 'function') {
			document.documentElement.style.setProperty('--vt-dur', 'var(--dur-expand)');
			// Old state: the row carries the shared names (feed not in DOM yet).
			setVTName(rowEl, 'portal-hero');
			setVTName(rowTitle, 'portal-title');
			var t = document.startViewTransition(function () {
				mount();
				// New state: hand the names to the feed and strip them from the
				// row, so no name is duplicated within a single captured state
				// (a duplicate aborts the whole transition).
				setVTName(rowEl, '');
				setVTName(rowTitle, '');
				setVTName(feedEl, 'portal-hero');
				setVTName(feedEl.querySelector('.feed-title'), 'portal-title');
			});
			t.updateCallbackDone.then(afterOpen);
			t.finished.then(function () { clearFeedVT(); }, function () { clearFeedVT(); });
		} else {
			mount();
			// Desktop (or no-VT): a hand-rolled FLIP box-morph, clipped to the frame
			// because .portal-feed is an absolute child of .device. (View Transitions
			// can't be used here — their top layer isn't clipped by the frame, so a
			// box grown to "full screen" would spill outside the phone.) The grey box
			// grows from the tapped row's rect out to the full frame while the content
			// fades in, so the non-uniform scale never shows on the header/cards.
			if (isDesktopFrame() && !prefersReducedMotion()) {
				feedEl.classList.add('feed-morph');   // content starts hidden
				setFlipToRow(feedEl, device, rowEl);  // box starts on the row
				feedEl.style.willChange = 'transform';
				void feedEl.offsetWidth;               // commit the start state
				feedEl.style.transition =
					'transform var(--dur-expand) var(--ease-out), ' +
					'border-radius var(--dur-expand) var(--ease-out)';
				feedEl.style.transform = 'translate(0px,0px) scale(1,1)';
				feedEl.style.borderRadius = '0px';
				feedEl.classList.remove('feed-morph'); // content fades in
				var onEnd = function (e) {
					if (e.target !== feedEl || e.propertyName !== 'transform') return;
					feedEl.removeEventListener('transitionend', onEnd);
					feedEl.style.transition = '';
					feedEl.style.transform = '';
					feedEl.style.transformOrigin = '';
					feedEl.style.borderRadius = '';
					feedEl.style.willChange = '';
				};
				feedEl.addEventListener('transitionend', onEnd);
				feedState.openEnd = onEnd; // so an interrupting close can detach it
			}
			afterOpen();
		}
	}

	// Clears the shared-element names from whichever elements currently hold them,
	// so the next transition starts from a clean slate.
	function clearFeedVT() {
		if (!feedState) return;
		[feedState.rowEl, feedState.rowEl && feedState.rowEl.querySelector('.q-title'),
			feedState.feedEl, feedState.feedEl && feedState.feedEl.querySelector('.feed-title')]
			.forEach(function (el) { if (el) el.style.viewTransitionName = ''; });
	}

	// Immediate, animation-free teardown. Normal UX can't reach this (a feed's
	// only exits — Back / Escape — already run closeFeed), but a route change while
	// a feed is somehow open would otherwise strand feedState pointing at a removed
	// node, and the next openFeed would bail on its `if (feedState) return` guard.
	// Called from render() as a belt-and-braces reset.
	function forceCloseFeed() {
		if (!feedState) return;
		var fs = feedState;
		if (fs.keyHandler) document.removeEventListener('keydown', fs.keyHandler);
		if (fs.openEnd) fs.feedEl.removeEventListener('transitionend', fs.openEnd);
		clearFeedVT();
		if (fs.feedEl && fs.feedEl.parentNode) fs.feedEl.parentNode.removeChild(fs.feedEl);
		if (switcherEl) switcherEl.classList.remove('is-hidden');
		document.documentElement.classList.remove('feed-open');
		feedState = null;
	}

	function closeFeed() {
		if (!feedState || feedState.closing) return;
		feedState.closing = true;
		var fs = feedState;
		if (fs.keyHandler) document.removeEventListener('keydown', fs.keyHandler);
		// If the desktop open morph is still running, detach its cleanup so it can't
		// fire on the close transition and wipe the transform mid-collapse.
		if (fs.openEnd) { fs.feedEl.removeEventListener('transitionend', fs.openEnd); fs.openEnd = null; }

		function unmount() {
			if (fs.feedEl.parentNode) fs.feedEl.parentNode.removeChild(fs.feedEl);
			if (switcherEl) switcherEl.classList.remove('is-hidden');
			document.documentElement.classList.remove('feed-open');
		}
		function done() {
			if (fs.rowEl && fs.rowEl.focus) fs.rowEl.focus();
			feedState = null;
		}

		if (!isDesktopFrame() && typeof document.startViewTransition === 'function') {
			document.documentElement.style.setProperty('--vt-dur', 'var(--dur-collapse)');
			// Old state: the feed carries the names (row has none).
			setVTName(fs.feedEl, 'portal-hero');
			setVTName(fs.feedEl.querySelector('.feed-title'), 'portal-title');
			var t = document.startViewTransition(function () {
				unmount(); // removes the feed, so its names leave with it
				setVTName(fs.rowEl, 'portal-hero');
				setVTName(fs.rowEl.querySelector('.q-title'), 'portal-title');
			});
			t.finished.then(function () {
				setVTName(fs.rowEl, '');
				setVTName(fs.rowEl.querySelector('.q-title'), '');
				done();
			}, function () {
				setVTName(fs.rowEl, '');
				setVTName(fs.rowEl.querySelector('.q-title'), '');
				done();
			});
		} else if (isDesktopFrame() && !prefersReducedMotion()) {
			// Reverse FLIP: shrink the box back onto the row while the content fades
			// out, then unmount once the transform settles.
			fs.feedEl.style.willChange = 'transform';
			fs.feedEl.style.transition =
				'transform var(--dur-collapse) var(--ease-out), ' +
				'border-radius var(--dur-collapse) var(--ease-out)';
			fs.feedEl.classList.add('feed-morph'); // content fades out
			void fs.feedEl.offsetWidth;             // commit the current (identity) state
			setFlipToRow(fs.feedEl, fs.device, fs.rowEl); // animate down to the row rect
			var onEnd = function (e) {
				if (e.target !== fs.feedEl || e.propertyName !== 'transform') return;
				fs.feedEl.removeEventListener('transitionend', onEnd);
				unmount();
				done();
			};
			fs.feedEl.addEventListener('transitionend', onEnd);
		} else {
			unmount();
			done();
		}
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
			'<header class="pattern-header">' +
			'<a class="back-link" href="#/">' +
			'<span class="back-btn">' + icon('chevron-left') + '</span>' +
			'<span class="back-label">Ways in</span>' +
			'</a>' +
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

		syncSwitcher(app, id);
	}

	function render() {
		var app = document.getElementById('app');
		var hash = location.hash.replace(/^#\/?/, '');

		// A Portal feed can only be open on the Portal route, and its own exits
		// close it — but if we're navigating for any other reason, tear it down
		// synchronously so feedState never outlives its DOM.
		forceCloseFeed();

		// (No per-pattern teardown needed here. Portal used to own a rAF loop
		// that had to be stopped on every route change; the static Portal has
		// no loop, no listeners and no state, so there is nothing to clean up.
		// The scroll-driven version that did need it lives in portal-scroll/.)

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

		if (!hash || !CONTENT.patterns[hash]) {
			renderMenu(shell);
			// The switcher doesn't belong on the menu. Removing it means the next
			// arrival on a pattern is a fresh mount, which is exactly right: no
			// slide coming from the menu, slide only between patterns.
			unmountSwitcher();
			return;
		}
		renderPatternView(shell, app, hash);
	}

	window.addEventListener('hashchange', render);

	// Segment offsets move with the viewport (the desktop track centres, the phone
	// track's width changes), and nothing else re-renders on resize — without this
	// the indicator would sit under the wrong segment after a rotate or a window
	// drag. Snaps rather than slides, so it doesn't chase a drag-resize.
	window.addEventListener('resize', function () {
		if (switcherEl && switcherEl.parentNode) positionThumb(switcherEl, false);
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

	// ---- Stacking Card rest state (composed into the same transform as the lag) ----
	// The stack fully unstacks over this fraction of the first card's natural
	// pitch, so the cards have spread into their slots a touch before the row
	// snaps to the second card. Tunable: 0 = fully stacked, 1 = fully open.
	var STACK_UNSTACK_FRAC = 0.8;
	// Rest-state depth, matching the old deck exactly (Figma 199:5357): each card
	// behind the front peeks right + down and scales down a step. Depth reads via
	// shadow (toggled in CSS by `.is-stacked`), not opacity — the cards share a
	// near-white fill, so fading them would erase the stack.
	var STACK_PEEK_X = 16;    // px per depth step, to the right
	var STACK_PEEK_Y = 6;     // px per depth step, down
	var STACK_SCALE = 0.035;  // scale reduction per depth step

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

		var settled = Math.abs(row._lagVel) < 1 && Math.abs(dx) < 0.5;
		writeTransforms(row, row._lagCards, settled);
		row._lagSettled = settled;
	}

	// Writes ONE transform per card, composing the velocity lag with — for a
	// Stacking Card row — the scroll-driven stack collapse. Both effects target
	// the same `.card`, so they MUST be written together here rather than by two
	// handlers fighting over `style.transform`. Order matters: the lag translate
	// is written to the LEFT of the stack translate/scale so it stays in unscaled
	// px (a point is transformed right-to-left).
	function writeTransforms(row, cards, settled) {
		var isStack = row._isStack;
		var factor = 0, gaps = null;
		if (isStack) {
			// progress 0 at the start (stacked) -> 1 once unstacked. factor is its
			// complement so it can scale every rest-state offset toward zero.
			var progress = Math.min(1, Math.max(0, row.scrollLeft / row._stackDist));
			factor = 1 - progress;
			gaps = row._stackGap;
			// Shadow is a one-shot CSS toggle at the threshold, not a per-frame
			// write — it fades via a CSS transition so the scrub stays cheap.
			if (factor > 0.001) row.classList.add('is-stacked');
			else row.classList.remove('is-stacked');
		}
		for (var i = 0; i < cards.length; i++) {
			// Index from the LEADING edge in the direction of travel, not a fixed
			// end — otherwise travel one way spreads the cards (correct) and the
			// other way compresses them (18px of lag against a 12px gutter would
			// overlap). This flip is a discontinuity in `i`, but it's multiplied by
			// vel, and reversing direction means passing through vel≈0 first, so
			// the jump lands where the multiplier is nil.
			var idx = row._lagVel >= 0 ? i : (cards.length - 1 - i);
			var lag = settled ? 0 : Math.max(-LAG_CAP, Math.min(LAG_CAP, row._lagVel * LAG_PER_CARD * idx));
			if (isStack && factor > 0) {
				// Cancel the card's natural pitch to pull it back onto the front
				// card, then add the deck's peek/scale — all scaled by `factor` so
				// it relaxes to the natural row slot as the row scrolls open.
				var x = factor * (i * STACK_PEEK_X - (gaps[i] || 0));
				var y = factor * (i * STACK_PEEK_Y);
				var s = 1 - factor * (i * STACK_SCALE);
				cards[i].style.transform =
					'translateX(' + lag + 'px) translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
			} else {
				cards[i].style.transform = lag ? 'translateX(' + lag + 'px)' : '';
			}
		}
	}

	// Mount-time setup for a Stacking Card row: cache each card's natural x-offset
	// (the pitch the stack transform has to cancel), stack the front card on top,
	// and paint the resting stacked state immediately. Skipped under reduced
	// motion — the shared scroll listener is disabled there, so a stacked row
	// could never unstack; it renders as a plain carousel row instead.
	function initStackRow(row) {
		if (!row || prefersReducedMotion()) return;
		row._isStack = true;
		var cards = row.querySelectorAll(':scope > .card');
		// Pre-seed the same fields onCardsRowScroll would lazily set, so its
		// `_lagCards == null` guard is already satisfied and dx isn't NaN on the
		// first scroll event.
		row._lagCards = cards;
		row._lagVel = 0;
		row._lagPrevScroll = row.scrollLeft;
		row._lagLastT = null;
		for (var i = 0; i < cards.length; i++) {
			cards[i].style.zIndex = String(cards.length - i); // front card on top
		}
		measureStackRow(row);
		writeTransforms(row, cards, true);
		enableDragScroll(row);
	}

	// Drag-to-scroll for mouse/pen. Touch is deliberately left to NATIVE scrolling
	// (a finger swipe already scrubs the row and the browser owns momentum/snap);
	// a plain mouse has no way to scroll a hidden-scrollbar row, so without this a
	// desktop drag looked like "nothing happens". While dragging, scroll-snap is
	// switched off — `scroll-snap-type: x mandatory` clamps every programmatic
	// scrollLeft to the nearest snap point instantly, which would make the scrub
	// jump between cards instead of gliding. On release we ease to the nearest
	// card ourselves, then restore native snap. The scrollLeft writes here feed
	// the same scroll pipeline as a real swipe, so the unstack + velocity lag play
	// exactly as they do natively.
	function enableDragScroll(row) {
		var down = false, startX = 0, startScroll = 0;
		row.addEventListener('pointerdown', function (e) {
			if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
			down = true;
			row._dragging = true;
			if (row._settleRAF) { cancelAnimationFrame(row._settleRAF); row._settleRAF = null; }
			startX = e.clientX;
			startScroll = row.scrollLeft;
			row.style.scrollSnapType = 'none';
			row.classList.add('dragging');
			try { row.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
			e.preventDefault();
		});
		row.addEventListener('pointermove', function (e) {
			if (!down) return;
			row.scrollLeft = startScroll - (e.clientX - startX);
		});
		function release() {
			if (!down) return;
			down = false;
			row._dragging = false;
			row.classList.remove('dragging');
			settleSnap(row);
		}
		row.addEventListener('pointerup', release);
		row.addEventListener('pointercancel', release);
	}

	// Ease scrollLeft to the nearest card start (the stack gaps ARE the snap
	// points: 0, pitch, 2*pitch), then hand control back to native scroll-snap.
	// A new drag mid-settle sets `_dragging` and this bails, so the two never
	// write scrollLeft in the same frame.
	function settleSnap(row) {
		var gaps = row._stackGap || [0];
		var max = row.scrollWidth - row.clientWidth;
		var sl = row.scrollLeft;
		var target = gaps.reduce(function (best, g) {
			return Math.abs(g - sl) < Math.abs(best - sl) ? g : best;
		}, gaps[0]);
		target = Math.max(0, Math.min(max, target));
		var start = sl, dist = target - start, t0 = performance.now(), dur = 260;
		if (Math.abs(dist) < 0.5) { row.style.scrollSnapType = ''; return; }
		function step(now) {
			if (row._dragging) return; // a fresh drag took over
			var p = Math.min(1, (now - t0) / dur);
			var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
			row.scrollLeft = start + dist * eased;
			if (p < 1) {
				row._settleRAF = requestAnimationFrame(step);
			} else {
				row._settleRAF = null;
				row.style.scrollSnapType = ''; // native snap resumes
			}
		}
		row._settleRAF = requestAnimationFrame(step);
	}

	// Cache each card's natural x-offset (the pitch the stack transform cancels)
	// and the scroll distance the unstack spans. offsetLeft is a layout position,
	// unaffected by our transforms, so this is stable UNTIL the row is re-laid-out
	// at a new width — hence the resize handler below re-runs it. Reading offsetLeft
	// forces a reflow, so this is done at mount and on resize only, never per frame.
	function measureStackRow(row) {
		var cards = row._lagCards;
		var base = cards.length ? cards[0].offsetLeft : 0;
		row._stackGap = [];
		for (var i = 0; i < cards.length; i++) {
			row._stackGap.push(cards[i].offsetLeft - base);
		}
		// Unstack distance from the measured first-card pitch, never zero.
		row._stackDist = (row._stackGap[1] || 300) * STACK_UNSTACK_FRAC || 1;
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

		// A Stacking Card row's cached pitch goes stale if the row is re-laid-out
		// at a new width (device rotation, window resize, desktop/phone crossover).
		// Re-measure and repaint the rest state for every live stack row, coalesced
		// into one rAF so a resize drag doesn't reflow per event.
		var resizeRAF = null;
		window.addEventListener('resize', function () {
			if (resizeRAF != null) return;
			resizeRAF = requestAnimationFrame(function () {
				resizeRAF = null;
				var rows = document.querySelectorAll('.cards-row--stack');
				for (var i = 0; i < rows.length; i++) {
					var row = rows[i];
					if (!row._isStack) continue;
					measureStackRow(row);
					writeTransforms(row, row._lagCards, true);
				}
			});
		});
	}

	function prefersReducedMotion() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	render();
})();
