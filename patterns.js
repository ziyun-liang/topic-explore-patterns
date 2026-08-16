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
		{ id: 'swipe', label: 'Card Swipe' },
		{ id: 'portal', label: 'Portal' }
	];

	// Card counts per pattern, taken from the Figma sketch metadata
	// (qMKFOJCaalehqHh2j8CUCF, node 196:13252) rather than guessed:
	// Carousel/Tabs/Accordion show 2 side-by-side cards per open direction;
	// Swipe/Portal show a deck of 3.
	var CARD_COUNTS = { carousel: 2, tabs: 2, accordion: 2, swipe: 3, portal: 3 };

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
			'<path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'
	};

	function icon(name, size) {
		return (
			'<svg width="' + (size || 16) + '" height="' + (size || 16) + '" ' +
			'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
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

	function barsHTML(variant) {
		var w = BAR_WIDTHS[variant % BAR_WIDTHS.length];
		return (
			'<div class="ph-bar" style="width:' + w[0] + '"></div>' +
			'<div class="ph-bar" style="width:' + w[1] + '"></div>' +
			'<div class="ph-bar ph-bar--meta" style="width:' + w[2] + '"></div>'
		);
	}

	function imgWellHTML() {
		return '<div class="ph-img">' + icon('image', 28) + '</div>';
	}

	// Flat thumbnail skeleton — carousel / tabs / accordion. Content, so it sits
	// on white with no fill of its own (grey fill is reserved for tappables).
	function cardsRowHTML(count) {
		var html = '<div class="cards-row">';
		for (var i = 0; i < count; i++) {
			html += '<div class="card">' + imgWellHTML() + barsHTML(i) + '</div>';
		}
		html += '</div>';
		return html;
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
	function directionHTML(direction, cardCount, isCascadeUnit) {
		return (
			'<div class="direction' + (isCascadeUnit ? ' cascade-item' : '') + '">' +
			'<p class="q-title">' + escapeHTML(direction.question) + '</p>' +
			cardsRowHTML(cardCount) +
			'</div>'
		);
	}

	// ---------- Carousel: every direction open, stacked vertically ----------

	function renderCarousel(main, directions) {
		main.innerHTML = directions
			.map(function (d) { return directionHTML(d, CARD_COUNTS.carousel, true); })
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
			content.innerHTML = directionHTML(directions[active], CARD_COUNTS.tabs, false);
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
					'<div class="acc-body">' + cardsRowHTML(CARD_COUNTS.accordion) + '</div>' +
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

	function createDeck(count, withHint) {
		var deck = document.createElement('div');
		deck.className = 'deck';

		var cards = [];
		for (var i = 0; i < count; i++) {
			var c = document.createElement('div');
			c.className = 'deck-card ph-card';
			c.innerHTML = phCardInnerHTML(i);
			deck.appendChild(c);
			cards.push(c);
		}

		// Depth comes from offset + scale + the card's own shadow, NOT from
		// fading opacity: the cards share a fill that's barely off white, so
		// fading them made the stack disappear entirely rather than recede.
		function layout() {
			cards.forEach(function (el, idx) {
				el.style.zIndex = String(count - idx);
				el.style.opacity = '1';
				el.style.transform =
					'translateY(' + idx * 12 + 'px) scale(' + (1 - idx * 0.045) + ')';
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

			var deck = createDeck(CARD_COUNTS.swipe, i === 0);
			group.appendChild(deck.el);
			if (deck.extrasHTML) group.insertAdjacentHTML('beforeend', deck.extrasHTML);

			main.appendChild(group);
		});
	}

	// ---------- Portal: windowed peek, native horizontal scroll-snap ----------

	function renderPortal(main, directions) {
		main.innerHTML = directions
			.map(function (d) {
				var cards = '';
				for (var i = 0; i < CARD_COUNTS.portal; i++) {
					cards += '<div class="portal-card ph-card">' +
						phCardInnerHTML(i) + '</div>';
				}
				return (
					'<div class="portal-group cascade-item">' +
					'<p class="q-title">' + escapeHTML(d.question) + '</p>' +
					'<div class="portal-window"><div class="portal-strip">' + cards + '</div></div>' +
					'</div>'
				);
			})
			.join('');
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

	render();
})();
