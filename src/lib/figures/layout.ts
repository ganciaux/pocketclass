import type { Figure } from '#lib/schemas/figure.ts';
import { splitNames } from './names.ts';

/**
 * A figure ready to draw in SVG: the coordinates of the JSON (y going up, any unit) become
 * pixels (y going down) with a margin for the names. Point names sit outside the figure (away
 * from its centre), length labels beside the middle of their segment, on the outer side.
 * Pure module (unit-tested); `<FigureView>` draws it.
 */

/** Pixels per unit of the JSON, and around the figure. */
const SCALE = 40;
const MARGIN = 28;
/** Distance of a point's name from the point, of a length label from its segment. */
const NAME_GAP = 15;
const LABEL_GAP = 13;
/** Side of the little square marking a right angle. */
const SQUARE = 10;

export interface FigureLayout {
	/** SVG `viewBox`: everything drawn, names and labels included, with a small margin. */
	viewBox: string;
	width: number;
	height: number;
	points: { name: string; x: number; y: number; nameX: number; nameY: number }[];
	segments: { x1: number; y1: number; x2: number; y2: number }[];
	/** SVG path of each right-angle square. */
	rightAngles: string[];
	labels: { text: string; x: number; y: number; anchor: 'start' | 'middle' | 'end' }[];
}

/** Rough width of a label in pixels (12 px bold text), to keep it inside the frame. */
const textWidth = (text: string) => text.length * 7.5;

type Vec = [number, number];
const unit = ([x, y]: Vec): Vec => {
	const length = Math.hypot(x, y) || 1;
	return [x / length, y / length];
};
const round = (n: number) => Math.round(n * 10) / 10;

export function layoutFigure(figure: Figure): FigureLayout {
	const entries = Object.entries(figure.points);
	const xs = entries.map(([, [x]]) => x);
	const ys = entries.map(([, [, y]]) => y);
	const [minX, maxX, minY, maxY] = [
		Math.min(...xs),
		Math.max(...xs),
		Math.min(...ys),
		Math.max(...ys)
	];
	// JSON (y up) → pixels (y down), the figure's top-left corner at the margin.
	const px = (x: number) => MARGIN + (x - minX) * SCALE;
	const py = (y: number) => MARGIN + (maxY - y) * SCALE;
	const at = (name: string): Vec => {
		const [x, y] = figure.points[name];
		return [px(x), py(y)];
	};
	const centre: Vec = [px((minX + maxX) / 2), py((minY + maxY) / 2)];
	const awayFromCentre = ([x, y]: Vec): Vec => {
		const d = unit([x - centre[0], y - centre[1]]);
		// The centre itself (a single point there): put the name above.
		return d[0] === 0 && d[1] === 0 ? [0, -1] : d;
	};

	const points = entries.map(([name]) => {
		const [x, y] = at(name);
		const [dx, dy] = awayFromCentre([x, y]);
		return {
			name,
			x,
			y,
			nameX: round(x + dx * NAME_GAP),
			// Text is drawn from its baseline: nudge it down by a third of its height.
			nameY: round(y + dy * NAME_GAP + 4)
		};
	});

	const pairOf = (text: string) => splitNames(text) as [string, string];

	const segments = figure.segments.map((s) => {
		const [a, b] = pairOf(s).map(at);
		return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
	});

	const rightAngles = figure.rightAngles.map((angle) => {
		const [a, o, b] = (splitNames(angle) as string[]).map(at);
		const u = unit([a[0] - o[0], a[1] - o[1]]);
		const v = unit([b[0] - o[0], b[1] - o[1]]);
		const p1: Vec = [o[0] + u[0] * SQUARE, o[1] + u[1] * SQUARE];
		const p2: Vec = [p1[0] + v[0] * SQUARE, p1[1] + v[1] * SQUARE];
		const p3: Vec = [o[0] + v[0] * SQUARE, o[1] + v[1] * SQUARE];
		return `M${round(p1[0])} ${round(p1[1])}L${round(p2[0])} ${round(p2[1])}L${round(p3[0])} ${round(p3[1])}`;
	});

	const labels = figure.labels.map((label) => {
		const [a, b] = pairOf(label.on).map(at);
		const middle: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
		// Perpendicular to the segment, on the side away from the figure's centre.
		let normal = unit([-(b[1] - a[1]), b[0] - a[0]]);
		const outward = [middle[0] - centre[0], middle[1] - centre[1]];
		if (normal[0] * outward[0] + normal[1] * outward[1] < 0) normal = [-normal[0], -normal[1]];
		// A label left of its segment ends there, right of it starts there, else centred.
		const anchor: 'start' | 'middle' | 'end' =
			normal[0] < -0.5 ? 'end' : normal[0] > 0.5 ? 'start' : 'middle';
		return {
			text: label.text,
			x: round(middle[0] + normal[0] * LABEL_GAP),
			y: round(middle[1] + normal[1] * LABEL_GAP + 4),
			anchor
		};
	});

	// The frame: every point, name and label (text about 12 px high above its baseline).
	const boxes = [
		...points.flatMap((p) => [
			[p.x, p.y, p.x, p.y],
			[p.nameX - 8, p.nameY - 12, p.nameX + 8, p.nameY + 2]
		]),
		...labels.map((l) => {
			const w = textWidth(l.text);
			const left = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2;
			return [left, l.y - 12, left + w, l.y + 2];
		})
	];
	const PAD = 4;
	const left = Math.min(...boxes.map((b) => b[0])) - PAD;
	const top = Math.min(...boxes.map((b) => b[1])) - PAD;
	const width = round(Math.max(...boxes.map((b) => b[2])) + PAD - left);
	const height = round(Math.max(...boxes.map((b) => b[3])) + PAD - top);

	return {
		viewBox: `${round(left)} ${round(top)} ${width} ${height}`,
		width,
		height,
		points,
		segments,
		rightAngles,
		labels
	};
}
