import type { Subject, SubjectIcon } from '#lib/data/types.ts';

/**
 * Subject icons: our own line drawings on a 24 × 24 grid (stroke 2, round caps), drawn in the
 * subject colour by `<SubjectBadge>`. Pure module (unit-tested).
 */

/** One stroke of an icon; `transform` for rotated shapes. */
export interface IconPath {
	d: string;
	transform?: string;
}

const circle = (cx: number, cy: number, r: number) =>
	`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ellipse = (rx: number, ry: number) =>
	`M${12 - rx} 12a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
const paths = (...d: string[]): IconPath[] => d.map((path) => ({ d: path }));

export const ICON_PATHS: Record<SubjectIcon, IconPath[]> = {
	calculator: paths(
		'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z',
		'M8 6h8v4H8z',
		'M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01'
	),
	pi: paths('M4 7h16', 'M8 7v12', 'M15 7v9a3 3 0 0 0 3 3'),
	book: paths(
		'M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z',
		'M12 6v15'
	),
	languages: paths('M3 4h11v8H8l-4 3v-3H3z', 'M17 9h4v8h-1v3l-3-3h-5v-2'),
	landmark: paths('M3 8l9-5 9 5z', 'M5 11v7M10 11v7M14 11v7M19 11v7', 'M3 21h18'),
	globe: paths(
		circle(12, 12, 10),
		'M2 12h20',
		'M12 2c3.5 3.5 3.5 16.5 0 20c-3.5-3.5-3.5-16.5 0-20'
	),
	flask: paths(
		'M9 3h6',
		'M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3',
		'M7 15h10'
	),
	atom: [
		{ d: circle(12, 12, 1) },
		{ d: ellipse(10, 4) },
		{ d: ellipse(10, 4), transform: 'rotate(60 12 12)' },
		{ d: ellipse(10, 4), transform: 'rotate(-60 12 12)' }
	],
	leaf: paths('M5 20C5 10 10 4 20 4c0 10-6 16-15 16z', 'M5 20l9-9'),
	laptop: paths('M5 5h14a1 1 0 0 1 1 1v9H4V6a1 1 0 0 1 1-1z', 'M2 19h20'),
	music: paths('M9 18V5l11-2v13', circle(6, 18, 3), circle(17, 16, 3)),
	palette: paths(
		'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 2-1 3-1a4 4 0 0 0 4-4c0-4.4-4-8-9-8z',
		'M7.5 11h.01M10 7h.01M15 7.5h.01'
	),
	dumbbell: paths('M6 7v10M3 9.5v5M18 7v10M21 9.5v5', 'M6 12h12'),
	star: paths('M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z')
};

/** Interface icons, same style (back link, lists, sheet page). */
export const UI_ICONS = {
	chevronLeft: paths('m15 18-6-6 6-6'),
	chevronRight: paths('m9 18 6-6-6-6'),
	check: paths('M20 6 9 17l-5-5'),
	x: paths('M18 6 6 18', 'm6 6 12 12'),
	play: paths('M7 4v16l13-8z'),
	bookmark: paths('M6 3h12v18l-6-4-6 4z'),
	/** Mind map: a centre and three branches. */
	map: paths(
		circle(12, 12, 3),
		'M9.5 10.5 5 7',
		'M14.5 10.5 19 7',
		'M12 15v4',
		circle(4, 6, 1.5),
		circle(20, 6, 1.5),
		circle(12, 20.5, 1.5)
	),
	message: paths('M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'),
	star: paths('M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z'),
	download: paths('M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'),
	upload: paths('M12 21V9', 'm7 14 5-5 5 5', 'M5 3h14'),
	pencil: paths('M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z', 'm15 5 4 4'),
	trash: paths('M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'),
	/** Open book: sheets seen. */
	book: paths(
		'M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z',
		'M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z'
	),
	/** Sad face, for the « Raté » stamp (no emoji in the UI). */
	sad: paths(circle(12, 12, 9), 'M9 9.5h.01', 'M15 9.5h.01', 'M8.5 16.5a5 5 0 0 1 7 0'),
	/** Clipboard with a tick: the assessment. */
	clipboard: paths(
		'M9 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3',
		'M9 3h6v3H9z',
		'm9 14 2 2 4-4'
	),
	lightbulb: paths(
		'M9 18h6',
		'M10 22h4',
		'M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z'
	),
	alert: paths(
		'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
		'M12 9v4',
		'M12 17h.01'
	)
} satisfies Record<string, IconPath[]>;

/** First keyword found in the (accent-free, lower-case) subject name. */
const SUGGESTIONS: [RegExp, SubjectIcon][] = [
	[/math/, 'calculator'],
	[/fran|lecture|ecriture|grammaire|litt/, 'book'],
	[/angl|espa|allem|ital|langue|latin|grec|lv[12]/, 'languages'],
	[/hist/, 'landmark'],
	[/geo/, 'globe'],
	[/phys|chim/, 'flask'],
	[/svt|bio|vie|nature|science/, 'leaf'],
	[/techn|info|numer|code|program/, 'laptop'],
	[/musi/, 'music'],
	[/art|dessin|plast/, 'palette'],
	[/eps|sport/, 'dumbbell']
];

/** Icon suggested for a subject name ("Mathématiques" → calculator); `star` when nothing fits. */
export function suggestIcon(name: string): SubjectIcon {
	const plain = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
	return SUGGESTIONS.find(([pattern]) => pattern.test(plain))?.[1] ?? 'star';
}

/** The icon shown for a subject: the chosen one, else the one suggested by its name. */
export const subjectIcon = (subject: Pick<Subject, 'name' | 'icon'>): SubjectIcon =>
	subject.icon ?? suggestIcon(subject.name);
