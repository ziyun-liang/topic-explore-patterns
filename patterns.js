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

	function shortLabel(question, maxWords) {
		maxWords = maxWords || 4;
		var words = question.replace(/\?$/, '').split(' ');
		if (words.length <= maxWords) return words.join(' ');
		return words.slice(0, maxWords).join(' ') + '…';
	}

	function cardsRowHTML(count) {
		var html = '<div class="cards-row">';
		for (var i = 0; i < count; i++) {
			html +=
				'<div class="card">' +
				'<div class="card-img"></div>' +
				'<div class="card-bar"></div>' +
				'<div class="card-bar short"></div>' +
				'<div class="card-bar date"></div>' +
				'</div>';
		}
		html += '</div>';
		return html;
	}

	function directionHTML(direction, cardCount) {
		return (
			'<div class="direction">' +
			'<p class="q-title">' + escapeHTML(direction.question) + '</p>' +
			cardsRowHTML(cardCount) +
			'</div>'
		);
	}

	// ---------- Carousel: every direction open, stacked vertically ----------

	function renderCarousel(main, directions) {
		main.innerHTML = directions
			.map(function (d) { return directionHTML(d, CARD_COUNTS.carousel); })
			.join('');
	}

	// ---------- Tabs: strip of labels, one active direction shown below ----------

	function renderTabs(main, directions) {
		var active = 0;

		var wrap = document.createElement('div');
		main.appendChild(wrap);

		function paintTabs() {
			var strip = '<div class="tab-strip">';
			directions.forEach(function (d, i) {
				strip +=
					'<button class="tab' + (i === active ? ' active' : '') + '" data-i="' + i + '">' +
					escapeHTML(shortLabel(d.question)) +
					'</button>';
			});
			strip += '</div>';
			return strip;
		}

		function paint() {
			wrap.innerHTML = paintTabs() + '<div class="tab-content">' +
				directionHTML(directions[active], CARD_COUNTS.tabs) + '</div>';
		}

		wrap.addEventListener('click', function (e) {
			var btn = e.target.closest('.tab');
			if (!btn) return;
			active = Number(btn.dataset.i);
			paint();
		});

		paint();
	}

	// ---------- Accordion: one open at a time ----------

	function renderAccordion(main, directions) {
		var openIndex = 0;

		var wrap = document.createElement('div');
		main.appendChild(wrap);

		function paint() {
			wrap.innerHTML = directions
				.map(function (d, i) {
					var isOpen = i === openIndex;
					return (
						'<div class="acc-item' + (isOpen ? ' open' : '') + '">' +
						'<button class="acc-header" data-i="' + i + '">' +
						'<span>' + escapeHTML(d.question) + '</span>' +
						'<span class="chevron">⌄</span>' +
						'</button>' +
						(isOpen
							? '<div class="acc-body">' + cardsRowHTML(CARD_COUNTS.accordion) + '</div>'
							: '') +
						'</div>'
					);
				})
				.join('');
		}

		wrap.addEventListener('click', function (e) {
			var btn = e.target.closest('.acc-header');
			if (!btn) return;
			var i = Number(btn.dataset.i);
			openIndex = openIndex === i ? -1 : i;
			paint();
		});

		paint();
	}

	// ---------- Card Swipe: drag-to-cycle deck per direction ----------

	function createDeck(count, withHint) {
		var deck = document.createElement('div');
		deck.className = 'deck';

		var cards = [];
		for (var i = 0; i < count; i++) {
			var c = document.createElement('div');
			c.className = 'deck-card';
			deck.appendChild(c);
			cards.push(c);
		}

		function layout() {
			cards.forEach(function (el, idx) {
				el.style.zIndex = String(count - idx);
				el.style.opacity = String(Math.max(1 - idx * 0.1, 0.6));
				el.style.transform = 'translateY(' + idx * 10 + 'px) scale(' + (1 - idx * 0.04) + ')';
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
		if (withHint) extras = '<p class="deck-hint">← drag to cycle →</p>';

		return { el: deck, extrasHTML: extras };
	}

	function renderSwipe(main, directions) {
		directions.forEach(function (d, i) {
			var group = document.createElement('div');
			group.className = 'swipe-group';
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
					cards += '<div class="portal-card"></div>';
				}
				return (
					'<div class="portal-group">' +
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
					'<span class="menu-item-arrow">→</span>' +
					'</a>'
				);
			}).join('') +
			'</div>';
	}

	function renderPatternView(shell, id) {
		var pattern = PATTERNS.filter(function (p) { return p.id === id; })[0];

		shell.innerHTML =
			'<header class="pattern-header">' +
			'<a class="back-btn" href="#/">‹ All patterns</a>' +
			'<span class="topic-label">' + escapeHTML(CONTENT.topic) + '</span>' +
			'<span class="pattern-name">' + pattern.label + '</span>' +
			'</header>' +
			'<main class="pattern-main"></main>' +
			'<nav class="switcher">' +
			PATTERNS.map(function (p) {
				return (
					'<a class="switcher-btn' + (p.id === id ? ' active' : '') + '" href="#/' + p.id + '">' +
					p.label +
					'</a>'
				);
			}).join('') +
			'</nav>';

		var main = shell.querySelector('.pattern-main');
		var directions = CONTENT.patterns[id].directions;
		RENDERERS[id](main, directions);
	}

	function render() {
		var app = document.getElementById('app');
		var hash = location.hash.replace(/^#\/?/, '');

		var shell = document.createElement('div');
		shell.className = 'app-shell';
		app.innerHTML = '';
		app.appendChild(shell);

		if (!hash || !CONTENT.patterns[hash]) {
			renderMenu(shell);
			return;
		}
		renderPatternView(shell, hash);
	}

	window.addEventListener('hashchange', render);
	render();
})();
