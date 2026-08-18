// content.js
//
// The one file meant to be edited by hand. Everything else (patterns.js,
// styles.css) reads from window.CONTENT and doesn't care how many
// directions exist per pattern — so editing this file is safe.
//
// Cards themselves stay grey (no headline/image data here) per the low-fi
// decision: only the *question* text is real placeholder copy, because the
// question is the thing each interaction pattern is actually navigating.
// Counts per pattern were originally fixed to match the Figma sketch
// (qMKFOJCaalehqHh2j8CUCF, node 196:13252) — Carousel 3, Tabs 4,
// Accordion 5, Card Swipe 3, Portal 4 — so don't add/remove entries without
// checking patterns.js's per-pattern card-count assumptions too.
// Portal is now the one exception: it grew to 5 on 2026-08-16 once it was
// rebuilt into a vertical list (matching Accordion's own count), reusing
// Accordion's exact 5th question rather than inventing new copy —
// Lindsey's explicit call, confirmed against reference/Animation/
// PortCardAnimation.mp4, which showed all 5.
//
// TWO THINGS TO KNOW BEFORE EDITING A QUESTION:
//
//  1. Each question is REPEATED in every pattern that shows it — Q1 appears in
//     all five arrays below. Change a question and you must change every copy,
//     or the patterns quietly disagree with each other. (The arrays share the
//     same first-N ordering: Carousel/Swipe show Q1–Q3, Tabs Q1–Q4, Portal
//     and Accordion all five.)
//
//  2. The Tabs strip shows each question IN FULL as its pill label (it used to
//     truncate to the first three words). So question LENGTH now drives pill
//     width directly: a long question makes a pill wider than the 390px strip
//     itself. Check the tab strip after any copy change — this is the pattern's
//     real stress test, and it's the reason the copy here is real rather than
//     lorem.
//
// Use the typographic apostrophe (’) not the straight one ('): it's house
// style, and a straight apostrophe would terminate these single-quoted strings.

window.CONTENT = {
	// The mocked theme name. Renders as the title of every pattern screen —
	// all five say the same thing, on purpose (the pattern you're in is
	// identified by the switcher, not the header). Sentence case, matching
	// 'Ways in'. "A.I." with periods, matching the questions below and NYT
	// house style. (The menu eyebrow used to reuse this too, but was decoupled
	// into `menuEyebrow` below so the home page can name the exploration itself
	// while the pattern screens keep the editorial theme the questions are about.)
	topic: 'A.I. education impact',

	// The home page eyebrow (above 'Ways in'). Names the exploration itself,
	// separate from `topic`. Uppercased in CSS.
	menuEyebrow: 'Collections UX exploration',

	patterns: {
		carousel: {
			directions: [
				{ question: 'Are teachers worried about A.I.’s impact?' },
				{ question: 'How are young people feeling about A.I.?' },
				{ question: 'How can graduates prepare for the A.I. economy?' }
			]
		},

		tabs: {
			directions: [
				{ question: 'Are teachers worried about A.I.’s impact?' },
				{ question: 'How are young people feeling about A.I.?' },
				{ question: 'How can graduates prepare for the A.I. economy?' },
				{ question: 'How do A.I. companies make money from the education sector?' }
			]
		},

		accordion: {
			directions: [
				{ question: 'Are teachers worried about A.I.’s impact?' },
				{ question: 'How are young people feeling about A.I.?' },
				{ question: 'How can graduates prepare for the A.I. economy?' },
				{ question: 'How do A.I. companies make money from the education sector?' },
				{ question: 'Is A.I. making us dumber?' }
			]
		},

		swipe: {
			directions: [
				{ question: 'Are teachers worried about A.I.’s impact?' },
				{ question: 'How are young people feeling about A.I.?' },
				{ question: 'How can graduates prepare for the A.I. economy?' }
			]
		},

		portal: {
			directions: [
				{ question: 'Are teachers worried about A.I.’s impact?' },
				{ question: 'How are young people feeling about A.I.?' },
				{ question: 'How can graduates prepare for the A.I. economy?' },
				{ question: 'How do A.I. companies make money from the education sector?' },
				{ question: 'Is A.I. making us dumber?' }
			]
		}
	}
};
