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

	// 3 words, not 4: at 15px a 4-word label ate ~60% of a 390px strip, so barely
	// one and a half tabs fit. The questions all open with distinct subjects
	// ("How are schools", "What are teachers", "Where are districts"), so three
	// words is still enough to tell them apart.
	function shortLabel(question, maxWords) {
		maxWords = maxWords || 3;
		var words = question.replace(/\?$/, '').split(' ');
		if (words.length <= maxWords) return words.join(' ');
		return words.slice(0, maxWords).join(' ') + '…';
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
					escapeHTML(shortLabel(d.question)) +
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

	function renderPatternView(shell, app, id) {
		var pattern = PATTERNS.filter(function (p) { return p.id === id; })[0];

		shell.innerHTML =
			'<header class="pattern-header">' +
			'<a class="back-btn" href="#/" aria-label="All patterns">' +
			icon('chevron-left') +
			'</a>' +
			'<span class="topic-label">' + escapeHTML(CONTENT.topic) + '</span>' +
			'<span class="pattern-name">' + pattern.label + '</span>' +
			'</header>' +
			'<main class="pattern-main"></main>';

		// The switcher is a SIBLING of .app-shell, not a child. The desktop
		// device frame clips its shell with overflow, and the switcher has to
		// escape that to sit out on the field below the phone.
		var nav = document.createElement('nav');
		nav.className = 'switcher';
		nav.innerHTML =
			'<div class="switcher-scroll">' +
			PATTERNS.map(function (p) {
				return (
					'<a class="switcher-btn' + (p.id === id ? ' active' : '') +
					'" href="#/' + p.id + '">' + p.label + '</a>'
				);
			}).join('') +
			'</div>';
		app.appendChild(nav);

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
		// the frame rather than the experiment. It's also load-bearing on two
		// transforms that a cascade would fight: `translateX(-50%)` for centering
		// at phone width, and the offsetLeft/clientWidth measurements the
		// scroll-into-view block below depends on.
		var next = cascade([shell.querySelector('.pattern-header')], 0);
		cascade(main.querySelectorAll('.cascade-item'), next);

		// Keep the active pill in view when arriving by deep link — with 5
		// pills the last two are off-screen at phone width.
		var scroller = nav.querySelector('.switcher-scroll');
		var activePill = scroller.querySelector('.switcher-btn.active');
		if (activePill && scroller.scrollWidth > scroller.clientWidth) {
			scroller.scrollLeft = Math.max(
				0,
				activePill.offsetLeft -
					(scroller.clientWidth - activePill.offsetWidth) / 2
			);
		}
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

		app.innerHTML = '';
		app.appendChild(device);

		if (!hash || !CONTENT.patterns[hash]) {
			renderMenu(shell);
			return;
		}
		renderPatternView(shell, app, hash);
	}

	window.addEventListener('hashchange', render);
	render();
})();
