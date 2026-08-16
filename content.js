// content.js
//
// The one file meant to be edited by hand. Everything else (patterns.js,
// styles.css) reads from window.CONTENT and doesn't care how many
// directions exist per pattern — so editing this file is safe.
//
// Cards themselves stay grey (no headline/image data here) per the low-fi
// decision: only the *question* text is real placeholder copy, because the
// question is the thing each interaction pattern is actually navigating.
// Counts per pattern are fixed to match the Figma sketch
// (qMKFOJCaalehqHh2j8CUCF, node 196:13252) — Carousel 3, Tabs 4,
// Accordion 5, Card Swipe 3, Portal 4 — so don't add/remove entries without
// checking patterns.js's per-pattern card-count assumptions too.

window.CONTENT = {
	// The mocked theme name. Renders in two places: the menu's eyebrow, and the
	// title of every pattern screen — all five say the same thing, on purpose
	// (the pattern you're in is identified by the switcher, not the header).
	// Sentence case, matching 'Ways in'; the eyebrow uppercases it in CSS.
	topic: 'AI education impact',

	patterns: {
		carousel: {
			directions: [
				{ question: 'How are schools actually using AI in classrooms right now?' },
				{ question: 'What are teachers saying about AI-assisted grading and lesson planning?' },
				{ question: 'Where are districts drawing the line on AI in student work?' }
			]
		},

		tabs: {
			directions: [
				{ question: 'How are schools actually using AI in classrooms right now?' },
				{ question: 'What are teachers saying about AI-assisted grading and lesson planning?' },
				{ question: 'Where are districts drawing the line on AI in student work?' },
				{ question: 'What do parents want to know before their kid uses an AI tutor?' }
			]
		},

		accordion: {
			directions: [
				{ question: 'How are schools actually using AI in classrooms right now?' },
				{ question: 'What are teachers saying about AI-assisted grading and lesson planning?' },
				{ question: 'Where are districts drawing the line on AI in student work?' },
				{ question: 'What do parents want to know before their kid uses an AI tutor?' },
				{ question: 'How is AI changing what counts as cheating?' }
			]
		},

		swipe: {
			directions: [
				{ question: 'How are schools actually using AI in classrooms right now?' },
				{ question: 'What are teachers saying about AI-assisted grading and lesson planning?' },
				{ question: 'Where are districts drawing the line on AI in student work?' }
			]
		},

		portal: {
			directions: [
				{ question: 'How are schools actually using AI in classrooms right now?' },
				{ question: 'What are teachers saying about AI-assisted grading and lesson planning?' },
				{ question: 'Where are districts drawing the line on AI in student work?' },
				{ question: 'What do parents want to know before their kid uses an AI tutor?' }
			]
		}
	}
};
